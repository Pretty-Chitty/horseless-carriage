import { Turn } from "@pretty-chitty/core";
import { Root } from "../chits/Root";
import { Player } from "../chits/Player";
import { FactoryTile } from "../chits/FactoryTile";
import { Dimension, dimensions, GANTT_MAX, GANTT_PUNCH_CLOCK, windowSizeFor, WindowSize, CarType } from "../consts";
import { Factory } from "../chits/Factory";
import { MarketBoard } from "../chits/MarketBoard";

// P4.4–P4.9: what a dealership would publish from the factory as it stands. Phase 4 and the
// player aid both read it, so the aid can never disagree with the brochure.
export function dealerBrochure(f: Factory, dealer: FactoryTile, market: MarketBoard): { specs: Record<Dimension, number>; size: WindowSize | "none"; types: CarType[]; marketing: number; mainlines: number } {
  const mains = f.adjacentPieces(dealer).filter((p): p is FactoryTile => p instanceof FactoryTile && p.kind === "mainline");
  const specs = {} as Record<Dimension, number>;
  for (const d of dimensions) specs[d] = mains.length ? Math.min(...mains.map((m) => f.mainlineSpec(m, d))) : 0; // P4.5, P4.6
  const marketing = f.adjacentPieces(dealer).filter((p) => p instanceof FactoryTile && p.kind === "department" && p.departmentType === "marketing").length;
  const meetsMinimums = dimensions.every((d) => specs[d] >= market.minSpec(d)); // P4.9
  const size = mains.length && meetsMinimums ? windowSizeFor(marketing) : "none"; // P4.8
  return { specs, size, types: [...new Set(mains.map((m) => m.carType!))], marketing, mainlines: mains.length };
}

type T = Turn<any, Player, Root>;

// Phase 4 — Print sales brochures (RULES.md P4). Admin: no decisions.
export async function executePrintBrochures(root: Root, turn: T): Promise<void> {
  const office = root.office;
  for (const player of root.players.copy()) {
    const f = player.factory;
    // P4.2 / P4.3: one Gantt chart per planning department; crossing 10 punches the clock.
    const planning = f.placedTiles().filter((t) => t.kind === "department" && t.departmentType === "planning").length;
    const before = player.gantt.value;
    const after = Math.min(GANTT_MAX, before + planning);
    if (before < GANTT_PUNCH_CLOCK && after >= GANTT_PUNCH_CLOCK) root.clock.punch();
    if (after !== before) {
      office.moveTo("gantt", player.playerId, after);
      player.gantt.value = after;
    }
    // P4.4–P4.9: publish each dealership's specs and window size.
    const notes: string[] = [];
    for (const dealer of f.placedTiles().filter((t) => t.kind === "dealership")) {
      const b = dealerBrochure(f, dealer, root.market);
      dealer.publishedSpecs = b.specs;
      dealer.publishedSize = b.size;
      const specText = dimensions.filter((d) => b.specs[d] > 0).map((d) => `${b.specs[d]} ${d}`).join(", ") || "no specs";
      const short = dimensions.filter((d) => b.specs[d] < root.market.minSpec(d));
      notes.push(b.size === "none" ? `${dealer.label()} cannot sell this year${short.length ? ` (short of ${short.join(", ")})` : ""}` : `${dealer.label()} offers ${specText} with a ${{ S: "small", M: "medium", L: "large" }[b.size]} window`);
    }
    turn.log(`${player.logKey} gains ${planning} Gantt chart${planning === 1 ? "" : "s"} (${after})${notes.length ? `; ${notes.join("; ")}` : ""}`);
    turn.flush();
  }
}
