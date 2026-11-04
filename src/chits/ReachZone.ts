import { Mesh, MeshBasicMaterial, PlaneGeometry } from "three";
import { Chit, ChitRenderSpec } from "@pretty-chitty/core";
import { BOARD_SIZE, BOARD_THICKNESS, NICHE, playerHex, PlayerColor } from "../consts";
import { MarketBoard } from "./MarketBoard";

// Not a component of the physical game (developer request): an outline on the market, in the
// player's colour and otherwise transparent,
// showing the niches one dealership could cover with its window. Every reachable niche asks no
// more than the dealer's specs, and the requirement only grows up and to the right (M4), so the
// reach is always a rectangle from the bottom-left corner. Its size is stored here by
// `syncReach` (renders read only their own chit); a dealer that cannot sell shows nothing.
export class ReachZone extends Chit {
  playerId = "";
  playerColor: PlayerColor = "red";
  dealerIndex = 0;
  hidden = false; // the dealer's real window is on the board this sell phase
  seat = 0; // inset of the frame, so several players' rectangles stay distinct
  cols = 0; // reachable columns from the left, 0–8
  rows = 0; // reachable rows from the bottom, 0–8

  override functionallyIdentical(): boolean {
    return false;
  }

  render(spec: ChitRenderSpec): void {
    spec.worthSlidingToPanelToShowChange = false;
    spec.offsetSpeed = 0; // an outline, not a piece: it snaps to its new size, never slides (developer request)
    const visible = this.cols > 0 && this.rows > 0 && !this.hidden;
    const w = Math.max(this.cols, 0.01) * NICHE;
    const h = Math.max(this.rows, 0.01) * NICHE;
    const hex = playerHex(this.playerColor);
    const fill = new Mesh(new PlaneGeometry(w, h), new MeshBasicMaterial({ color: hex, transparent: true, opacity: 0, depthWrite: false }));
    spec.object = fill;
    if (visible) {
      // A thin frame in the player's colour (a 1-px line does not read; WebGL ignores line width).
      // Each player's frame is inset a little more, so rectangles that coincide stay apart.
      const inset = 0.06 + 0.14 * this.seat + 0.07 * this.dealerIndex;
      const t = 0.07;
      const iw = Math.max(t, w - 2 * inset);
      const ih = Math.max(t, h - 2 * inset);
      const mat = new MeshBasicMaterial({ color: hex, transparent: true, opacity: 0.85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
      for (const [bw, bh, x, y] of [[iw, t, 0, ih / 2 - t / 2], [iw, t, 0, -ih / 2 + t / 2], [t, ih, -iw / 2 + t / 2, 0], [t, ih, iw / 2 - t / 2, 0]] as const) {
        const bar = new Mesh(new PlaneGeometry(bw, bh), mat);
        bar.position.set(x, y, 0.0003);
        spec.ornaments.push(bar);
      }
    }
    spec.offsetX = MarketBoard.nicheX(1) - NICHE / 2 + w / 2;
    spec.offsetY = MarketBoard.nicheY(BOARD_SIZE) - NICHE / 2 + h / 2;
    // On the board, under the buyers and windows; each player's a hair apart so they never fight.
    // (above the niche crops, which lie at +0.001 and cover the whole board)
    // Clearly above the niche art (+0.001), which is too close for depth precision at table distance,
    // and staggered by player so coinciding outlines never fight; still under the buyers' bodies.
    spec.offsetZ = BOARD_THICKNESS / 2 + 0.004 + 0.0015 * this.seat + 0.0005 * this.dealerIndex;
    spec.summary = visible ? `The niches this dealership could reach with its window: ${this.cols} column${this.cols === 1 ? "" : "s"} by ${this.rows} row${this.rows === 1 ? "" : "s"}.` : "";
  }
}
