// A text picture of the Horseless Carriage table for the tutorial harness: what a narrator needs to
// know (and what a replay comparison fingerprints). Plain words, so a trace reads like the board.
import type { Root } from "../../src/chits/Root";
import type { Player } from "../../src/chits/Player";
import { carTypes, dimensions } from "../../src/consts";

export function describePlayer(root: Root, p: Player): string {
  const f = p.factory;
  const tiles = f.placedTiles().map((t) => `${t.label()}@${t.x},${t.y}r${t.rotation}${t.flipped ? "f" : ""}${t.committed ? "" : "*"}`);
  const inds = f.indicators.copy().map((i) => `${i.dimension}${i.slot}@${i.x},${i.y}`);
  const dealers = f.placedTiles().filter((t) => t.kind === "dealership").map((d) => `${d.label()} ${d.publishedSize} ${dimensions.filter((x) => d.publishedSpecs[x]).map((x) => x.slice(0, 3) + d.publishedSpecs[x]).join(",")}`);
  return [
    `${p.name} (${p.playerColor}): $${p.wealth.value}, Gantt ${p.gantt.value}, capacity ${p.capacity.value}, focus ${root.office.focusSlot(p.playerId) ?? "-"} (hist ${root.office.historicalSlot(p.playerId) ?? "-"}), expansions ${f.expansionsPlaced}/${f.expansionsLeft}, hand ${p.hand.cards.length}`,
    `  floors: ${f.floors.copy().map((fl) => `${fl.kind}@${fl.x},${fl.y}r${fl.rotation}${fl.committed ? "" : "*"}`).join(" ")}`,
    `  tiles: ${tiles.join(" ") || "-"}`,
    `  indicators: ${inds.join(" ") || "-"}; dealers: ${dealers.join("; ") || "-"}`,
    `  research: ${root.allTracks().map((t) => `${t.dimension.slice(0, 3)}${t.positionOf(p.playerId)}`).join(" ")}`,
    `  reach: ${root.market.reach.filter((z) => z.playerId === p.playerId).map((z) => `${z.dealerIndex}:${z.cols}x${z.rows}`).join(" ")}`,
  ].join("\n");
}

export function describeTable(root: Root, me: Player): string {
  const m = root.market;
  const buyers = m.niches.copy().filter((n) => n.buyers.length).map((n) => `${n.row},${n.col}:${carTypes.map((t) => n.buyersOf(t).length ? `${n.buyersOf(t).length}${t[0]}` : "").join("")}`);
  const sparks = m.niches.copy().filter((n) => n.sparks.length).map((n) => `${n.row},${n.col}:${carTypes.map((t) => n.sparksOf(t) ? `${n.sparksOf(t)}${t[0]}` : "").join("")}`);
  return [
    `year ${root.year} phase ${root.playerAid.phase}; axes ${m.bottomTrack?.dimension}${m.bottomAxis.min} (bottom) / ${m.leftTrack?.dimension}${m.leftAxis.min} (left); off-board ${root.research.offBoard.copy().map((t) => t.dimension).join(",")}; minimums ${dimensions.filter((d) => m.minSpec(d)).map((d) => d + m.minSpec(d)).join(",") || "-"}; timecard ${root.clock.timecardValue()}${root.clock.timecardFlipped() ? " FLIPPED" : ""}`,
    `  prices ${[1, 2, 3, 4].map((s) => `seg${s}:${m.segmentPrice(s as 1) ?? "-"}`).join(" ")}; buyers ${buyers.join(" ") || "-"}; sparks ${sparks.join(" ") || "-"}`,
    ...root.players.copy().map((p) => describePlayer(root, p)),
    `  me: ${me.name}`,
  ].join("\n");
}
