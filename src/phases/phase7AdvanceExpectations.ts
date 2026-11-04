import { Turn } from "@pretty-chitty/core";
import { Root } from "../chits/Root";
import { Player } from "../chits/Player";
import { dimensionLabel } from "../consts";
import { syncAllReach } from "../reach";

type T = Turn<any, Player, Root>;

// Phase 7 — Advance expectations (RULES.md P7). Admin: no decisions.
export async function executeAdvanceExpectations(root: Root, turn: T): Promise<void> {
  const market = root.market;
  const side = market.obsolescence;
  const leaving = side === "bottom" ? market.bottomTrack! : market.leftTrack!;

  // P7.2: the track goes under the off-board ones; its axis comes off.
  root.research.offBoard.add(leaving);
  if (side === "bottom") market.bottomTrack = undefined;
  else market.leftTrack = undefined;
  // P7.3, P7.4, P7.5: minimum spec up one, innovation indicator forward one.
  market.raiseMinSpec(leaving.dimension);
  leaving.minSpec = market.minSpec(leaving.dimension);
  leaving.innovation.get(0).position += 1;
  // P7.6: the pointer turns to the remaining active track.
  market.obsolescence = side === "bottom" ? "left" : "bottom";
  turn.log(`${dimensionLabel(leaving.dimension)} leaves the market; buyers now require at least ${leaving.minSpec} ${dimensionLabel(leaving.dimension).toLowerCase()}`);
  turn.flush();

  // P7.7–P7.9: the most innovative other off-board track comes in.
  const candidates = root.research.offBoard.filter((t) => t !== leaving);
  const scored = candidates.map((t, i) => ({ t, score: t.innovationScore(), reach: t.furthestMarker() - t.innovationPosition(), order: i }));
  scored.sort((a, b) => b.score - a.score || b.reach - a.reach || a.order - b.order);
  const entering = scored[0].t;
  // P7.10: onto the empty axis, which starts at the dimension's current minimum spec.
  if (side === "bottom") {
    market.bottomTrack = entering;
    market.bottomAxis.dimension = entering.dimension;
    market.bottomAxis.min = market.minSpec(entering.dimension);
  } else {
    market.leftTrack = entering;
    market.leftAxis.dimension = entering.dimension;
    market.leftAxis.min = market.minSpec(entering.dimension);
  }
  syncAllReach(root); // the axes moved, so every dealer's reach did too
  turn.log(`${dimensionLabel(entering.dimension)} enters the market with ${scored[0].score} innovation${scored.length > 1 ? ` (over ${scored.slice(1).map((s) => `${dimensionLabel(s.t.dimension)} ${s.score}`).join(", ")})` : ""}`);
  turn.flush();
}
