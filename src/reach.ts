// The dealership reach overlay (ReachZone): which niches each dealership could cover with its
// window if the brochures were printed now. Read through dealerBrochure (P4.4–P4.9) and the
// axes (M4), so it can never disagree with what phase 5 will allow.
import type { Root } from "./chits/Root";
import type { Player } from "./chits/Player";
import { BOARD_SIZE, dimensions } from "./consts";
import { dealerBrochure } from "./phases/phase4PrintBrochures";
import { SpecCube } from "./chits/SpecCube";
import type { FactoryTile } from "./chits/FactoryTile";
import type { Dimension } from "./consts";

// The dealer's cubes (P4.4) match its specs: new ones rise out of the tile (parentFallback), spare
// ones sink back into it, and the rest shuffle into rows in dimension order.
function syncCubes(dealer: FactoryTile, specs: Record<Dimension, number>): void {
  const p = dealer.printedFootprint();
  for (const d of dimensions) {
    const have = dealer.cubes.filter((c) => c.dimension === d);
    for (let i = have.length; i < specs[d]; i++)
      dealer.cubes.add(new SpecCube().set((c) => { c.dimension = d; c.tileW = p.w; c.tileH = p.h; c.slot = 99; c.parentFallback = dealer; }));
    for (const c of have.slice(specs[d])) { c.parentFallback = dealer; c.removeFromParent(); }
  }
  let slot = 0;
  for (const d of dimensions) for (const c of dealer.cubes.filter((x) => x.dimension === d)) { if (c.slot !== slot) c.slot = slot; slot++; }
}

export function reachZones(root: Root, player: Player) {
  return root.market.reach.filter((z) => z.playerId === player.playerId);
}

export function syncReach(root: Root, player: Player): void {
  const m = root.market;
  const shown = new Set<string>(); // a player's dealers with the same reach show one rectangle, not a darker stack
  for (const z of reachZones(root, player)) {
    const dealer = player.factory.placedTiles().find((t) => t.kind === "dealership" && t.dealerIndex === z.dealerIndex);
    let cols = 0;
    let rows = 0;
    if (dealer) {
      const b = dealerBrochure(player.factory, dealer, m);
      syncCubes(dealer, b.specs);
      if (b.size !== "none") {
        // Column c asks bottom-axis min + floor((c-1)/2); row r (from the bottom) asks left-axis min + floor((r-1)/2).
        const reach = (spec: number, min: number) => Math.max(0, Math.min(BOARD_SIZE, 2 * (spec - min + 1)));
        cols = m.bottomTrack ? reach(b.specs[m.bottomAxis.dimension], m.bottomAxis.min) : BOARD_SIZE;
        rows = m.leftTrack ? reach(b.specs[m.leftAxis.dimension], m.leftAxis.min) : BOARD_SIZE;
      }
    }
    if (cols && rows) {
      const key = `${cols}x${rows}`;
      if (shown.has(key)) cols = rows = 0;
      else shown.add(key);
    }
    if (z.hidden) z.hidden = false;
    if (z.cols !== cols) z.cols = cols;
    if (z.rows !== rows) z.rows = rows;
  }
}

export function syncAllReach(root: Root): void {
  for (const p of root.players.copy()) syncReach(root, p);
}
