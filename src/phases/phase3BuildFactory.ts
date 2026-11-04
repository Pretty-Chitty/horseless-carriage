import { Chit, DragTarget, Turn } from "@pretty-chitty/core";
import { Root } from "../chits/Root";
import { decide } from "../decide";
import { Player } from "../chits/Player";
import { Factory, FloorPiece } from "../chits/Factory";
import { FactoryTile } from "../chits/FactoryTile";
import { SpecIndicator } from "../chits/SpecIndicator";
import { FloorTile } from "../chits/FloorTile";
import { AddItemButton, AddSpecButton, DoneButton, FlipButton, RotateButton, SpecPickerButton, TakeBackButton } from "../ButtonLibrary";
import { reachZones, syncAllReach, syncReach } from "../reach";
import { carTypes, DEALERSHIPS, MARKETING_DEPARTMENTS_PER_PLAYER, station, STATIONS } from "../consts";

type T = Turn<any, Player, Root>;
type Mode = "setup" | "year";

// Phase 3 — Build factory (RULES.md P3, UX1–UX6). Also runs the setup placement (S10/P3.25)
// with a bench of exactly one research and one planning department.
export async function executeBuildFactory(root: Root, turn: T, mode: Mode): Promise<void> {
  const players = root.players.copy();
  for (const p of players) {
    makeCatalogue(p, root, mode);
    p.factory.syncBenchCounts();
  }

  // P3.1: everyone builds concurrently on their own panel.
  // Each sub-turn also holds its player's reach overlays, which follow the build as it happens.
  await turn.runParallelTurns(players, (p) => [p, p.factory.catalogue!, ...reachZones(root, p)], async (player, t) => {
    await buildTurn(player, root, t, mode);
  });

  // P3.7 / UX6: true up the shared supply in engineering order. A player the stock ran out
  // on has the unpaid pieces lifted and rebuilds sequentially against what is left.
  for (const player of root.engineeringOrder()) {
    const short = consumeStock(player, root);
    if (short.length === 0) continue;
    for (const piece of short) removePiece(player.factory, piece);
    syncCatalogue(player, root);
    turn.log(`${player.logKey} must rebuild: the supply ran out of ${[...new Set(short.map((s) => s.label()))].join(", ")}`);
    await turn.createTurn([player, player.factory.catalogue!, ...reachZones(root, player)], player, async (t) => {
      await buildTurn(player, root, t, mode);
    });
    for (const piece of consumeStock(player, root)) removePiece(player.factory, piece); // cannot happen: counts follow the supply
  }

  // P3.21: this year's floor expansion, placed during the build turn, is now fixed.
  for (const p of players) {
    const exp = p.factory.pendingExpansion();
    if (!exp) continue;
    exp.committed = true;
    exp.selected = false;
    p.factory.expansionsLeft -= 1;
    p.factory.expansionsPlaced += 1;
    p.expansions.value = p.factory.expansionsLeft;
    p.factory.recomputeGrid();
    p.factory.syncHand();
  }

  // Lock this year's arrangement (P3.3), clear the bench, drop focus markers (P3.24).
  for (const p of players) {
    const f = p.factory;
    for (const tile of f.benchTiles()) tile.removeFromParent();
    for (const tile of f.placedTiles()) if (!tile.committed) { tile.committed = true; tile.placedYear = root.year; }
    for (const ind of f.indicators.copy()) if (!ind.committed) { ind.committed = true; ind.placedYear = root.year; }
    f.resetDropTargets();
    f.pruneDropTargets();
    f.refreshValidity();
    if (mode === "year") root.office.moveToHistorical(p);
  }
  syncAllReach(root);
  turn.flush();
}

// ------------------------------------------------------------------------------------------
// The build catalogue (eligibility, UX6): one entry per kind the player may build this year,
// shown in the "Add" gallery. Each entry knows how many may be placed: the shared supply
// for stations, mainlines and research/planning departments (P3.7); the player's own limit
// for dealerships (C25) and marketing departments (C26); at setup, one research and one
// planning department (S10). Picking an entry mints a fresh piece; taking a piece back
// removes it, so the counts are always derived and never drift.
// ------------------------------------------------------------------------------------------
function makeCatalogue(player: Player, root: Root, mode: Mode): void {
  const f = player.factory;
  const entry = (max: number, init: (t: FactoryTile) => void) => {
    if (max <= 0) return;
    f.catalogue!.entries.add(new FactoryTile().set((t) => { t.playerColor = player.playerColor; t.playerOwnerId = player.playerId; t.placed = false; t.catalogueMax = max; init(t); }));
  };
  if (mode === "setup") {
    // S10: the starting departments are already on the floor (placeStartingDepartments, at game
    // setup); there is nothing to add, only to rearrange.
    if (!f.placedTiles().some((t) => t.kind === "department")) placeStartingDepartments(player);
    return;
  }
  const access = root.accessibleSlots(player);
  for (const s of STATIONS) {
    // P3.10/P3.11/P3.16: a station is buildable only with access to at least one of its slots.
    if (!s.slots.some((sl) => access.has(`${sl.dimension}:${sl.slot}`))) continue;
    entry(root.supply.stock(`station:${s.id}`), (t) => { t.kind = "station"; t.stationId = s.id; });
  }
  for (const ct of carTypes) entry(root.supply.stock(`mainline:${ct}`), (t) => { t.kind = "mainline"; t.carType = ct; });
  for (const dt of ["research", "planning"] as const) entry(root.supply.stock(`dept:${dt}`), (t) => { t.kind = "department"; t.departmentType = dt; });
  const built = f.placedTiles();
  for (const d of DEALERSHIPS) if (!built.some((t) => t.kind === "dealership" && t.dealerIndex === d.index)) entry(1, (t) => { t.kind = "dealership"; t.dealerIndex = d.index; });
  const marketingBuilt = built.filter((t) => t.kind === "department" && t.departmentType === "marketing").length;
  entry(MARKETING_DEPARTMENTS_PER_PLAYER - marketingBuilt, (t) => { t.kind = "department"; t.departmentType = "marketing"; });
}

// S10 (developer decision): both starting departments start on the floor, at the first legal
// spots, ready to be rearranged. Called during game setup, before the first frame, so the table
// opens with them in place instead of animating them in on every panel.
export function placeStartingDepartments(player: Player): void {
  const f = player.factory;
  for (const dt of ["research", "planning"] as const) {
    const t = new FactoryTile().set((x) => { x.kind = "department"; x.departmentType = dt; x.playerColor = player.playerColor; x.playerOwnerId = player.playerId; });
    f.pieces.add(t);
    f.recomputeGrid();
    const at = f.spotFor(t);
    t.x = at.x;
    t.y = at.y;
    t.placed = true;
    f.recomputeGrid();
  }
}

// A fresh piece of the entry's kind, placed on the floor.
function mintFrom(entry: FactoryTile, f: Factory): FactoryTile {
  const t = new FactoryTile().set((x) => {
    x.kind = entry.kind;
    x.stationId = entry.stationId;
    x.carType = entry.carType;
    x.departmentType = entry.departmentType;
    x.dealerIndex = entry.dealerIndex;
    x.playerColor = entry.playerColor;
    x.playerOwnerId = entry.playerOwnerId;
    x.parentFallback = f.floors.get(0); // it rises out of the floor, not in from the table edge
  });
  f.pieces.add(t);
  const at = f.spotFor(t);
  t.x = at.x;
  t.y = at.y;
  t.placed = true;
  return t;
}

// After a shortage the supply is lower than the catalogue assumed; lower each entry to match.
function syncCatalogue(player: Player, root: Root): void {
  const f = player.factory;
  for (const e of f.benchTiles()) {
    const key = e.supplyKey();
    if (!key) continue;
    // Unpaid placed copies are what this player is still asking the supply for.
    e.catalogueMax = root.supply.stock(key);
  }
  f.syncBenchCounts();
}

// Deduct this year's placed shared-supply pieces; return the ones the stock could not cover.
function consumeStock(player: Player, root: Root): FactoryTile[] {
  const short: FactoryTile[] = [];
  for (const t of player.factory.placedTiles()) {
    if (t.paid || t.committed) continue;
    const key = t.supplyKey();
    if (!key) { t.paid = true; continue; }
    if (root.supply.take(key)) t.paid = true;
    else short.push(t);
  }
  return short;
}

// Take a piece off the floor: it and its indicators are removed, and its catalogue entry's
// count goes back up (counts are derived from what is placed).
function removePiece(f: Factory, piece: FactoryTile, root?: Root): void {
  for (const ind of f.indicators.copy()) if (ind.station === piece) ind.removeFromParent();
  // P3.7: a copy already paid for (a shortage rebuild) goes back to the shared supply.
  const key = piece.paid && !piece.committed ? piece.supplyKey() : undefined;
  if (key && root) {
    root.supply.give(key);
    const e = f.benchTiles().find((b) => b.signature() === key);
    if (e) e.catalogueMax += 1;
  }
  piece.removeFromParent();
  f.recomputeGrid();
}

// ------------------------------------------------------------------------------------------
// The build turn: arrange freely, see what is wrong, commit when nothing is (UX1–UX4).
// ------------------------------------------------------------------------------------------
async function buildTurn(player: Player, root: Root, turn: T, mode: Mode): Promise<void> {
  const f = player.factory;
  const year = Math.max(1, root.year);
  let selected: FloorPiece | FloorTile | undefined;
  let done = false;
  // P3.21 (UX): this year's floor expansion is part of the build turn. It starts at the
  // factory's first legal spot and can be dragged to any legal spot, rotated or flipped.
  if (mode === "year" && f.expansionsLeft > 0 && !f.pendingExpansion()) {
    const exp = new FloorTile().set((t) => { t.kind = "expansion"; t.committed = false; });
    f.placeNewExpansion(exp);
    f.floors.add(exp);
  }
  const select = (p: FloorPiece | FloorTile | undefined) => {
    if (selected) selected.selected = false;
    selected = p;
    if (selected) selected.selected = true;
  };
  const drop = (piece: FloorPiece, target: { x: number; y: number }) => {
    // A station's indicators travel with it (UX4).
    if (piece instanceof FactoryTile && piece.placed) {
      for (const ind of f.indicators.filter((i) => i.station === piece)) {
        ind.x += target.x - piece.x;
        ind.y += target.y - piece.y;
      }
    }
    piece.x = target.x;
    piece.y = target.y;
    if (piece instanceof FactoryTile) piece.placed = true;
    select(piece);
  };
  const takeBack = (piece: FloorPiece) => {
    if (piece instanceof FactoryTile) removePiece(f, piece, root);
    else piece.removeFromParent();
    if (selected === piece) select(undefined);
  };

  // The Add gallery opens by itself at the start of a build (developer request) and after each add.
  let justAdded = mode === "year";
  turn.markZipStartPoint();
  while (!done) {
    let addedNow = false;
    f.refreshValidity();
    syncReach(root, player);
    f.resetDropTargets();
    const picks: any[] = [];
    const movable = f.placedPieces().filter((p) => !p.locked(year));
    // UX1: a piece may be dropped at any position on the factory's grid, legal or not; what
    // is wrong is shown, not prevented. Each target is the size of the piece's footprint so the
    // drop preview matches what lands. Targets are pooled by geometry, so pieces of the same
    // size share them. Spec indicators only ever land next to their own station (UX4), though
    // they may overlap something there. Positions where a piece at least fits on free floor
    // form their own target group — invisible to a player, but it lets the demo AI favour
    // sensible drops.
    // Targets depend only on the footprint (and, for an indicator, its station), so each size
    // is worked out once per prompt and shared by every piece of that size.
    const targetCache = new Map<string, DragTarget<any, any>[]>();
    const targetsFor = (piece: FloorPiece) => {
      const fp = piece.footprint();
      const cacheKey = piece instanceof SpecIndicator ? `ind:${piece.station?.id}` : `${fp.w}x${fp.h}`;
      const cached = targetCache.get(cacheKey);
      if (cached) return cached;
      const positions: { x: number; y: number }[] = [];
      if (piece instanceof SpecIndicator) positions.push(...f.ringCells(piece.station));
      else positions.push(...f.onFloorPositions(fp));
      // The demo picks a group uniformly before a target, so the small "fits and connects to
      // the bay" group gets a third of its drops; without it random setups take minutes.
      const connected: ReturnType<Factory["getDropTarget"]>[] = [];
      const good: ReturnType<Factory["getDropTarget"]>[] = [];
      const rest: ReturnType<Factory["getDropTarget"]>[] = [];
      for (const c of positions) {
        const group = !f.fits(c.x, c.y, fp, piece) ? rest : f.wouldConnectAt(c.x, c.y, fp, piece) ? connected : good;
        group.push(f.getDropTarget(c.x, c.y, fp.w, fp.h));
      }
      const result = [connected, good, rest].filter((g) => g.length > 0).map((g) => DragTarget.from(g, drop));
      targetCache.set(cacheKey, result);
      return result;
    };
    // "Add": a gallery of every kind still available, one per kind with the number left.
    // Picking one puts it on a free spot of the floor and selects it, ready to drag.
    const tops = f.benchTops();
    if (tops.length)
      picks.push(
        Chit.pick(tops, (entry) => {
          select(mintFrom(entry, f));
          addedNow = true;
        })
          .focus(player)
          .message("add an item")
          // The gallery reopens after an add, so several items can be added in a row; any
          // other action leaves it closed.
          .toggleButton(new AddItemButton().set((b) => (b.autoShow = justAdded)))
          .ai("build.add"),
      );
    // Rearrange anything unlocked.
    for (const piece of movable) {
      const targets = targetsFor(piece);
      if (targets.length) picks.push(Chit.dragPick(piece, targets).focus(player).ai("build.move"));
    }
    const exp = f.pendingExpansion();
    if (exp) {
      const fp = exp.footprint();
      const spots = f.expansionPositions(exp).map((c) => f.getDropTarget(c.x, c.y, fp.w, fp.h));
      if (spots.length) picks.push(Chit.dragPick(exp, [DragTarget.from(spots, (t: FloorTile, target) => { t.x = target.x; t.y = target.y; select(t); })]).focus(player).ai("build.expansion"));
    }
    // Click to select; the selection carries the verbs below.
    // P3.19: a station built in an earlier year stays fixed, but may still be selected to
    // receive an indicator the player now has access to.
    const upgradable = mode === "year" ? f.placedTiles().filter((t) => t.locked(year) && t.kind === "station" && addableSlots(t, player, root).length > 0 && indicatorCell(f, t)) : [];
    const selectable: (FloorPiece | FloorTile)[] = [...movable, ...upgradable, ...(exp ? [exp] : [])];
    if (selectable.length) picks.push(Chit.pick(selectable, (p) => select(p)).focus(player).ai("build.select"));
    if (selected instanceof FloorTile) {
      const sel = selected;
      picks.push(new RotateButton(() => rotateFloorInPlace(sel)).pick().message("rotate the floor expansion").ai("build.rotateFloor"));
    } else if (selected && (selected instanceof FactoryTile ? selected.placed : true)) {
      const sel = selected;
      if (sel instanceof FactoryTile) {
        const fixed = sel.locked(year); // P3.3: earlier years' tiles only take new indicators (P3.19)
        if (!fixed && canRotate(sel)) picks.push(new RotateButton(() => rotateInPlace(sel, f)).pick().message(`rotate the ${sel.label()}`).ai("build.rotate"));
        // M13: a mainline's back is its mirror image, so flipping swaps the B and C sides.
        if (!fixed && sel.kind === "mainline") picks.push(new FlipButton(() => { sel.flipped = !sel.flipped; }).pick().message(`flip the ${sel.label()}`).ai("build.flip"));
        // UX4: one Add spec button. With a single possible indicator it is added at once;
        // with several, a picker gallery opens showing each one.
        const slots = sel.kind === "station" ? addableSlots(sel, player, root) : [];
        const cell = slots.length ? indicatorCell(f, sel) : undefined;
        if (slots.length && cell) {
          picks.push(
            new AddSpecButton(async () => {
              let chosen = slots[0];
              if (slots.length > 1) {
                for (const sl of slots) f.catalogue!.previews.add(new SpecIndicator().set((i) => { i.dimension = sl.dimension; i.slot = sl.slot; i.step = sel.step()!; i.station = sel; }));
                const byChit = new Map(f.catalogue!.previews.copy().map((c, i) => [c, slots[i]]));
                await decide(turn, player, [
                  Chit.pick(f.catalogue!.previews.copy(), (c) => { chosen = byChit.get(c) ?? slots[0]; })
                    .message(`choose a spec for the ${sel.label()}`)
                    .context(sel)
                    .toggleButton(new SpecPickerButton())
                    .ai("build.spec"),
                ]);
                for (const c of f.catalogue!.previews.copy()) c.removeFromParent();
              }
              const ind = new SpecIndicator().set((i) => { i.dimension = chosen.dimension; i.slot = chosen.slot; i.step = sel.step()!; i.station = sel; i.x = cell.x; i.y = cell.y; i.parentFallback = sel; });
              f.indicators.add(ind);
              select(ind);
            })
              .pick()
              .message(`add a spec indicator to the ${sel.label()}`)
              .ai("build.addSpec"),
          );
        }
      }
      // At setup the two starting departments must both be placed (S10): nothing to take back.
      if (mode !== "setup" && !sel.locked(year)) picks.push(new TakeBackButton(() => takeBack(sel)).pick().message(sel instanceof FactoryTile ? `take back the ${sel.label()}` : "remove the indicator").ai("build.takeBack"));
    }
    const violations = f.violations();
    const setupIncomplete = mode === "setup" && f.benchTops().length > 0;
    const expansionBad = exp ? exp.problems.length > 0 : false;
    if (violations.length === 0 && !setupIncomplete && !expansionBad) picks.push(new DoneButton(() => { done = true; }).pick().message(mode === "setup" ? "confirm the starting layout" : "finish building").ai("build.done"));

    const help = violations.length || expansionBad
      ? `Pieces outlined in magenta are not legal yet: ${[...violations.map((v) => v.problems[0]), ...(exp?.problems ?? [])].join(" ")} Select a piece and use Take back to remove it.`
      : setupIncomplete
        ? "Place both starting departments; each must touch the loading bay or a tile that connects to it."
        : `Use Add to put a component on your floor, then drag it into place. Click a piece to rotate it, add a spec indicator, or take it back. Tiles from earlier years are fixed.${exp ? " Place this year's floor expansion too: it can be built on from next year." : ""}`;
    f.pruneDropTargets();
    if (picks.length === 0) {
      await turn.noValidMoves("Nothing can be built", help);
      return;
    }
    await decide(turn, player, mode === "setup" ? "place their starting departments" : "build their factory", help, picks);
    justAdded = addedNow;
    turn.flush();
    turn.zip();
  }
  select(undefined);
  f.refreshValidity();
  // One entry per kind, counted: "2 Batteries" reads better than "Battery, Battery".
  const counts = new Map<string, number>();
  for (const t of f.placedTiles().filter((x) => !x.committed)) counts.set(t.label(), (counts.get(t.label()) ?? 0) + 1);
  const placedNow = [...counts].map(([label, n]) => (n > 1 ? `${n} × ${label}` : label));
  const inds = f.indicators.filter((i) => !i.committed).length;
  turn.log(`${player.logKey} built ${placedNow.length ? placedNow.join(", ") : "nothing"}${inds ? ` and ${inds} spec indicator${inds > 1 ? "s" : ""}` : ""}`);
}

// Turn a tile where it stands. Squares never rotate; rectangles other than mainlines only
// toggle between 0° and 90°, because 180° is the same shape with the same rules; mainlines
// cycle through all four, since each side carries a manufacturing step (M13). The shift that
// keeps the piece roughly centred is applied going to 90° and reversed coming back, so two
// rotations land exactly where they started.
function canRotate(t: FactoryTile): boolean {
  const p = t.printedFootprint();
  return p.w !== p.h || t.kind === "mainline";
}
function rotateInPlace(t: FactoryTile, f: Factory): void {
  const before = { x: t.x, y: t.y, fp: t.footprint() };
  const p = t.printedFootprint();
  const a = Math.floor((p.w - p.h) / 2);
  const b = Math.floor((p.h - p.w) / 2);
  const ccw = t.kind === "mainline" || t.rotation % 2 === 0; // toggling back is a clockwise turn
  const next = t.kind === "mainline" ? (t.rotation + 1) % 4 : t.rotation % 2 === 0 ? 1 : 0;
  const toOdd = next % 2 === 1;
  if (toOdd !== (t.rotation % 2 === 1)) {
    t.x += toOdd ? a : -a;
    t.y += toOdd ? b : -b;
  }
  t.rotation = next;
  // Indicators turn with their station, about its centre (UX4). Grid y points down, so a
  // counter-clockwise quarter turn maps (dx, dy) to (dy, -dx).
  const after = t.footprint();
  const c0 = { x: before.x + before.fp.w / 2, y: before.y + before.fp.h / 2 };
  const c1 = { x: t.x + after.w / 2, y: t.y + after.h / 2 };
  for (const ind of f.indicators.filter((i) => i.station === t)) {
    const dx = ind.x + 0.5 - c0.x;
    const dy = ind.y + 0.5 - c0.y;
    const [rx, ry] = ccw ? [dy, -dx] : [-dy, dx];
    ind.x = Math.round(c1.x + rx - 0.5);
    ind.y = Math.round(c1.y + ry - 0.5);
  }
}

// P3.16, P3.17, P3.19: slots of this station the player has access to and has not yet
// placed on it.
function addableSlots(st: FactoryTile, player: Player, root: Root) {
  const access = root.accessibleSlots(player);
  const have = player.factory.indicators.filter((i) => i.station === st).map((i) => `${i.dimension}:${i.slot}`);
  return station(st.stationId!).slots.filter((s) => access.has(`${s.dimension}:${s.slot}`) && !have.includes(`${s.dimension}:${s.slot}`));
}

// A free square next to the station for a new indicator, else any square next to it.
function indicatorCell(f: Factory, st: FactoryTile): { x: number; y: number } | undefined {
  const ring = f.ringCells(st);
  return ring.find((c) => f.fits(c.x, c.y, { w: 1, h: 1 })) ?? ring[0];
}

// Turn this year's expansion a quarter turn where it stands, keeping it centred. If that is not
// a legal spot it shows as invalid and the player drags it to one; it is never moved for them.
function rotateFloorInPlace(t: FloorTile): void {
  const before = t.footprint();
  const cx = t.x + before.w / 2;
  const cy = t.y + before.h / 2;
  t.rotation = (t.rotation + 1) % 4;
  const after = t.footprint();
  t.x = Math.round(cx - after.w / 2);
  t.y = Math.round(cy - after.h / 2);
}
