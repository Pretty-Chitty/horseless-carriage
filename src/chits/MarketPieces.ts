import { BoxGeometry, Group, Mesh, MeshPhongMaterial, PlaneGeometry } from "three";
import { Chit, ChitRenderSpec } from "@pretty-chitty/core";
import { MARKET_EDGE, BOARD_THICKNESS, TILE_THICKNESS, AXIS_HEIGHT, BOARD_SIZE, Dimension, dimensionHex, dimensionLabel, outlineFor, NICHE, playerHex, PlayerColor, WindowSize, WINDOW_DIMENSIONS, DEALERSHIP_NAMES, Quadrant, QUADRANTS, COLOR_SELECTED } from "../consts";
import { FrameBarFace } from "../canvas/FrameBarFace";
import { MinSpecFace } from "../canvas/MinSpecFace";
import { AxisFace } from "../canvas/AxisFace";
import { BOTTOM_TRACK_Y, LEFT_TRACK_X, MarketBoard } from "./MarketBoard";
import { ArrowFace } from "../canvas/ArrowFace";
import { discGeometry } from "../svg";
import { TRACK_LENGTH } from "./ResearchTrack";

// A spec axis strip (C7–C9, M4): four consecutive values from the dimension's minimum.
export class SpecAxis extends Chit {
  side: "bottom" | "left" = "bottom";
  dimension: Dimension = "range";
  min = 0;

  override functionallyIdentical(): boolean {
    return false;
  }

  valueAt(index: number): number {
    return this.min + index; // index 0..3 along the axis, low to high
  }

  render(spec: ChitRenderSpec): void {
    const len = BOARD_SIZE * NICHE;
    const face = new AxisFace().set((f) => {
      f.dimension = this.dimension;
      f.min = this.min;
      f.width = 2048;
      f.height = Math.round((2048 * AXIS_HEIGHT) / (BOARD_SIZE * NICHE)); // the strip's own proportions
    }).material;
    const side = new MeshPhongMaterial({ color: "#f7f5ee" });
    spec.object = new Mesh(new BoxGeometry(len, AXIS_HEIGHT, BOARD_THICKNESS * 0.6), [side, side, side, side, face, side]);
    const half = MARKET_EDGE;
    if (this.side === "bottom") {
      spec.offsetY = -half - AXIS_HEIGHT / 2 - 0.1;
    } else {
      spec.offsetX = -half - AXIS_HEIGHT / 2 - 0.1;
      spec.rotateZ = Math.PI / 2;
    }
    spec.offsetZ = -BOARD_THICKNESS / 2; // a strip lying on the table beside the board
    spec.summary = `${dimensionLabel(this.dimension)} axis: niches in each pair of ${this.side === "bottom" ? "columns" : "rows"} require ${[0, 1, 2, 3].map((i) => this.valueAt(i)).join(", ")} ${dimensionLabel(this.dimension).toLowerCase()}.`;
  }
}

// A market window (C30, C31, P5.4–P5.7): a frame of 2×1, 2×2 or 3×3 niches owned by one
// dealership, anchored at its top-left niche. Exists only while placed.
export class MarketWindow extends Chit {
  playerColor: PlayerColor = "green";
  playerId = "";
  dealerIndex: 0 | 1 | 2 = 0;
  size: WindowSize = "S";
  vertical = false; // P5.6: the 2×1 may stand on end
  row = 1;
  col = 1;
  seat = 0; // the owner's seat: each player's frames sit a hair apart, so coinciding ones both show
  stack = 0; // placed windows it lies across: a frame dropped over others rests on top of them
  // While the owner decides where it goes, a window waits above the board, ready to drag.
  staged = false;
  stageX = 0;

  override functionallyIdentical(): boolean {
    return false;
  }

  footprint() {
    const d = WINDOW_DIMENSIONS[this.size];
    return this.vertical ? { w: d.h, h: d.w } : { w: d.w, h: d.h };
  }
  cells(): { row: number; col: number }[] {
    const f = this.footprint();
    const out: { row: number; col: number }[] = [];
    for (let r = 0; r < f.h; r++) for (let c = 0; c < f.w; c++) out.push({ row: this.row + r, col: this.col + c });
    return out;
  }
  covers(row: number, col: number): boolean {
    const f = this.footprint();
    return row >= this.row && row < this.row + f.h && col >= this.col && col < this.col + f.w;
  }

  render(spec: ChitRenderSpec): void {
    const f = this.footprint();
    const w = f.w * NICHE;
    const h = f.h * NICHE;
    const hex = playerHex(this.playerColor);
    const name = DEALERSHIP_NAMES[this.playerColor][this.dealerIndex];
    // The cardboard frame (C30): an open rectangle in the player's colour with the dealer's
    // name printed along it. The clear middle is the hit area, so the frame can be grabbed
    // anywhere and buyers stay visible through it.
    spec.object = new Mesh(new PlaneGeometry(w, h), new MeshPhongMaterial({ transparent: true, opacity: 0 }));
    // Each side carries the city name reading along it, outward-facing, as printed.
    const bar = 0.26;
    const sides: { len: number; x: number; y: number; rot: number }[] = [
      { len: w, x: 0, y: h / 2 - bar / 2, rot: 0 },
      { len: h, x: w / 2 - bar / 2, y: 0, rot: -Math.PI / 2 },
      { len: w, x: 0, y: -h / 2 + bar / 2, rot: Math.PI },
      { len: h, x: -w / 2 + bar / 2, y: 0, rot: Math.PI / 2 },
    ];
    const edgeMat = new MeshPhongMaterial({ color: hex });
    for (const sd of sides) {
      const px = 100; // texels per world unit
      const face = new FrameBarFace().set((b) => { b.hex = hex; b.name = name; b.width = Math.round(sd.len * px); b.height = Math.round(bar * px); }).material;
      const m = new Mesh(new BoxGeometry(sd.len, bar, 0.05), [edgeMat, edgeMat, edgeMat, edgeMat, face, edgeMat]);
      m.position.set(sd.x, sd.y, 0.025 + (sd.rot === 0 || sd.rot === Math.PI ? 0.001 : 0)); // long sides over the short at the corners
      m.rotation.z = sd.rot;
      m.castShadow = true;
      spec.ornaments.push(m);
    }
    if (this.staged) {
      spec.offsetX = this.stageX + w / 2;
      spec.offsetY = (BOARD_SIZE * NICHE) / 2 + 0.8 + h / 2;
    } else {
      // Nudged diagonally by seat (developer request), never resized: two players' frames on the
      // same niches stay distinct, each edge just beside the other's.
      const nudge = 0.09 * this.seat;
      spec.offsetX = MarketBoard.nicheX(this.col) - NICHE / 2 + w / 2 + nudge;
      spec.offsetY = MarketBoard.nicheY(this.row) + NICHE / 2 - h / 2 - nudge;
    }
    // The frame lies on the board around the buyers, or on top of the frames it was dropped across.
    spec.offsetZ = BOARD_THICKNESS / 2 + 0.002 + (this.staged ? 0 : this.stack * 0.052);
    spec.showDetailsOnLongPress = true;
    spec.summary = this.staged
      ? `${name}'s ${this.size} market window (${f.w}×${f.h}). Drag it onto the board: it must sit where no niche inside asks for more than ${name}'s specs.`
      : `${name}'s ${this.size} market window (${f.w}×${f.h}). This dealer may sell to buyers inside it this year.`;
    spec.shortSummary = `${name} window`;
  }
}

// An invisible drop target the size of a market window, at one legal anchor (P5.5, P5.6).
export class WindowTarget extends Chit {
  row = 1;
  col = 1;
  w = 1;
  h = 1;

  override functionallyIdentical(): boolean {
    return false;
  }

  render(spec: ChitRenderSpec): void {
    // No size: the engine drops on the target whose centre is nearest, and ~200 of these stay on
    // the board all game (see DropTarget).
    spec.object = new Group();
    spec.offsetX = MarketBoard.nicheX(this.col) - NICHE / 2 + (this.w * NICHE) / 2;
    spec.offsetY = MarketBoard.nicheY(this.row) + NICHE / 2 - (this.h * NICHE) / 2;
    spec.offsetZ = BOARD_THICKNESS / 2 + 0.01;
    spec.offsetSpeed = 0;
    spec.worthSlidingToPanelToShowChange = false;
  }
}

// A clickable quadrant (P8.2): a translucent pane over the 4×4 block, shown only while a card
// is being placed.
export class QuadrantTarget extends Chit {
  quadrant: Quadrant = 1;
  active = false;

  override functionallyIdentical(): boolean {
    return false;
  }

  render(spec: ChitRenderSpec): void {
    const q = QUADRANTS.find((s) => s.quadrant === this.quadrant)!;
    spec.object = new Mesh(new PlaneGeometry(4 * NICHE - 0.2, 4 * NICHE - 0.2), new MeshPhongMaterial({ color: "#ffffff", transparent: true, opacity: this.active ? 0.25 : 0 }));
    spec.offsetX = MarketBoard.nicheX(q.col0) - NICHE / 2 + 2 * NICHE;
    spec.offsetY = MarketBoard.nicheY(q.row0) + NICHE / 2 - 2 * NICHE;
    spec.offsetZ = BOARD_THICKNESS / 2 + 0.006;
    spec.offsetSpeed = 0;
    if (this.active) {
      spec.highlight.color = COLOR_SELECTED;
      spec.highlight.clickColor = COLOR_SELECTED;
    }
    spec.summary = `Quadrant ${["I", "II", "III", "IV"][this.quadrant - 1]}.`;
    spec.shortSummary = `quadrant ${["I", "II", "III", "IV"][this.quadrant - 1]}`;
  }
}

// A minimum-spec marker (C41, P7.3): the small cardboard tile in the dimension's colour with
// its minimum, beside the market board's right edge, one under another. It exists only once
// the dimension has a minimum, so the column shows exactly the requirements that apply
// everywhere.
export const MINSPEC_TILE = 1.0;
export class MinSpecMarker extends Chit {
  dimension: Dimension = "speed";
  value = 0;
  render(spec: ChitRenderSpec): void {
    const w = MINSPEC_TILE;
    const face = new MinSpecFace().set((f) => { f.dimension = this.dimension; f.value = this.value; }).material;
    const side = new MeshPhongMaterial({ color: dimensionHex(this.dimension) });
    spec.object = new Mesh(new BoxGeometry(w, w, TILE_THICKNESS), [side, side, side, side, face, side]);
    spec.object.castShadow = true;
    spec.offsetX = MARKET_EDGE + 0.45 + w / 2;
    spec.offsetY = 3.4 - (this.parentOutletIndex ?? 0) * (w + 0.18);
    spec.offsetZ = -BOARD_THICKNESS / 2; // on the table beside the board
    spec.highlight.color = outlineFor(dimensionHex(this.dimension));
    spec.summary = `Minimum ${dimensionLabel(this.dimension).toLowerCase()}: every buyer on the market requires at least ${this.value}.`;
    spec.shortSummary = `Min ${dimensionLabel(this.dimension).toLowerCase()} ${this.value}`;
  }
}

// The obsolescence marker (C17, S4, P7.6): the black disc with the white arrow. It lies at the
// outer end of the active track that leaves the market at the end of the year, its arrow
// pointing along that track; phase 7 turns it to the other track.
export class ObsolescenceMarker extends Chit {
  side: "bottom" | "left" = "bottom";
  render(spec: ChitRenderSpec): void {
    spec.object = new Mesh(discGeometry(1.1, 0.12), [new ArrowFace().material, new MeshPhongMaterial({ color: "#161616" })]);
    spec.object.castShadow = true;
    // In the corner where the two active tracks meet (developer), pointing along the one that
    // leaves the market at the end of this year; it turns a quarter each year (P7.6). Set a
    // little out along the diagonal, clear of quadrant I's played cards at the board's corner.
    spec.offsetX = LEFT_TRACK_X - 0.3;
    spec.offsetY = BOTTOM_TRACK_Y - 0.3;
    spec.rotateZ = this.side === "bottom" ? -Math.PI / 2 : 0; // the arrow is printed pointing up
    spec.offsetZ = -BOARD_THICKNESS / 2; // on the table
    spec.highlight.color = outlineFor("#161616");
    spec.showDetailsOnLongPress = true;
    spec.summary = `The obsolescence marker: it points at the ${this.side === "bottom" ? "bottom" : "left"} research track, which leaves the market at the end of the year.`;
    spec.shortSummary = "Obsolescence marker";
  }
}
