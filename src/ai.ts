// AI players (references/ai.md). Scores are in dollars where a rule can say what an option is
// worth; the build turn instead follows a layout from the planner (aiPlanner.ts), one gesture
// at a time, and every other build option scores 0. The bots read the live board but only the
// public parts of it plus their own pieces.

import { AiOption, defineAi } from "@pretty-chitty/core";
import { Player } from "./chits/Player";
import { Root } from "./chits/Root";
import { FactoryTile } from "./chits/FactoryTile";
import { SpecIndicator } from "./chits/SpecIndicator";
import { Niche } from "./chits/Niche";
import { MarketWindow, QuadrantTarget, WindowTarget } from "./chits/MarketPieces";
import { BrandPiece, TrackSlot } from "./chits/ResearchTrack";
import { OfficeSpace } from "./chits/PlanningOffice";
import { Card } from "./chits/Card";
import { DropTarget } from "./chits/DropTarget";
import { cellKey } from "./geometry";
import { CAPACITY_MAX, CarType, carTypes, Dimension, dimensions, QUADRANTS, saleBonus, Segment, segmentOf, TRACK_SLOTS, trackSlotStation } from "./consts";
import { Plan, PlanInput, planFactory, planSetup, PPiece } from "./aiPlanner";
import { remainingCapacity, windowOf } from "./phases/phase5Sell";

type Memory = { failed?: string };
const DEBUG = typeof process !== "undefined" && !!process.env?.AI_DEBUG;
type Ctx = { view: Root; me: Player; options: AiOption[]; memory: Readonly<Memory>; prompt: { message?: string } };

// ------------------------------------------------------------------------------------------
// Shared reads
// ------------------------------------------------------------------------------------------
function myDealers(me: Player): FactoryTile[] {
  return me.factory.placedTiles().filter((t) => t.kind === "dealership");
}
function myMainlines(me: Player): FactoryTile[] {
  return me.factory.placedTiles().filter((t) => t.kind === "mainline");
}
function demand(view: Root): Record<CarType, number> {
  const out: Record<CarType, number> = { car: 0, sports: 0, truck: 0 };
  for (const n of view.market.niches.copy()) for (const t of carTypes) out[t] += n.buyersOf(t).length;
  return out;
}
function nextObsolete(view: Root): Dimension | undefined {
  const m = view.market;
  return (m.obsolescence === "bottom" ? m.bottomTrack : m.leftTrack)?.dimension;
}
// The best spec any of my dealers published this year on a dimension (P4.4).
function bestSpec(me: Player, d: Dimension): number {
  return Math.max(0, ...myDealers(me).map((t) => t.publishedSpecs[d] ?? 0));
}
// What a buyer of each segment usually pays: the printed markers, dearest segment first (M3).
const SEGMENT_PRICE: Record<Segment, number> = { 1: 2.5, 2: 3, 3: 4, 4: 5.5 };

// How much a dimension matters to me right now, for research.
// ctx.params.variant is free for A/B runs (scripts/ai-soak.mjs, AI_AB=1).
function dimWeight(view: Root, me: Player, d: Dimension, _variant?: string): number {
  const m = view.market;
  // P4.9: a dealer short of a minimum sells nothing; next year this one's minimum rises (P7.3).
  const need = m.minSpec(d) + (nextObsolete(view) === d ? 1 : 0);
  const short = myDealers(me).filter((t) => (t.publishedSpecs[d] ?? 0) < need).length;
  if (short && m.minSpec(d) > 0) return 5 + 2.5 * short;
  if (nextObsolete(view) === d) return 5; // its minimum goes up next (P7.3)
  if (m.activeDimensions().includes(d)) return 4; // wider windows (P5.5)
  return 2.5;
}

// ------------------------------------------------------------------------------------------
// Phase 3: the planned layout and the next gesture toward it
// ------------------------------------------------------------------------------------------
function planInput(view: Root, me: Player, variant?: string): PlanInput {
  const f = me.factory;
  const floor: string[] = [];
  const bay: string[] = [];
  for (const fl of f.floors.copy()) {
    if (!fl.committed) continue;
    const bays = new Set(fl.bayCells().map((c) => cellKey(c.x, c.y)));
    for (const c of fl.cells()) {
      const k = cellKey(c.x, c.y);
      if (bays.has(k)) bay.push(k);
      else floor.push(k);
    }
  }
  const pieces: PPiece[] = [];
  for (const t of f.placedTiles().filter((x) => x.committed))
    pieces.push({ key: t.id!, kind: t.kind, sig: t.signature(), x: t.x, y: t.y, rotation: t.rotation, flipped: t.flipped, fp: t.footprint(), existing: true, stationId: t.stationId, step: t.step(), carType: t.carType, departmentType: t.departmentType, dealerIndex: t.dealerIndex });
  for (const i of f.indicators.filter((x) => x.committed))
    pieces.push({ key: i.id!, kind: "indicator", sig: "indicator", x: i.x, y: i.y, rotation: 0, flipped: false, fp: { w: 1, h: 1 }, existing: true, step: i.step, stationKey: i.station?.id, dimension: i.dimension, slot: i.slot });
  const available: Record<string, number> = {};
  for (const e of f.benchTiles()) available[e.signature()] = e.catalogueMax;
  const m = view.market;
  const axes = [m.bottomTrack && { dimension: m.bottomAxis.dimension, min: m.bottomAxis.min }, m.leftTrack && { dimension: m.leftAxis.dimension, min: m.leftAxis.min }].filter(Boolean) as PlanInput["axes"];
  const minSpec = {} as Record<Dimension, number>;
  for (const d of dimensions) minSpec[d] = m.minSpec(d);
  return {
    floor,
    bay,
    pieces,
    available,
    access: [...view.accessibleSlots(me)],
    minSpec,
    axes,
    nextObsolete: nextObsolete(view),
    year: view.year,
    setup: view.year === 0,
    capacity: me.capacity.value,
    demand: demand(view),
    seed: me.seat,
    variant,
  };
}

const planCache = new Map<string, Plan>();
function planFor(view: Root, me: Player, variant?: string): { key: string; plan: Plan } {
  const inp = planInput(view, me, variant);
  const key = JSON.stringify([variant, me.playerId, inp.year, inp.available, inp.pieces.map((p) => p.key), inp.access.length, inp.minSpec, inp.axes]);
  let plan = planCache.get(key);
  if (!plan) {
    plan = inp.setup ? planSetup(inp) : planFactory(inp);
    if (DEBUG) console.error(`[plan ${me.playerColor} y${inp.year}] ${plan.pieces.map((p) => `${p.sig.split(":")[1] ?? p.sig}${p.kind === "indicator" ? `(${p.dimension}${p.slot})` : ""}@${p.x},${p.y}r${p.rotation}${p.flipped ? "f" : ""}`).join(" ")}`);
    if (planCache.size > 400) planCache.clear();
    planCache.set(key, plan);
  }
  return { key, plan };
}

type Want =
  | { kind: "add"; sig: string }
  | { kind: "select"; id: string }
  | { kind: "rotate" | "flip" | "addSpec" | "takeBack" | "done" }
  | { kind: "move"; id: string; x: number; y: number }
  | { kind: "moveExp"; x: number; y: number }
  | { kind: "spec"; dimension: Dimension; slot: number };

const wantCache = new WeakMap<object, { want: Want; failKey?: string }>();

function buildWant(ctx: Ctx): { want: Want; failKey?: string } {
  const hit = wantCache.get(ctx.options);
  if (hit) return hit;
  const { view, me } = ctx;
  const f = me.factory;
  const { key, plan } = planFor(view, me, (ctx as unknown as { params?: { variant?: string } }).params?.variant);
  const failed = ctx.memory.failed === key;
  const items = failed ? [] : plan.pieces;

  // Match this year's pieces to the plan: exact matches first, then any of the same kind.
  const mine = f.placedTiles().filter((t) => !t.committed);
  const assign = new Map<string, FactoryTile>();
  const taken = new Set<FactoryTile>();
  const tiles = items.filter((p) => p.kind !== "indicator");
  for (const it of tiles) {
    const t = mine.find((x) => !taken.has(x) && x.signature() === it.sig && x.x === it.x && x.y === it.y && x.rotation === it.rotation && x.flipped === it.flipped);
    if (t) { assign.set(it.key, t); taken.add(t); }
  }
  for (const it of tiles) {
    if (assign.has(it.key)) continue;
    const t = mine.find((x) => !taken.has(x) && x.signature() === it.sig);
    if (t) { assign.set(it.key, t); taken.add(t); }
  }
  const stationOf = (k: string | undefined) => (k ? assign.get(k) ?? f.placedTiles().find((t) => t.id === k) : undefined);
  const newInds = f.indicators.filter((i) => !i.committed);
  const indTaken = new Set<SpecIndicator>();
  const indAssign = new Map<string, SpecIndicator>();
  for (const it of items.filter((p) => p.kind === "indicator")) {
    const st = stationOf(it.stationKey);
    const i = newInds.find((x) => !indTaken.has(x) && x.station === st && x.dimension === it.dimension && x.slot === it.slot);
    if (i) { indAssign.set(it.key, i); indTaken.add(i); }
  }

  const selected = [...mine, ...f.placedTiles(), ...newInds].find((p) => p.selected);
  const via = (piece: FactoryTile | SpecIndicator, action: Want): Want => (selected === piece ? action : { kind: "select", id: piece.id! });

  let want: Want = { kind: "done" };
  const extraTile = view.year === 0 ? undefined : mine.find((t) => !taken.has(t));
  const extraInd = newInds.find((i) => !indTaken.has(i));
  if (extraInd) want = via(extraInd, { kind: "takeBack" });
  else if (extraTile) want = via(extraTile, { kind: "takeBack" });
  else {
    for (const it of items) {
      if (it.kind === "indicator") {
        const st = stationOf(it.stationKey);
        if (!st) continue;
        const ind = indAssign.get(it.key);
        if (!ind) { want = selected === st ? { kind: "addSpec" } : { kind: "select", id: st.id! }; break; }
        if (ind.x !== it.x || ind.y !== it.y) { want = { kind: "move", id: ind.id!, x: it.x, y: it.y }; break; }
        continue;
      }
      const t = assign.get(it.key);
      if (!t) { want = { kind: "add", sig: it.sig }; break; }
      if (t.flipped !== it.flipped) { want = via(t, { kind: "flip" }); break; }
      if (t.rotation !== it.rotation) { want = via(t, { kind: "rotate" }); break; }
      if (t.x !== it.x || t.y !== it.y) { want = { kind: "move", id: t.id!, x: it.x, y: it.y }; break; }
    }
  }
  // With the layout built, put this year's floor expansion where the mainlines can grow into it.
  if (want.kind === "done") {
    const exp = f.pendingExpansion();
    const targets = ctx.options.filter((o) => o.key === "build.expansion" && o.kind === "drag").map((o) => (o as unknown as { target: DropTarget }).target);
    if (exp && targets.length) {
      const lines = f.placedTiles().filter((t) => t.kind === "mainline").flatMap((t) => t.cells());
      const floorCells = new Set(f.floors.filter((fl) => fl.committed).flatMap((fl) => fl.cells()).map((c) => cellKey(c.x, c.y)));
      const fp = exp.footprint();
      const value = (x: number, y: number) => {
        let v = 0;
        for (let dy = 0; dy < fp.h; dy++)
          for (let dx = 0; dx < fp.w; dx++) {
            const cx = x + dx, cy = y + dy;
            if (lines.some((c) => Math.max(Math.abs(c.x - cx), Math.abs(c.y - cy)) <= 3)) v += 1;
            if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => floorCells.has(cellKey(cx + a, cy + b)))) v += 0.2;
          }
        return v;
      };
      const here = value(exp.x, exp.y);
      let best: { x: number; y: number; v: number } | undefined;
      for (const t of targets) { const v = value(t.x, t.y); if (!best || v > best.v) best = { x: t.x, y: t.y, v }; }
      if (best && best.v > here + 0.5) want = { kind: "moveExp", x: best.x, y: best.y };
    }
  }
  // An "add spec" that opened the picker: choose the planned indicator.
  const pickerOpen = ctx.options.some((o) => o.key === "build.spec");
  if (pickerOpen) {
    const st = selected as FactoryTile | undefined;
    const it = items.find((p) => p.kind === "indicator" && stationOf(p.stationKey) === st && !indAssign.has(p.key));
    if (it) want = { kind: "spec", dimension: it.dimension!, slot: it.slot! };
  }
  const result: { want: Want; failKey?: string } = { want };
  // If the wanted gesture is not on offer, the plan has gone wrong: abandon it this year, take
  // back what does not belong, and finish.
  if (!ctx.options.some((o) => matches(o, want))) {
    result.failKey = key;
    if (DEBUG && ctx.memory.failed !== key) console.error(`[plan FAILED ${me.playerColor} y${view.year}] want ${JSON.stringify(want)}; offered ${[...new Set(ctx.options.map((o) => o.key))].join(",")}`);
  }
  wantCache.set(ctx.options, result);
  return result;
}

function matches(o: AiOption, w: Want): boolean {
  switch (w.kind) {
    case "add":
      return o.key === "build.add" && o.kind === "chit" && (o.chit as FactoryTile).signature() === w.sig;
    case "select":
      return o.key === "build.select" && o.kind === "chit" && o.chit.id === w.id;
    case "move":
      return o.key === "build.move" && o.kind === "drag" && o.chit.id === w.id && (o.target as DropTarget).x === w.x && (o.target as DropTarget).y === w.y;
    case "moveExp":
      return o.key === "build.expansion" && o.kind === "drag" && (o.target as DropTarget).x === w.x && (o.target as DropTarget).y === w.y;
    case "spec":
      return o.key === "build.spec" && o.kind === "chit" && (o.chit as SpecIndicator).dimension === w.dimension && (o.chit as SpecIndicator).slot === w.slot;
    case "rotate":
      return o.key === "build.rotate";
    case "flip":
      return o.key === "build.flip";
    case "addSpec":
      return o.key === "build.addSpec";
    case "takeBack":
      return o.key === "build.takeBack";
    case "done":
      return o.key === "build.done";
  }
}

const buildRule = (opt: AiOption, ctx: any) => {
  const { want, failKey } = buildWant(ctx as Ctx);
  if (failKey && ctx.memory.failed !== failKey) {
    // Abandon the plan: any option will do, as long as the memory records it.
    return { score: opt.key === "build.takeBack" || opt.key === "build.done" ? 1 : 0, plan: (prev: Memory) => ({ ...prev, failed: failKey }) };
  }
  return matches(opt, want) ? 100 : 0;
};

// ------------------------------------------------------------------------------------------
// Phase 5: sales, valued in dollars with the rules' own capacity function (P5.8–P5.10)
// ------------------------------------------------------------------------------------------
function revenue(view: Root, me: Player, dealer: FactoryTile, niche: Niche): number {
  const price = view.market.segmentPrice(niche.segment()) ?? 0;
  let r = 0;
  for (const t of carTypes) {
    const n = Math.min(niche.buyersOf(t).length, remainingCapacity(dealer, t, me, view));
    r += n * (price + saleBonus(t));
  }
  return r;
}
function dealerFor(me: Player, w: MarketWindow): FactoryTile | undefined {
  return myDealers(me).find((d) => d.dealerIndex === w.dealerIndex);
}
function windowValue(view: Root, me: Player, dealer: FactoryTile, row: number, col: number, size: MarketWindow["size"], vertical: boolean): number {
  const vals = view.market
    .windowCells(row, col, size, vertical)
    .filter((c) => view.market.inBounds(c.row, c.col))
    .map((c) => revenue(view, me, dealer, view.market.niche(c.row, c.col)));
  const best = Math.max(0, ...vals);
  return best + 0.25 * (vals.reduce((a, b) => a + b, 0) - best);
}

// ------------------------------------------------------------------------------------------
// Phase 8: where a card's sparks would bring buyers I can reach
// ------------------------------------------------------------------------------------------
function reachable(view: Root, me: Player, row: number, col: number): boolean {
  const req = view.market.requirement(row, col);
  return myDealers(me).some((d) => dimensions.every((dim) => req[dim] <= (d.publishedSpecs[dim] ?? 0) + (view.market.activeDimensions().includes(dim) ? 1 : 0)));
}
function typeWeight(me: Player, t: CarType): number {
  if (t === "car") return 1;
  return myMainlines(me).some((m) => m.carType === t) ? 1.3 : 0.4;
}
function quadrantValue(view: Root, me: Player, card: Card, quadrant: number): number {
  const q = QUADRANTS.find((s) => s.quadrant === quadrant)!;
  let v = 0;
  for (const sp of card.spec().sparks) {
    const row = q.row0 + sp.row - 1;
    const col = q.col0 + sp.col - 1;
    v += sp.count * typeWeight(me, sp.type) * (reachable(view, me, row, col) ? SEGMENT_PRICE[segmentOf(row, col)] : 0.6);
  }
  return v;
}
function leading(view: Root, me: Player): boolean {
  return view.players.copy().every((p) => p === me || p.wealth.value <= me.wealth.value);
}

// ------------------------------------------------------------------------------------------
// The rules
// ------------------------------------------------------------------------------------------
export const ai = defineAi<Player, Root, Memory>({
  initialMemory: () => ({}),
  temperature: 0.6,
  rules: {
    // P1: advance own research where it opens the stations I need, or my assembly capacity.
    "research.space": (opt, { view, me, params }) => {
      if (opt.kind !== "chit") return 0;
      const slot = opt.chit as TrackSlot;
      const mineHere = slot.markers.some((m) => m.playerId === me.playerId);
      if (!mineHere || slot.position >= TRACK_SLOTS) return 0.2; // only someone else's marker
      const track = slot.parent as unknown as { dimension: Dimension };
      const next = slot.position + 1;
      const st = trackSlotStation(track.dimension, next);
      const access = view.accessibleSlots(me).has(`${track.dimension}:${next}`);
      const stock = view.supply.stock(`station:${st}`) > 0 ? 1 : 0.3;
      return 1 + dimWeight(view, me, track.dimension, params?.variant) * (access ? 0.4 : 1) * stock;
    },
    "research.capacity": (_opt, { view, me }) => {
      if (me.capacity.value >= CAPACITY_MAX) return -Infinity;
      // Each step is one more car per mainline per year, worth having once windows can reach buyers.
      const lines = myMainlines(me).length;
      const yearsLeft = Math.max(0, 7 - view.year);
      return 1 + 1.4 * lines * Math.min(4, yearsLeft) * (me.capacity.value < 3 ? 1 : 0.7);
    },
    "research.marker": (opt, { me }) => (opt.kind === "chit" && (opt.chit as BrandPiece).playerId === me.playerId ? 10 : 0),

    // P2: engineering early (patents, first to build), sales later (first to sell, ties).
    "focus.slot": (opt, { view }) => {
      if (opt.kind !== "chit") return 0;
      const i = (opt.chit as OfficeSpace).index;
      const n = view.players.length;
      // Engineering for three years, then sales (A/B tested: a longer engineering spell lost).
      const early = view.year <= 3;
      if (i === 1) return early ? 6 : 3.5;
      if (i === n) return early ? 3 : 6;
      return 2 + (early ? (n - i) * 0.2 : i * 0.2);
    },
    "focus.pass": (_o, { me }) => 2.4 + 0.2 * me.gantt.value,

    // P3: follow the plan.
    "build.add": buildRule,
    "build.move": buildRule,
    "build.select": buildRule,
    "build.rotate": buildRule,
    "build.flip": buildRule,
    "build.addSpec": buildRule,
    "build.spec": buildRule,
    "build.takeBack": buildRule,
    "build.done": buildRule,
    "build.expansion": buildRule,
    "build.rotateFloor": () => -Infinity,
    "build.flipFloor": () => -Infinity,

    // P5: take the most money now, and prefer windows that cover more buyers for later rounds.
    "sell.niche": (opt, { view, me }) => {
      if (opt.kind !== "chit") return 0;
      const niche = opt.chit as Niche;
      const ctxDealer = opt.pick.context instanceof FactoryTile ? opt.pick.context : undefined;
      const dealers = ctxDealer ? [ctxDealer] : myDealers(me).filter((d) => windowOf(d, view)?.covers(niche.row, niche.col));
      return Math.max(0, ...dealers.map((d) => revenue(view, me, d, niche)));
    },
    "sell.window": (opt, { view, me }) => {
      if (opt.kind !== "drag") return 0;
      const w = opt.chit as MarketWindow;
      const t = opt.target as WindowTarget;
      const dealer = dealerFor(me, w);
      return dealer ? windowValue(view, me, dealer, t.row, t.col, w.size, w.vertical) : 0;
    },
    "sell.rotate": (_opt, { view, me }) => {
      let gain = -5;
      for (const w of view.market.windows.filter((x) => x.staged && x.playerId === me.playerId && x.size === "S")) {
        const d = dealerFor(me, w);
        if (!d) continue;
        const best = (vertical: boolean) => Math.max(0, ...view.market.validAnchors(d.publishedSpecs, "S", vertical).map((a) => windowValue(view, me, d, a.row, a.col, "S", vertical)));
        const other = best(!w.vertical);
        if (other > best(w.vertical) + 0.5) gain = Math.max(gain, other - 0.1);
      }
      return gain;
    },
    "sell.dealer": (opt, { view, me }) => {
      if (opt.kind !== "chit" || !(opt.pick.context instanceof Niche)) return 0;
      return revenue(view, me, opt.chit as FactoryTile, opt.pick.context);
    },

    // P8: play the card whose sparks land where I can sell, in its best quadrant.
    "grow.card": (opt, { view, me }) => {
      if (opt.kind !== "chit") return 0;
      const card = opt.chit as Card;
      const best = Math.max(...[1, 2, 3, 4].map((q) => quadrantValue(view, me, card, q)));
      return best + (leading(view, me) ? 0.8 : -0.8) * card.spec().clocks;
    },
    "grow.quadrant": (opt, { view, me }) => {
      if (opt.kind !== "chit" || !(opt.pick.context instanceof Card)) return 0;
      return quadrantValue(view, me, opt.pick.context, (opt.chit as QuadrantTarget).quadrant);
    },
  },
});
