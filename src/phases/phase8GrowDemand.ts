import { Chit, Turn } from "@pretty-chitty/core";
import { Root } from "../chits/Root";
import { decide } from "../decide";
import { Player } from "../chits/Player";
import { Card } from "../chits/Card";
import { HandButton } from "../ButtonLibrary";
import { Car, Spark } from "../chits/Niche";
import { CarType, carTypes, Quadrant, QUADRANTS, SPARK_BUYER_CAP } from "../consts";
import { byQuadrant, carCounts } from "../logText";

type T = Turn<any, Player, Root>;

// "3 :car: sparks": a card's sparks counted by type.
function sparkWords(sparks: { type: CarType; count: number }[]): string {
  const n: Partial<Record<CarType, number>> = {};
  for (const sp of sparks) n[sp.type] = (n[sp.type] ?? 0) + sp.count;
  const total = sparks.reduce((k, sp) => k + sp.count, 0);
  return `${carCounts(n)} spark${total === 1 ? "" : "s"}`;
}

// Phase 8 — Grow demand (RULES.md P8).
export async function executeGrowDemand(root: Root, turn: T): Promise<void> {
  const market = root.market;
  const players = root.players.copy();

  // P8.1–P8.4: in engineering order each player plays one card face down next to a quadrant.
  for (const player of root.engineeringOrder()) {
    const playable = player.hand.cards.filter((c) => c.spec().year <= player.factory.expansionsPlaced); // P8.3
    if (playable.length === 0) {
      turn.log(`${player.logKey} has no card they may play yet`); // Q15
      continue;
    }
    await turn.createTurn([root, player], player, async (t) => {
      let card: Card | undefined;
      await decide(t, player, [
        Chit.pick(playable, (c) => { card = c; })
          .message("play a market growth card")
          .help("A card may be played once you have placed at least as many floor expansions as its year number. Its sparks will seed buyers in the quadrant you choose.")
          .focus(player)
          .toggleButton(new HandButton())
          .ai("grow.card"),
      ]);
      for (const q of market.quadrantTargets.copy()) q.active = true;
      await decide(t, player, [
        Chit.pick(market.quadrantTargets, (q) => {
          card!.quadrant = q.quadrant;
          card!.revealed = false;
          market.played.add(card!);
        })
          .message("choose a quadrant for the card")
          .help("The card's 4×4 grid maps straight onto the quadrant: its top-left cell is the quadrant's top-left niche.")
          .context(card)
          .focus(market)
          .ai("grow.quadrant"),
      ]);
      for (const q of market.quadrantTargets.copy()) q.active = false;
      t.log(`${player.logKey} plays a card face down on quadrant ${["I", "II", "III", "IV"][card!.quadrant - 1]}`);
      t.flush();
    });
  }

  // P8.5, P8.6: quadrant by quadrant, reveal, place sparks, punch the clock, discard.
  for (const q of [1, 2, 3, 4] as Quadrant[]) {
    const cards = market.played.filter((c) => c.quadrant === q);
    if (cards.length === 0) continue;
    const origin = QUADRANTS.find((s) => s.quadrant === q)!;
    for (const card of cards) {
      card.revealed = true;
      turn.flush();
      const s = card.spec();
      for (const sp of s.sparks) {
        const niche = market.niche(origin.row0 + sp.row - 1, origin.col0 + sp.col - 1);
        // C32: a marker shows one or two sparks; top up a single, then add more markers.
        let left = sp.count;
        const single = niche.sparks.find((x) => x.carType === sp.type && x.count === 1);
        if (single && left > 0) { single.count = 2; left -= 1; }
        while (left > 0) {
          const n = Math.min(2, left) as 1 | 2;
          niche.sparks.add(new Spark().set((x) => { x.carType = sp.type; x.count = n; x.parentFallback = niche; }));
          left -= n;
        }
      }
      if (s.clocks) root.clock.punch(s.clocks);
      const owner = players.find((p) => p.playerId === card.ownerId);
      turn.log(`${owner?.logKey ?? "A player"}'s card adds ${s.sparks.length ? sparkWords(s.sparks) : "no sparks"} to quadrant ${["I", "II", "III", "IV"][q - 1]}${s.clocks ? ` and moves the timecard down ${s.clocks}` : ""}`);
      turn.flush();
      card.removeFromParent(); // P8.4: never returns
    }
  }

  // P8.7: every spark generates a buyer, up to the cap per spark.
  let generated = 0;
  const born: Partial<Record<CarType, number>> = {};
  for (const niche of market.niches.copy()) {
    for (const type of carTypes) {
      const sparks = niche.sparksOf(type);
      if (!sparks) continue;
      const add = Math.max(0, Math.min(sparks, SPARK_BUYER_CAP * sparks - niche.buyersOf(type).length));
      for (let i = 0; i < add; i++) niche.buyers.add(new Car().set((c) => { c.carType = type; c.parentFallback = niche; })); // rises out of its niche
      generated += add;
      born[type] = (born[type] ?? 0) + add;
    }
  }
  if (generated) turn.log(`Sparks bring ${carCounts(born)} new buyer${generated === 1 ? "" : "s"} to the market`);
  turn.flush();

  // P8.8, P8.9: spontaneous buyers from the neutral deck.
  await drawNeutralBuyers(root, turn, [2, 3, ...Array<Quadrant>(Math.max(0, players.length - 2)).fill(1)]);
  // P8.10
  market.repriceSegments();
  turn.flush();
}

// Draw one neutral card per listed quadrant, place its buyer there, then reshuffle the deck.
export async function drawNeutralBuyers(root: Root, turn: T, quadrants: Quadrant[], flush = true): Promise<void> {
  const market = root.market;
  const drawn: Card[] = [];
  const placed: { quadrant: number; type: CarType; n: number }[] = [];
  for (const q of quadrants) {
    const card = await root.market.neutralDeck.draw();
    if (!card) break;
    drawn.push(card);
    const origin = QUADRANTS.find((s) => s.quadrant === q)!;
    for (const sp of card.spec().sparks) {
      const niche = market.niche(origin.row0 + sp.row - 1, origin.col0 + sp.col - 1);
      for (let i = 0; i < sp.count; i++) niche.buyers.add(new Car().set((c) => { c.carType = sp.type as CarType; c.parentFallback = market.neutralDeck; })); // out of the neutral deck
      placed.push({ quadrant: q, type: sp.type as CarType, n: sp.count });
    }
  }
  if (placed.length) turn.log(`Neutral cards place ${byQuadrant(placed)}`);
  root.market.neutralDeck.discard(drawn);
  root.market.neutralDeck.shuffle(); // P8.9
  if (flush) turn.flush(); // at game setup the whole table appears in one first frame
}
