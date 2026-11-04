// Log wording shared by the phases: cars as their icons (Game.tokenMap), counted, never listed
// one by one (developer request: "3 :car: in quadrant I").
import type { CarType } from "./consts";

export const QUADRANT_NAME = ["I", "II", "III", "IV"];

/** "3 :car:" — a count and the car type's icon. */
export function cars(n: number, type: CarType): string {
  return `${n} :${type}:`;
}

/** Counts by type, in a fixed order: "2 :car: and 1 :truck:". */
export function carCounts(counts: Partial<Record<CarType, number>>): string {
  return (["car", "sports", "truck"] as CarType[]).filter((t) => (counts[t] ?? 0) > 0).map((t) => cars(counts[t]!, t)).join(" and ");
}

/** Counts by quadrant and type: "3 :car: in quadrant I, 1 :car: in quadrant II". */
export function byQuadrant(items: { quadrant: number; type: CarType; n: number }[]): string {
  const m = new Map<number, Partial<Record<CarType, number>>>();
  for (const it of items) {
    const c = m.get(it.quadrant) ?? {};
    c[it.type] = (c[it.type] ?? 0) + it.n;
    m.set(it.quadrant, c);
  }
  return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([q, c]) => `${carCounts(c)} in quadrant ${QUADRANT_NAME[q - 1]}`).join(", ");
}
