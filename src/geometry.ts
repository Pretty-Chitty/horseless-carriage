// Pure grid geometry for the factory floor: rotation, footprints, adjacency and the
// manufacturing-zone flood fill (RULES.md P3.4, P3.13–P3.15, M13). No chits in here, so it
// can be reasoned about and tested on plain records.

import { Edge, Footprint, MAINLINE_SECTOR_EDGE, Step, steps } from "./consts";

export interface Cell {
  x: number;
  y: number;
}
export const cellKey = (x: number, y: number) => `${x},${y}`;

const EDGE_CYCLE: Edge[] = ["bottom", "right", "top", "left"]; // one CCW quarter turn each

// The edge that printed edge `e` ends up on after `rotation` CCW quarter turns.
export function rotateEdge(e: Edge, rotation: number): Edge {
  const i = EDGE_CYCLE.indexOf(e);
  return EDGE_CYCLE[(i + ((rotation % 4) + 4)) % 4];
}

// Footprint occupied on the grid after rotation: odd quarter turns swap width and height.
export function rotatedFootprint(f: Footprint, rotation: number): Footprint {
  return rotation % 2 === 0 ? { w: f.w, h: f.h } : { w: f.h, h: f.w };
}

export function cellsOf(x: number, y: number, f: Footprint): Cell[] {
  const out: Cell[] = [];
  for (let dy = 0; dy < f.h; dy++) for (let dx = 0; dx < f.w; dx++) out.push({ x: x + dx, y: y + dy });
  return out;
}

// Which edge of the rectangle at (x, y, f) a neighbouring outside cell touches, or undefined
// if the cell is not edge-adjacent to it.
export function edgeTouched(x: number, y: number, f: Footprint, n: Cell): Edge | undefined {
  const inX = n.x >= x && n.x < x + f.w;
  const inY = n.y >= y && n.y < y + f.h;
  if (inX && n.y === y - 1) return "top";
  if (inX && n.y === y + f.h) return "bottom";
  if (inY && n.x === x - 1) return "left";
  if (inY && n.x === x + f.w) return "right";
  return undefined;
}

// M13: the manufacturing step a mainline presents on a given edge. A flipped tile shows its
// mirrored back (B and C swapped); on the table it reads as that mirror image turned by the
// same counter-clockwise quarter turns as an unflipped tile (checked against a screenshot:
// a flipped car mainline at rotation 1 shows C top, D left, B bottom, A right).
const MIRROR: Record<Edge, Edge> = { top: "top", bottom: "bottom", left: "right", right: "left" };
export function mainlineStepOnEdge(edge: Edge, rotation: number, flipped = false): Step {
  for (const s of steps) {
    const printed = flipped ? MIRROR[MAINLINE_SECTOR_EDGE[s]] : MAINLINE_SECTOR_EDGE[s];
    if (rotateEdge(printed, rotation) === edge) return s;
  }
  throw new Error("unreachable: every edge carries a sector");
}

export const NEIGHBOURS: Cell[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

// ---------------------------------------------------------------------------------------------
// Zones. A zone is a connected area of one step's hatching made of stations, indicators and
// mainline *sides* (P3.13). Nodes: each station/indicator; each (mainline, edge). Two
// station/indicator nodes connect if edge-adjacent with the same step; a station/indicator
// connects to a mainline side if it is adjacent across that side and the side's step matches.
// ---------------------------------------------------------------------------------------------
export interface ZonePiece {
  id: string;
  kind: "station" | "indicator" | "mainline";
  step?: Step; // stations and indicators
  stationId?: string; // stations: for the uniqueness rule
  x: number;
  y: number;
  footprint: Footprint; // already rotated
  rotation: number; // mainlines: to map edges to sectors
  flipped?: boolean; // mainlines
}

export interface Zone {
  step: Step;
  pieceIds: string[]; // stations and indicators in the zone
  mainlineSides: { mainlineId: string; edge: Edge }[];
}

export function computeZones(pieces: ZonePiece[]): Zone[] {
  const byCell = new Map<string, ZonePiece>();
  for (const p of pieces) for (const c of cellsOf(p.x, p.y, p.footprint)) byCell.set(cellKey(c.x, c.y), p);

  const parent = new Map<string, string>();
  const find = (a: string): string => {
    if (!parent.has(a)) parent.set(a, a);
    let r = a;
    while (parent.get(r) !== r) r = parent.get(r)!;
    parent.set(a, r);
    return r;
  };
  const union = (a: string, b: string) => parent.set(find(a), find(b));
  const nodeStep = new Map<string, Step>();

  for (const p of pieces) {
    if (p.kind === "mainline") {
      for (const e of ["top", "right", "bottom", "left"] as Edge[]) {
        const n = `${p.id}:${e}`;
        find(n);
        nodeStep.set(n, mainlineStepOnEdge(e, p.rotation, p.flipped));
      }
      // P3.13 (Q17): a zone is a connected area of one hatching, so two mainline sides of the
      // same step that touch belong to one zone.
      for (const c of cellsOf(p.x, p.y, p.footprint))
        for (const d of NEIGHBOURS) {
          const n = { x: c.x + d.x, y: c.y + d.y };
          const q = byCell.get(cellKey(n.x, n.y));
          if (!q || q === p || q.kind !== "mainline") continue;
          const ep = edgeTouched(p.x, p.y, p.footprint, n);
          const eq = edgeTouched(q.x, q.y, q.footprint, c);
          if (ep && eq && mainlineStepOnEdge(ep, p.rotation, p.flipped) === mainlineStepOnEdge(eq, q.rotation, q.flipped)) union(`${p.id}:${ep}`, `${q.id}:${eq}`);
        }
      continue;
    }
    find(p.id);
    nodeStep.set(p.id, p.step!);
    for (const c of cellsOf(p.x, p.y, p.footprint)) {
      for (const d of NEIGHBOURS) {
        const q = byCell.get(cellKey(c.x + d.x, c.y + d.y));
        if (!q || q === p) continue;
        if (q.kind === "mainline") {
          // A piece overlapping the mainline (an invalid arrangement mid-turn) touches no edge.
          const edge = edgeTouched(q.x, q.y, q.footprint, c);
          if (edge && mainlineStepOnEdge(edge, q.rotation, q.flipped) === p.step) union(p.id, `${q.id}:${edge}`);
        } else if (q.step === p.step) {
          union(p.id, q.id);
        }
      }
    }
  }

  const groups = new Map<string, Zone>();
  for (const [node] of parent) {
    const root = find(node);
    const z = groups.get(root) ?? { step: nodeStep.get(node)!, pieceIds: [], mainlineSides: [] };
    const colon = node.indexOf(":");
    if (colon >= 0) z.mainlineSides.push({ mainlineId: node.slice(0, colon), edge: node.slice(colon + 1) as Edge });
    else z.pieceIds.push(node);
    groups.set(root, z);
  }
  // A mainline side with nothing attached is not a zone anyone cares about.
  return [...groups.values()].filter((z) => z.pieceIds.length > 0);
}

// Cells outside a rectangle along one of its edges, one deep, as wide as the rectangle:
// the strip a loading bay's keep-clear line governs (P3.23).
export function stripOutside(x: number, y: number, f: Footprint, edge: Edge): Cell[] {
  switch (edge) {
    case "top":
      return Array.from({ length: f.w }, (_, i) => ({ x: x + i, y: y - 1 }));
    case "bottom":
      return Array.from({ length: f.w }, (_, i) => ({ x: x + i, y: y + f.h }));
    case "left":
      return Array.from({ length: f.h }, (_, i) => ({ x: x - 1, y: y + i }));
    case "right":
      return Array.from({ length: f.h }, (_, i) => ({ x: x + f.w, y: y + i }));
  }
}

// Rotate a sub-rectangle (the bay) inside a tile of printed size `tile` by `rotation` CCW
// quarter turns, returning its new top-left and footprint in the rotated tile's frame.
export function rotateRect(tile: Footprint, r: { x: number; y: number; w: number; h: number }, rotation: number) {
  let { x, y, w, h } = r;
  let tw = tile.w;
  let th = tile.h;
  for (let i = 0; i < ((rotation % 4) + 4) % 4; i++) {
    // CCW: (x, y) → (y, tw - x - w); size swaps; tile size swaps.
    const nx = y;
    const ny = tw - x - w;
    x = nx;
    y = ny;
    [w, h] = [h, w];
    [tw, th] = [th, tw];
  }
  return { x, y, w, h };
}
