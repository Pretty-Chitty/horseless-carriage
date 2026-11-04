import { Chit, DragTarget, Turn } from "@pretty-chitty/core";
import { Root } from "../chits/Root";
import { decide } from "../decide";
import { Player } from "../chits/Player";
import { FactoryTile } from "../chits/FactoryTile";
import { Niche } from "../chits/Niche";
import { MarketWindow, WindowTarget } from "../chits/MarketPieces";
import { RotateButton } from "../ButtonLibrary";
import { cars } from "../logText";
import { BOARD_SIZE, CarType, carTypeLabel, carTypes, NICHE, saleBonus } from "../consts";

type T = Turn<any, Player, Root>;

// Phase 5 — Sell, sell, sell! (RULES.md P5).
export async function executeSell(root: Root, turn: T): Promise<void> {
  const players = root.players.copy();
  const order = root.office.salesOrder(players); // P5.1
  const active = new Set(players);
  while (active.size > 0) {
    for (const player of order) {
      if (!active.has(player)) continue;
      if (!hasSaleOptions(player, root)) {
        active.delete(player); // P5.13: out of sales options for the rest of the phase
        continue;
      }
      await turn.createTurn([root, player], player, async (t) => {
        await sellTurn(player, root, t);
      });
    }
  }
  // P5.15: windows go home, sold cars return to stock; buyers and sparks stay.
  for (const w of root.market.windows.copy()) w.removeFromParent();
  for (const z of root.market.reach.copy()) if (z.hidden) z.hidden = false; // previews return with the windows
  for (const p of players)
    for (const m of p.factory.placedTiles())
      for (const car of m.soldCars.copy()) {
        car.parentFallback = m; // back into stock: it sinks into the mainline, not off the table
        car.removeFromParent();
      }
  turn.flush();
}

// The reach preview gives way to the real window once it is placed (developer request).
function hideReach(root: Root, win: MarketWindow): void {
  for (const z of root.market.reach.filter((x) => x.playerId === win.playerId && x.dealerIndex === win.dealerIndex)) z.hidden = true;
}

// ---------------------------------------------------------------- what a dealer can do
export function effectiveType(m: FactoryTile, root: Root): CarType {
  return root.variant === "intro" ? "car" : m.carType!; // V2
}
export function dealerMainlines(dealer: FactoryTile, player: Player): FactoryTile[] {
  return player.factory.adjacentPieces(dealer).filter((p): p is FactoryTile => p instanceof FactoryTile && p.kind === "mainline");
}
// P4.7 / P5.10: remaining capacity of a type through this dealer = unsold capacity of its
// adjacent mainlines of that type (each mainline's capacity is shared by every dealer on it).
export function remainingCapacity(dealer: FactoryTile, type: CarType, player: Player, root: Root): number {
  return dealerMainlines(dealer, player).filter((m) => effectiveType(m, root) === type).reduce((n, m) => n + Math.max(0, player.capacity.value - m.carsSold), 0);
}
export function sellableTypes(dealer: FactoryTile, niche: Niche, player: Player, root: Root): CarType[] {
  return carTypes.filter((t) => niche.buyersOf(t).length > 0 && remainingCapacity(dealer, t, player, root) > 0);
}
function sellingDealers(player: Player): FactoryTile[] {
  return player.factory.placedTiles().filter((d) => d.kind === "dealership" && d.publishedSize !== "none"); // P4.9, P5.3
}
export function windowOf(dealer: FactoryTile, root: Root): MarketWindow | undefined {
  return root.market.windows.find((w) => !w.staged && w.playerId === dealer.playerOwnerId && w.dealerIndex === dealer.dealerIndex);
}
// Niches this dealer could sell into right now: inside its placed window, with a buyer of a
// type it still has capacity for.
function sellableNiches(dealer: FactoryTile, player: Player, root: Root): Niche[] {
  const w = windowOf(dealer, root);
  if (!w) return [];
  return w.cells().filter((c) => root.market.inBounds(c.row, c.col)).map((c) => root.market.niche(c.row, c.col)).filter((n) => sellableTypes(dealer, n, player, root).length > 0);
}
// Sale options: a buyer this dealer could reach with its window (P5.13). Placing a window is
// not limited to these: any placement within the dealer's specs is allowed (P5.5–P5.7).
type Anchor = { row: number; col: number };
function usefulAnchors(dealer: FactoryTile, vertical: boolean, player: Player, root: Root): Anchor[] {
  return legalAnchors(dealer, vertical, root).filter((a) =>
    root.market.windowCells(a.row, a.col, dealer.publishedSize as "S" | "M" | "L", vertical).some((c) => root.market.inBounds(c.row, c.col) && sellableTypes(dealer, root.market.niche(c.row, c.col), player, root).length > 0),
  );
}
function legalAnchors(dealer: FactoryTile, vertical: boolean, root: Root): Anchor[] {
  if (dealer.publishedSize === "none") return [];
  return root.market.validAnchors(dealer.publishedSpecs, dealer.publishedSize as "S" | "M" | "L", vertical);
}
function hasSaleOptions(player: Player, root: Root): boolean {
  return sellingDealers(player).some((d) => (windowOf(d, root) ? sellableNiches(d, player, root).length > 0 : usefulAnchors(d, false, player, root).length > 0 || (d.publishedSize === "S" && usefulAnchors(d, true, player, root).length > 0)));
}

// How many placed frames a window dropped here lies across (it rests on the highest of them).
function stackUnder(win: MarketWindow, market: Root["market"]): number {
  const cells = win.cells();
  const under = market.windows.filter((o) => o !== win && !o.staged && cells.some((c) => o.covers(c.row, c.col)));
  return under.length ? Math.max(...under.map((o) => o.stack)) + 1 : 0;
}

// ---------------------------------------------------------------- the turn
async function sellTurn(player: Player, root: Root, turn: T): Promise<void> {
  const market = root.market;
  const dealers = sellingDealers(player);
  const placed = dealers.filter((d) => windowOf(d, root) && sellableNiches(d, player, root).length > 0);
  const unplaced = dealers.filter((d) => !windowOf(d, root) && (legalAnchors(d, false, root).length > 0 || (d.publishedSize === "S" && legalAnchors(d, true, root).length > 0)));

  // The player's unplaced windows wait above the board at their real size (developer
  // decision): drag one onto the board, or click a niche inside a window already placed.
  const staged = new Map<MarketWindow, FactoryTile>();
  let stageX = -(BOARD_SIZE * NICHE) / 2;
  for (const d of unplaced) {
    const w = new MarketWindow().set((x) => {
      x.playerColor = player.playerColor; x.playerId = player.playerId; x.dealerIndex = d.dealerIndex!; x.size = d.publishedSize as "S" | "M" | "L"; x.seat = root.players.copy().indexOf(player); x.staged = true; x.stageX = stageX; x.parentFallback = d; // the window comes out of its dealership, not in from the table edge
    });
    market.windows.add(w);
    staged.set(w, d);
    stageX += w.footprint().w * NICHE + 0.6;
  }
  const clearStaged = () => { for (const w of staged.keys()) if (w.staged) w.removeFromParent(); };

  const nicheToDealers = new Map<Niche, FactoryTile[]>();
  for (const d of placed) for (const n of sellableNiches(d, player, root)) nicheToDealers.set(n, [...(nicheToDealers.get(n) ?? []), d]);

  let chosenNiche: Niche | undefined;
  let dropped: MarketWindow | undefined;
  turn.markZipStartPoint();
  while (!chosenNiche && !dropped) {
    for (const n of nicheToDealers.keys()) n.highlighted = true;
    const drags = [...staged.entries()].filter(([w]) => w.staged).map(([w, d]) => {
      const fp = w.footprint();
      const targets = legalAnchors(d, w.vertical, root).map((a) => market.windowTarget(a.row, a.col, fp.w, fp.h));
      return targets.length
        ? Chit.dragPick(w, [DragTarget.from(targets, (win: MarketWindow, t: WindowTarget) => { win.row = t.row; win.col = t.col; win.staged = false; win.stack = stackUnder(win, market); dropped = win; hideReach(root, win); })]).focus([market, player]).ai("sell.window")
        : undefined;
    });
    const smallStaged = [...staged.keys()].filter((w) => w.staged && w.size === "S");
    await decide(turn, player, "sell cars", "Drag one of your market windows onto the board, or click a highlighted niche inside a window you have already placed. A window must sit where no niche inside it asks for more than the dealer's specs; you must then sell every buyer there you have capacity for (trucks +$1, sports cars +$2).", [
      nicheToDealers.size > 0 && Chit.pick([...nicheToDealers.keys()], (n) => { chosenNiche = n; }).focus([market, player]).ai("sell.niche"),
      ...drags,
      smallStaged.length > 0 && new RotateButton(() => { for (const w of smallStaged) w.vertical = !w.vertical; }).pick().message("turn the small window").ai("sell.rotate"),
    ]);
    for (const n of nicheToDealers.keys()) n.highlighted = false;
    turn.flush();
    turn.zip();
  }

  if (chosenNiche) {
    clearStaged();
    const ds = nicheToDealers.get(chosenNiche)!;
    let chosenDealer = ds[0];
    if (ds.length > 1) {
      // P5.11: the niche lies inside two of this player's windows; they choose which sells.
      await decide(turn, player, [Chit.pick(ds, (d) => { chosenDealer = d; }).message("choose which dealer sells there").context(chosenNiche).focus(player).ai("sell.dealer")]);
    }
    await sellInNiche(chosenDealer, chosenNiche, player, root, turn);
    return;
  }

  // A window was placed (P5.4–P5.7); sell from it in the same turn (P5.8).
  const dealer = staged.get(dropped!)!;
  clearStaged();
  const inside = sellableNiches(dealer, player, root);
  turn.log(`${player.logKey} places ${dealer.label()}'s market window${inside.length ? "" : ", with no buyer inside it can sell to"}`);
  turn.flush();
  if (inside.length === 0) return;
  let target: Niche | undefined = inside.length === 1 ? inside[0] : undefined;
  if (!target) {
    for (const n of inside) n.highlighted = true;
    await decide(turn, player, [Chit.pick(inside, (n) => { target = n; }).message("sell into a niche inside the new window").context(dealer).focus(market).ai("sell.niche")]);
    for (const n of inside) n.highlighted = false;
  }
  await sellInNiche(dealer, target!, player, root, turn);
}

// P5.8–P5.12: sell every buyer of every type this dealer can supply in the niche, as many as
// capacity allows, scoring the segment price plus the type bonus for each.
async function sellInNiche(dealer: FactoryTile, niche: Niche, player: Player, root: Root, turn: T): Promise<void> {
  const price = root.market.segmentPrice(niche.segment()) ?? 0;
  const sold: string[] = [];
  const unbuilt: string[] = []; // buyers this dealer has no mainline for: they stay (P5.10)
  let unbuiltN = 0;
  let earned = 0;
  for (const type of carTypes) {
    const buyers = niche.buyersOf(type);
    if (buyers.length === 0) continue;
    const mains = dealerMainlines(dealer, player).filter((m) => effectiveType(m, root) === type);
    if (mains.length === 0) { unbuilt.push(cars(buyers.length, type)); unbuiltN += buyers.length; }
    let cap = mains.reduce((n, m) => n + Math.max(0, player.capacity.value - m.carsSold), 0);
    if (cap === 0) continue;
    let n = 0;
    for (const buyer of buyers) {
      if (cap === 0) break;
      const m = mains.find((x) => x.carsSold < player.capacity.value)!;
      m.soldCars.add(buyer); // P5.10: the sold car goes onto the mainline that built it
      cap -= 1;
      earned += price + saleBonus(type); // P5.9
      n += 1;
    }
    if (n) sold.push(cars(n, type));
  }
  player.wealth.value += earned;
  const left = unbuiltN ? `; ${unbuilt.join(" and ")} there stay${unbuiltN === 1 ? "s" : ""}, as ${dealer.label()} has no mainline for ${unbuiltN === 1 ? "it" : "them"}` : "";
  turn.log(`${player.logKey} sells ${sold.join(" and ")} from ${dealer.label()} in segment ${niche.segment()} for $${earned}${left}`);
  turn.flush();
}
