// The AI's factory planner (phase 3). Pure: it works on plain records, never on chits, so it
// can try thousands of layouts without touching the game. The validator mirrors
// Factory.problemsFor (P3.4–P3.20) and the value function mirrors phase 4's published specs
// (P4.5–P4.9), so what the planner thinks is legal and useful is what the rules say.

import { Cell, cellKey, cellsOf, computeZones, NEIGHBOURS, rotatedFootprint, ZonePiece } from "./geometry";
import {
  CarType,
  carTypes,
  DEALERSHIPS,
  department,
  DepartmentType,
  Dimension,
  dimensions,
  Footprint,
  mainline,
  station,
  StationId,
  STATIONS,
  Step,
} from "./consts";

export type PKind = "station" | "mainline" | "dealership" | "department" | "indicator";

export interface PPiece {
  key: string; // chit id for existing pieces, "n<i>" for planned ones
  kind: PKind;
  sig: string; // catalogue signature (FactoryTile.signature); "indicator" for indicators
  x: number;
  y: number;
  rotation: number;
  flipped: boolean;
  fp: Footprint; // rotated
  existing: boolean; // already on the floor before this plan (committed)
  stationId?: StationId;
  step?: Step;
  carType?: CarType;
  departmentType?: DepartmentType;
  dealerIndex?: number;
  stationKey?: string; // indicators: the station they point at
  dimension?: Dimension;
  slot?: number;
}

export interface PlanInput {
  floor: string[]; // buildable squares (committed floors, bays excluded)
  bay: string[];
  pieces: PPiece[]; // committed pieces and indicators
  available: Record<string, number>; // signature -> how many may be built this year
  access: string[]; // "dimension:slot"
  minSpec: Record<Dimension, number>;
  axes: { dimension: Dimension; min: number }[]; // the two active dimensions
  nextObsolete?: Dimension; // the active dimension that leaves the market next (P7)
  year: number;
  setup: boolean;
  capacity: number;
  demand: Record<CarType, number>; // buyers on the board by type
  seed?: number; // per-seat taste, so bots at one table build different factories
  variant?: string; // A/B experiments (scripts/ai-soak.mjs AI_AB=1)
}

// A small, stable preference per seat and candidate: enough to break near-ties differently.
function taste(seed: number | undefined, key: string): number {
  if (seed === undefined) return 0;
  let h = 2166136261 ^ seed;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

export interface Plan {
  pieces: PPiece[]; // new pieces and indicators, in the order the bot should place them
}

// ------------------------------------------------------------------------------------------
// Layout state
// ------------------------------------------------------------------------------------------
class Layout {
  floor: Set<string>;
  bay: Set<string>;
  pieces: PPiece[];
  occ = new Map<string, PPiece>();
  constructor(floor: Set<string>, bay: Set<string>, pieces: PPiece[]) {
    this.floor = floor;
    this.bay = bay;
    this.pieces = [...pieces];
    for (const p of this.pieces) for (const c of cellsOf(p.x, p.y, p.fp)) this.occ.set(cellKey(c.x, c.y), p);
  }
  with(...add: PPiece[]): Layout {
    return new Layout(this.floor, this.bay, [...this.pieces, ...add]);
  }
  free(x: number, y: number): boolean {
    const k = cellKey(x, y);
    return this.floor.has(k) && !this.occ.has(k);
  }
  fits(x: number, y: number, fp: Footprint): boolean {
    for (const c of cellsOf(x, y, fp)) if (!this.free(c.x, c.y)) return false;
    return true;
  }
  // Touches a bay or a piece already on the floor (P3.6): enough for a new piece, since every
  // piece already placed is connected.
  anchored(x: number, y: number, fp: Footprint): boolean {
    for (const c of cellsOf(x, y, fp))
      for (const d of NEIGHBOURS) {
        const k = cellKey(c.x + d.x, c.y + d.y);
        if (this.bay.has(k)) return true;
        const q = this.occ.get(k);
        if (q && !(c.x + d.x >= x && c.x + d.x < x + fp.w && c.y + d.y >= y && c.y + d.y < y + fp.h)) return true;
      }
    return false;
  }
  adjacent(p: PPiece): PPiece[] {
    const out = new Set<PPiece>();
    for (const c of cellsOf(p.x, p.y, p.fp))
      for (const d of NEIGHBOURS) {
        const q = this.occ.get(cellKey(c.x + d.x, c.y + d.y));
        if (q && q !== p) out.add(q);
      }
    return [...out];
  }
  ring(p: { x: number; y: number; fp: Footprint }): Cell[] {
    const out: Cell[] = [];
    const seen = new Set<string>();
    for (const c of cellsOf(p.x, p.y, p.fp))
      for (const d of NEIGHBOURS) {
        const n = { x: c.x + d.x, y: c.y + d.y };
        if (n.x >= p.x && n.x < p.x + p.fp.w && n.y >= p.y && n.y < p.y + p.fp.h) continue;
        const k = cellKey(n.x, n.y);
        if (!seen.has(k)) { seen.add(k); out.push(n); }
      }
    return out;
  }
  bounds() {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const k of this.floor) {
      const [x, y] = k.split(",").map(Number);
      minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    return { minX, minY, maxX, maxY };
  }
  zones() {
    const zp: ZonePiece[] = [];
    for (const p of this.pieces) {
      if (p.kind === "station") zp.push({ id: p.key, kind: "station", step: p.step, stationId: p.stationId, x: p.x, y: p.y, footprint: p.fp, rotation: p.rotation });
      else if (p.kind === "indicator") zp.push({ id: p.key, kind: "indicator", step: p.step, x: p.x, y: p.y, footprint: p.fp, rotation: 0 });
      else if (p.kind === "mainline") zp.push({ id: p.key, kind: "mainline", x: p.x, y: p.y, footprint: p.fp, rotation: p.rotation, flipped: p.flipped });
    }
    return computeZones(zp);
  }
}

// ------------------------------------------------------------------------------------------
// Validator: Factory.problemsFor on records. Returns the keys of pieces with a problem.
// ------------------------------------------------------------------------------------------
export function invalidKeys(l: Layout): string[] {
  const bad = new Set<string>();
  // P3.5 fit
  const seen = new Map<string, PPiece>();
  for (const p of l.pieces)
    for (const c of cellsOf(p.x, p.y, p.fp)) {
      const k = cellKey(c.x, c.y);
      if (!l.floor.has(k)) bad.add(p.key);
      const o = seen.get(k);
      if (o) { bad.add(p.key); bad.add(o.key); }
      seen.set(k, p);
    }
  // P3.6 connectivity to a bay through pieces
  const connected = new Set<PPiece>();
  const queue: PPiece[] = [];
  for (const p of l.pieces) {
    const touchesBay = cellsOf(p.x, p.y, p.fp).some((c) => NEIGHBOURS.some((d) => l.bay.has(cellKey(c.x + d.x, c.y + d.y))));
    if (touchesBay) { connected.add(p); queue.push(p); }
  }
  while (queue.length) {
    const p = queue.shift()!;
    for (const q of l.adjacent(p)) if (!connected.has(q)) { connected.add(q); queue.push(q); }
  }
  for (const p of l.pieces) if (!connected.has(p)) bad.add(p.key);
  const zones = l.zones();
  for (const p of l.pieces) {
    const adj = l.adjacent(p);
    if (p.kind === "mainline" && !adj.some((a) => a.kind === "dealership")) bad.add(p.key); // P3.8
    if (p.kind === "dealership" && !adj.some((a) => a.kind === "mainline")) bad.add(p.key); // P3.8
    if (p.kind === "department" && p.departmentType === "marketing" && !adj.some((a) => a.kind === "dealership")) bad.add(p.key); // P3.9
    if (p.kind === "station") {
      const z = zones.find((zz) => zz.pieceIds.includes(p.key));
      if (!z || z.mainlineSides.length === 0) bad.add(p.key); // P3.14
      if (z) {
        const same = z.pieceIds.filter((id) => l.pieces.find((q) => q.key === id)?.stationId === p.stationId);
        if (same.length > 1) bad.add(p.key); // P3.15
      }
      if (!adj.some((a) => a.kind === "indicator" && a.stationKey === p.key)) bad.add(p.key); // P3.16
    }
    if (p.kind === "indicator") {
      const st = l.pieces.find((q) => q.key === p.stationKey);
      if (!st || !adj.includes(st)) bad.add(p.key); // P3.20
    }
  }
  return [...bad];
}

// ------------------------------------------------------------------------------------------
// Value: what this layout's dealers would publish in phase 4, scored.
// ------------------------------------------------------------------------------------------
function dealerSpecs(l: Layout, zones: ReturnType<Layout["zones"]>, dealer: PPiece) {
  const mains = l.adjacent(dealer).filter((a) => a.kind === "mainline");
  const specs = {} as Record<Dimension, number>;
  for (const d of dimensions) {
    specs[d] = mains.length
      ? Math.min(
          ...mains.map((m) => {
            let n = 0;
            for (const z of zones) {
              if (!z.mainlineSides.some((s) => s.mainlineId === m.key)) continue;
              for (const id of z.pieceIds) {
                const q = l.pieces.find((x) => x.key === id);
                if (q?.kind === "indicator" && q.dimension === d) n++;
              }
            }
            return n;
          }),
        )
      : 0; // P4.5, P4.6
  }
  const marketing = l.adjacent(dealer).filter((a) => a.kind === "department" && a.departmentType === "marketing").length;
  return { mains, specs, marketing };
}

// Minimum-spec shortfall of one dealer (P4.9), summed over dimensions.
function missingFor(l: Layout, inp: PlanInput, dealer: PPiece): number {
  const d = l.pieces.find((p) => p.key === dealer.key);
  if (!d) return 0;
  const { specs } = dealerSpecs(l, l.zones(), d);
  return dimensions.reduce((n, dim) => n + Math.max(0, inp.minSpec[dim] - specs[dim]), 0);
}

export function layoutValue(l: Layout, inp: PlanInput): number {
  const zones = l.zones();
  let v = 0;
  for (const dealer of l.pieces.filter((p) => p.kind === "dealership")) {
    const { mains, specs, marketing } = dealerSpecs(l, zones, dealer);
    if (!mains.length) continue;
    const missing = dimensions.reduce((n, d) => n + Math.max(0, inp.minSpec[d] - specs[d]), 0); // P4.9
    // Reach: how many of the 4×4 axis blocks the window may cover (M4).
    const reach = inp.axes.reduce((n, a) => n * Math.max(0, Math.min(4, specs[a.dimension] - a.min + 1)), 1);
    const stretch = marketing === 0 ? 0 : marketing === 1 ? 10 : 16; // P4.8: 2, 4 or 9 niches
    // Each mainline adds a type's worth of production; demand for that type scales it.
    const production = mains.reduce((n, m) => n + 1 + Math.min(1, (inp.demand[m.carType!] ?? 0) / 6), 0);
    const next = inp.nextObsolete && specs[inp.nextObsolete] >= inp.minSpec[inp.nextObsolete] + 1 ? 7 : 0; // next year's minimum (P7.3)
    const extras = dimensions.reduce((n, d) => n + Math.min(2, specs[d]), 0) * 0.6; // tracks rotate in later
    v += missing ? 4 * production - 12 * missing + reach * 0.5 : 10 * production + 2.2 * reach * Math.min(2, production) + stretch + next + extras;
  }
  const depts = (t: DepartmentType) => l.pieces.filter((p) => p.kind === "department" && p.departmentType === t).length;
  const research = depts("research");
  const planning = depts("planning");
  const yearsLeft = Math.max(0, 7 - inp.year);
  v += (Math.min(research, 2) * 0.9 + Math.max(0, Math.min(research, 3) - 2) * 0.4) * yearsLeft; // research actions while there is time to use them
  v += Math.min(planning, 1) * 0.35 * yearsLeft + (planning >= 2 ? 0.15 * yearsLeft : 0);
  return v;
}

// ------------------------------------------------------------------------------------------
// Candidates
// ------------------------------------------------------------------------------------------
let counter = 0;
const newKey = () => `n${counter++}`;
const CELL_COST = 0.3; // value of one square of floor kept free for later years

function positions(l: Layout, fp: Footprint, needAnchor: boolean): Cell[] {
  const b = l.bounds();
  const out: Cell[] = [];
  for (let y = b.minY; y <= b.maxY - fp.h + 1; y++)
    for (let x = b.minX; x <= b.maxX - fp.w + 1; x++) if (l.fits(x, y, fp) && (!needAnchor || l.anchored(x, y, fp))) out.push({ x, y });
  return out;
}

function rotations(fp: Footprint, all4 = false): number[] {
  if (all4) return [0, 1, 2, 3];
  return fp.w === fp.h ? [0] : [0, 1];
}

// Free squares reachable within `depth` steps of a set of start squares: room to grow.
function room(l: Layout, starts: Cell[], depth: number): number {
  const seen = new Set<string>();
  let frontier = starts.filter((c) => l.free(c.x, c.y));
  for (const c of frontier) seen.add(cellKey(c.x, c.y));
  for (let i = 1; i < depth; i++) {
    const next: Cell[] = [];
    for (const c of frontier)
      for (const d of NEIGHBOURS) {
        const n = { x: c.x + d.x, y: c.y + d.y };
        const k = cellKey(n.x, n.y);
        if (!seen.has(k) && l.free(n.x, n.y)) { seen.add(k); next.push(n); }
      }
    frontier = next;
  }
  return seen.size;
}

// A mainline and a new dealership beside it (P3.8), placed where the mainline keeps the most
// room along the sides whose step the player can actually build.
function bestPair(l: Layout, inp: PlanInput, type: CarType, dealerIndex: number): PPiece[] | undefined {
  const mfp = mainline(type).footprint;
  const dfp = DEALERSHIPS[dealerIndex].footprint;
  const stepWeight: Record<Step, number> = { A: 1, B: 1, C: 1, D: 1 };
  for (const s of STATIONS) if ((inp.available[`station:${s.id}`] ?? 0) > 0) stepWeight[s.step] += 1;
  let best: { score: number; pieces: PPiece[] } | undefined;
  // Stations and indicators already in a zone with a mainline, by square and step: a new
  // mainline whose side of the same step touches them shares their indicators (P4.5), which is
  // how a second line meets the minimum specs without a second set of stations.
  const live = new Map<string, Step>();
  for (const z of l.zones())
    if (z.mainlineSides.length)
      for (const id of z.pieceIds) {
        const q = l.pieces.find((x) => x.key === id);
        if (q) for (const c of cellsOf(q.x, q.y, q.fp)) live.set(cellKey(c.x, c.y), z.step);
      }
  for (const flipped of [false, true])
    for (const rot of [0, 1, 2, 3]) {
      const fp = rotatedFootprint(mfp, rot);
      for (const at of positions(l, fp, false)) {
        const m: PPiece = { key: "m?", kind: "mainline", sig: `mainline:${type}`, x: at.x, y: at.y, rotation: rot, flipped, fp, existing: false, carType: type };
        const lm = l.with(m);
        const mAnchored = l.anchored(at.x, at.y, fp);
        for (const drot of rotations(dfp)) {
          const dfpr = rotatedFootprint(dfp, drot);
          // dealer positions edge-adjacent to the mainline
          for (let y = at.y - dfpr.h; y <= at.y + fp.h; y++)
            for (let x = at.x - dfpr.w; x <= at.x + fp.w; x++) {
              if (!lm.fits(x, y, dfpr)) continue;
              const touchesM = cellsOf(x, y, dfpr).some((c) => NEIGHBOURS.some((d) => lm.occ.get(cellKey(c.x + d.x, c.y + d.y)) === m));
              if (!touchesM) continue;
              if (!mAnchored && !l.anchored(x, y, dfpr)) continue;
              const dealer: PPiece = { key: "d?", kind: "dealership", sig: `dealership:${dealerIndex}`, x, y, rotation: drot, flipped: false, fp: dfpr, existing: false, dealerIndex };
              const l2 = lm.with(dealer);
              // Room along each mainline side, weighted by how many stations of its step exist.
              let score = 0;
              for (const edge of ["top", "right", "bottom", "left"] as const) {
                const side = sideCells(m, edge);
                const step = stepOn(m, edge);
                score += stepWeight[step] * room(l2, side, 3);
                score += 25 * side.filter((c) => live.get(cellKey(c.x, c.y)) === step).length; // shared zone
              }
              score += 0.6 * Math.min(14, room(l2, l2.ring(dealer), 3)); // marketing room
              score += 6 * taste(inp.seed, `pair${rot}${flipped}${at.x},${at.y}`);
              if (!best || score > best.score) best = { score, pieces: [m, dealer] };
            }
        }
      }
    }
  if (!best) return undefined;
  const [m, d] = best.pieces;
  return [{ ...m, key: newKey() }, { ...d, key: newKey() }];
}

import { mainlineStepOnEdge } from "./geometry";
function stepOn(m: PPiece, edge: "top" | "right" | "bottom" | "left"): Step {
  return mainlineStepOnEdge(edge, m.rotation, m.flipped);
}
function sideCells(p: PPiece, edge: "top" | "right" | "bottom" | "left"): Cell[] {
  const out: Cell[] = [];
  if (edge === "top") for (let i = 0; i < p.fp.w; i++) out.push({ x: p.x + i, y: p.y - 1 });
  if (edge === "bottom") for (let i = 0; i < p.fp.w; i++) out.push({ x: p.x + i, y: p.y + p.fp.h });
  if (edge === "left") for (let i = 0; i < p.fp.h; i++) out.push({ x: p.x - 1, y: p.y + i });
  if (edge === "right") for (let i = 0; i < p.fp.h; i++) out.push({ x: p.x + p.fp.w, y: p.y + i });
  return out;
}

// Squares where a piece of `step` would join a zone that has a mainline: beside a mainline
// side of that step, or beside a station or indicator of that step already in such a zone.
function zoneFrontier(l: Layout, step: Step): Set<string> {
  const zones = l.zones();
  const live = new Set<string>();
  for (const z of zones) if (z.step === step && z.mainlineSides.length) for (const id of z.pieceIds) live.add(id);
  const out = new Set<string>();
  for (const p of l.pieces) {
    if (p.kind === "mainline") {
      for (const e of ["top", "right", "bottom", "left"] as const) if (stepOn(p, e) === step) for (const c of sideCells(p, e)) out.add(cellKey(c.x, c.y));
    } else if ((p.kind === "station" || p.kind === "indicator") && p.step === step && live.has(p.key)) {
      for (const c of l.ring(p)) out.add(cellKey(c.x, c.y));
    }
  }
  return out;
}

// A station with an indicator for each slot the player has access to (P3.16, P3.17), placed
// in a zone with a mainline. Returns the best placement by value gained, if any gains.
function bestStation(l: Layout, inp: PlanInput, base: number, used: Record<string, number>): { gain: number; pieces: PPiece[] } | undefined {
  const access = new Set(inp.access);
  let best: { gain: number; pieces: PPiece[] } | undefined;
  for (const s of STATIONS) {
    const sig = `station:${s.id}`;
    if ((inp.available[sig] ?? 0) - (used[sig] ?? 0) <= 0) continue;
    const slots = s.slots.filter((sl) => access.has(`${sl.dimension}:${sl.slot}`));
    if (!slots.length) continue;
    const frontier = zoneFrontier(l, s.step);
    if (!frontier.size) continue;
    for (const rot of rotations(s.footprint)) {
      const fp = rotatedFootprint(s.footprint, rot);
      for (const at of positions(l, fp, true)) {
        if (!cellsOf(at.x, at.y, fp).some((c) => NEIGHBOURS.some((d) => frontier.has(cellKey(c.x + d.x, c.y + d.y))))) continue;
        const st: PPiece = { key: newKey(), kind: "station", sig, x: at.x, y: at.y, rotation: rot, flipped: false, fp, existing: false, stationId: s.id, step: s.step };
        let lay = l.with(st);
        const inds: PPiece[] = [];
        for (const sl of slots) {
          const cell = tuckedCell(lay, st);
          if (!cell) break;
          const ind: PPiece = { key: newKey(), kind: "indicator", sig: "indicator", x: cell.x, y: cell.y, rotation: 0, flipped: false, fp: { w: 1, h: 1 }, existing: false, step: s.step, stationKey: st.key, dimension: sl.dimension, slot: sl.slot };
          inds.push(ind);
          lay = lay.with(ind);
        }
        if (!inds.length) continue;
        if (invalidKeys(lay).length) continue;
        const gain = layoutValue(lay, inp) - base - CELL_COST * (fp.w * fp.h + inds.length) + 1.2 * taste(inp.seed, `${s.id}`) + 0.2 * taste(inp.seed, `${s.id}${at.x},${at.y}`);
        if (!best || gain > best.gain) best = { gain, pieces: [st, ...inds] };
      }
    }
  }
  return best;
}

// The free ring square around a piece with the most occupied neighbours: indicators tuck into
// corners instead of eating open floor.
function tuckedCell(l: Layout, p: PPiece): Cell | undefined {
  let best: { c: Cell; n: number } | undefined;
  for (const c of l.ring(p)) {
    if (!l.free(c.x, c.y)) continue;
    const n = NEIGHBOURS.filter((d) => !l.free(c.x + d.x, c.y + d.y)).length;
    if (!best || n > best.n) best = { c, n };
  }
  return best?.c;
}

// New indicators on stations already built (P3.19).
function bestUpgrade(l: Layout, inp: PlanInput, base: number): { gain: number; pieces: PPiece[] } | undefined {
  const access = new Set(inp.access);
  let best: { gain: number; pieces: PPiece[] } | undefined;
  for (const st of l.pieces.filter((p) => p.kind === "station")) {
    const have = l.pieces.filter((p) => p.kind === "indicator" && p.stationKey === st.key).map((p) => `${p.dimension}:${p.slot}`);
    for (const sl of station(st.stationId!).slots) {
      const k = `${sl.dimension}:${sl.slot}`;
      if (!access.has(k) || have.includes(k)) continue;
      const cell = tuckedCell(l, st);
      if (!cell) continue;
      const ind: PPiece = { key: newKey(), kind: "indicator", sig: "indicator", x: cell.x, y: cell.y, rotation: 0, flipped: false, fp: { w: 1, h: 1 }, existing: false, step: st.step, stationKey: st.key, dimension: sl.dimension, slot: sl.slot };
      const lay = l.with(ind);
      if (invalidKeys(lay).length) continue;
      const gain = layoutValue(lay, inp) - base - CELL_COST;
      if (!best || gain > best.gain) best = { gain, pieces: [ind] };
    }
  }
  return best;
}

// A department beside the factory (marketing beside a dealer, P3.9).
function bestDepartment(l: Layout, inp: PlanInput, t: DepartmentType, base: number): { gain: number; pieces: PPiece[] } | undefined {
  const dfp = department(t).footprint;
  let best: { gain: number; pieces: PPiece[]; tie: number } | undefined;
  for (const rot of rotations(dfp)) {
    const fp = rotatedFootprint(dfp, rot);
    for (const at of positions(l, fp, true)) {
      const p: PPiece = { key: newKey(), kind: "department", sig: `dept:${t}`, x: at.x, y: at.y, rotation: rot, flipped: false, fp, existing: false, departmentType: t };
      const lay = l.with(p);
      if (invalidKeys(lay).length) continue;
      // Room beside the mainlines is where stations go: a department that eats it pays for it.
      const near = l.pieces.filter((q) => q.kind === "mainline").flatMap((m) => l.ring(m));
      const lost = room(l, near, 3) - room(lay, near, 3);
      const gain = layoutValue(lay, inp) - base - CELL_COST * fp.w * fp.h - (t === "marketing" ? 0.1 : 0.45) * lost;
      const tie = -lost;
      if (!best || gain > best.gain + 1e-9 || (Math.abs(gain - best.gain) < 1e-9 && tie > best.tie)) best = { gain, pieces: [p], tie };
    }
  }
  return best && { gain: best.gain, pieces: best.pieces };
}

// ------------------------------------------------------------------------------------------
// The plan: greedy, best gain first, until nothing is worth its floor space.
// ------------------------------------------------------------------------------------------
export function planFactory(inp: PlanInput): Plan {
  counter = 0;
  let l = new Layout(new Set(inp.floor), new Set(inp.bay), inp.pieces);
  const out: PPiece[] = [];
  const used: Record<string, number> = {};
  const take = (ps: PPiece[]) => {
    for (const p of ps) if (p.kind !== "indicator") used[p.sig] = (used[p.sig] ?? 0) + 1;
    out.push(...ps);
    l = l.with(...ps);
  };
  const left = (sig: string) => (inp.available[sig] ?? 0) - (used[sig] ?? 0);

  for (let guard = 0; guard < 24; guard++) {
    const base = layoutValue(l, inp);
    const options: { gain: number; pieces: PPiece[] }[] = [];

    // A production line: mainline + dealership, bundled with the stations that make it meet
    // the minimum specs (P4.9). A line that cannot sell this year is not worth its floor.
    const dealersBuilt = l.pieces.filter((p) => p.kind === "dealership").length;
    const freeDealer = [0, 1, 2].find((i) => left(`dealership:${i}`) > 0);
    // Fix the lines you have before opening another: a dealer short of a minimum sells nothing.
    const behind = l.pieces.some((p) => p.kind === "dealership" && missingFor(l, inp, p) > 0);
    if (!behind && freeDealer !== undefined && dealersBuilt < 3 && inp.year <= 5 && (dealersBuilt === 0 || inp.capacity >= 2 || inp.year >= 3)) {
      const types = [...carTypes].filter((t) => left(`mainline:${t}`) > 0).sort((a, b) => (inp.demand[b] ?? 0) + (b === "car" ? 3 : 0) - ((inp.demand[a] ?? 0) + (a === "car" ? 3 : 0)));
      const type = types[0];
      if (type) {
        const pair = bestPair(l, inp, type, freeDealer);
        if (pair) {
          let lay = l.with(...pair);
          const bundle = [...pair];
          const u2 = { ...used };
          for (const p of pair) u2[p.sig] = (u2[p.sig] ?? 0) + 1;
          for (let i = 0; i < 6 && missingFor(lay, inp, pair[1]) > 0; i++) {
            const st = bestStation(lay, inp, layoutValue(lay, inp), u2);
            if (!st || st.gain <= 0) break;
            for (const p of st.pieces) if (p.kind !== "indicator") u2[p.sig] = (u2[p.sig] ?? 0) + 1;
            bundle.push(...st.pieces);
            lay = lay.with(...st.pieces);
          }
          if (!invalidKeys(lay).length && missingFor(lay, inp, pair[1]) === 0) {
            const yearsLeft = Math.max(0, 7 - inp.year);
            const worth = dealersBuilt === 0 ? 60 : 4 + 2 * inp.capacity + Math.min(4, yearsLeft);
            options.push({ gain: worth + (layoutValue(lay, inp) - base), pieces: bundle });
          }
        }
      }
    }
    const st = bestStation(l, inp, base, used);
    if (st) options.push(st);
    const up = bestUpgrade(l, inp, base);
    if (up) options.push(up);
    for (const t of ["marketing", "research", "planning"] as DepartmentType[]) {
      if (left(`dept:${t}`) <= 0) continue;
      const d = bestDepartment(l, inp, t, base);
      if (d) options.push(d);
    }
    options.sort((a, b) => b.gain - a.gain);
    const pick = options[0];
    if (!pick || pick.gain <= 0.25) break;
    take(pick.pieces);
  }
  return { pieces: out };
}

// The two starting departments (S10): tucked beside the bay, out of the way of the open floor.
export function planSetup(inp: PlanInput): Plan {
  counter = 0;
  const l = new Layout(new Set(inp.floor), new Set(inp.bay), []);
  const research = department("research").footprint;
  const planning = department("planning").footprint;
  let best: { score: number; pieces: PPiece[] } | undefined;
  for (const ra of positions(l, research, true)) {
    const r: PPiece = { key: "r", kind: "department", sig: "dept:research", x: ra.x, y: ra.y, rotation: 0, flipped: false, fp: research, existing: false, departmentType: "research" };
    const l1 = l.with(r);
    for (const rot of rotations(planning)) {
      const fp = rotatedFootprint(planning, rot);
      for (const pa of positions(l1, fp, true)) {
        const p: PPiece = { key: "p", kind: "department", sig: "dept:planning", x: pa.x, y: pa.y, rotation: rot, flipped: false, fp, existing: false, departmentType: "planning" };
        const l2 = l1.with(p);
        if (invalidKeys(l2).length) continue;
        // The largest open area left: count free squares reachable from the bay's edge.
        const gate = [...l.bay].flatMap((k) => { const [x, y] = k.split(",").map(Number); return NEIGHBOURS.map((d) => ({ x: x + d.x, y: y + d.y })); });
        const score = room(l2, [...gate, ...l2.ring(r), ...l2.ring(p)], 30) - 0.01 * (Math.abs(ra.x - pa.x) + Math.abs(ra.y - pa.y));
        if (!best || score > best.score) best = { score, pieces: [r, p] };
      }
    }
  }
  return { pieces: best?.pieces ?? [] };
}
