import { setupTable } from "../table";
import * as icons from "../assets/icons";
import { Mesh, MeshPhongMaterial, BoxGeometry, Vector3 } from "three";
import { StaticImage, CameraSpec, Chit, ChitRenderSpec, ChildOutlet, Ordered, OrderedOutlet, PanelTab } from "@pretty-chitty/core";
import { MARKET_EDGE, TABLE_Z, BOARD_THICKNESS, AXIS_HEIGHT, BOARD_SIZE, NICHE, TRACK_HEIGHT, COLOR_PAPER, Dimension, dimensions, dimensionLabel, PRICE_MARKERS, Segment, segmentOf, WindowSize, WINDOW_DIMENSIONS } from "../consts";
import { ResearchTrack } from "./ResearchTrack";
import { boardArt } from "../art";
import { Niche } from "./Niche";
import { MarketWindow, MinSpecMarker, ObsolescenceMarker, QuadrantTarget, SpecAxis, WindowTarget } from "./MarketPieces";
import { Card, NeutralDeck } from "./Card";
import { ReachZone } from "./ReachZone";
import type { PlayerColor } from "../consts";


// The niches that carry their segment's price: the band's middle anti-diagonal, every other
// niche where that diagonal is long, so each band shows two or three labels.
const LABEL_DIAGONAL: Record<Segment, number> = { 1: 1, 2: 5, 3: 9, 4: 13 };
function showsPrice(row: number, col: number): boolean {
  const d = BOARD_SIZE - row + (col - 1);
  const diag = LABEL_DIAGONAL[segmentOf(row, col)];
  if (d !== diag) return false;
  const length = Math.min(d, 14 - d) + 1;
  return length <= 3 || col % 2 === 1;
}
export const BOTTOM_TRACK_Y = -MARKET_EDGE - AXIS_HEIGHT - TRACK_HEIGHT / 2 - 0.4;
// Boards are looked at from nearly straight above: a flat board fills its panel and nothing
// on it hides behind a piece in front.
export const BOARD_TILT = -0.2; // the engine's default is -0.5
export const LEFT_TRACK_X = -MARKET_EDGE - AXIS_HEIGHT - TRACK_HEIGHT / 2 - 0.4;

// LAYOUT.md §4 "Market": the 8×8 board (C4–C6), the two active research tracks along its
// bottom and left edges with their spec axes (C7–C11), price markers, windows, buyers and
// sparks. Everything a niche requires is read from here (C19).
export class MarketBoard extends Chit {
  @ChildOutlet(new Vector3(0, BOTTOM_TRACK_Y, -BOARD_THICKNESS / 2)) bottomTrack?: ResearchTrack;
  @ChildOutlet(new Vector3(LEFT_TRACK_X, 0, -BOARD_THICKNESS / 2)) leftTrack?: ResearchTrack;
  @ChildOutlet bottomAxis = new SpecAxis().set((a) => (a.side = "bottom"));
  @ChildOutlet leftAxis = new SpecAxis().set((a) => (a.side = "left"));
  @Ordered niches = new OrderedOutlet<Niche>();
  // C5 / P8.10: the price each segment pays this year (0 = no marker: segment empty).
  prices: Record<Segment, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  @Ordered windows = new OrderedOutlet<MarketWindow>();
  @Ordered reach = new OrderedOutlet<ReachZone>(); // per-dealership reach overlay (src/reach.ts; not in the physical game)
  @Ordered windowTargets = new OrderedOutlet<WindowTarget>();
  @Ordered played = new OrderedOutlet<Card>(); // face-down cards awaiting phase 8
  @Ordered quadrantTargets = new OrderedOutlet<QuadrantTarget>();
  @ChildOutlet neutralDeck = new NeutralDeck(); // C34, beside the board
  @Ordered minSpecs = new OrderedOutlet<MinSpecMarker>(); // C41: only dimensions with a minimum, beside the board
  @ChildOutlet obsolescenceMarker = new ObsolescenceMarker(); // C17, S4

  // C17, S4: which active track leaves next — held by the marker itself, which shows it.
  get obsolescence(): "bottom" | "left" {
    return this.obsolescenceMarker.side;
  }
  set obsolescence(side: "bottom" | "left") {
    if (this.obsolescenceMarker.side !== side) this.obsolescenceMarker.side = side;
  }

  public get panelTab(): PanelTab {
    return { icon: icons.marketIcon, color: "#2f7f86" };
  }

  // One reach overlay per dealership a player could build (C25), all empty until they sell.
  setupReach(players: { playerId: string; playerColor: PlayerColor; seat: number }[]): void {
    for (const p of players) for (const i of [0, 1, 2]) this.reach.add(new ReachZone().set((z) => { z.playerId = p.playerId; z.playerColor = p.playerColor; z.dealerIndex = i; z.seat = p.seat; }));
  }

  setup(): void {
    for (let row = 1; row <= BOARD_SIZE; row++) for (let col = 1; col <= BOARD_SIZE; col++) this.niches.add(new Niche().set((n) => { n.row = row; n.col = col; }));
    ([1, 2, 3, 4] as const).forEach((q) => this.quadrantTargets.add(new QuadrantTarget().set((t) => (t.quadrant = q))));
  }

  // World position of a niche centre (row 1 top, col 1 left) — M1.
  static nicheX(col: number): number {
    return (col - (BOARD_SIZE + 1) / 2) * NICHE;
  }
  static nicheY(row: number): number {
    return ((BOARD_SIZE + 1) / 2 - row) * NICHE;
  }

  niche(row: number, col: number): Niche {
    const n = this.niches.find((x) => x.row === row && x.col === col);
    if (!n) throw new Error(`no niche ${row},${col}`);
    return n;
  }
  inBounds(row: number, col: number): boolean {
    return row >= 1 && row <= BOARD_SIZE && col >= 1 && col <= BOARD_SIZE;
  }
  activeDimensions(): Dimension[] {
    return [this.bottomTrack?.dimension, this.leftTrack?.dimension].filter((d): d is Dimension => !!d);
  }
  // C19 / M4: what a buyer on this niche requires on every dimension. Active dimensions read
  // the axis; off-board dimensions require that dimension's minimum spec.
  minSpec(d: Dimension): number {
    return this.minSpecs.find((m) => m.dimension === d)?.value ?? 0;
  }
  raiseMinSpec(d: Dimension): void {
    const m = this.minSpecs.find((x) => x.dimension === d);
    if (m) m.value += 1; // P7.3 (uncapped, Q2/Q3)
    else this.minSpecs.add(new MinSpecMarker().set((x) => { x.dimension = d; x.value = 1; }));
  }
  requirement(row: number, col: number): Record<Dimension, number> {
    const out = {} as Record<Dimension, number>;
    for (const d of dimensions) out[d] = this.minSpec(d);
    if (this.bottomTrack) out[this.bottomTrack.dimension] = this.bottomAxis.valueAt(Math.floor((col - 1) / 2));
    if (this.leftTrack) out[this.leftTrack.dimension] = this.leftAxis.valueAt(Math.floor((BOARD_SIZE - row) / 2));
    return out;
  }
  requirementText(row: number, col: number): string {
    const parts: string[] = [];
    if (this.bottomTrack) parts.push(`${this.bottomAxis.valueAt(Math.floor((col - 1) / 2))} ${dimensionLabel(this.bottomTrack.dimension).toLowerCase()}`);
    if (this.leftTrack) parts.push(`${this.leftAxis.valueAt(Math.floor((BOARD_SIZE - row) / 2))} ${dimensionLabel(this.leftTrack.dimension).toLowerCase()}`);
    return parts.join(", ") || "nothing yet";
  }
  segmentPrice(seg: Segment): number | undefined {
    return this.prices[seg] || undefined;
  }
  // P8.10 (and S15): walk the segments from the dearest down; each non-empty one takes the
  // next highest marker; empty segments get none.
  repriceSegments(): void {
    const values = [...PRICE_MARKERS];
    const prices: Record<Segment, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const seg of [4, 3, 2, 1] as Segment[]) {
      if (!this.niches.some((n) => n.segment() === seg && n.buyers.length > 0)) continue;
      prices[seg] = values.shift() ?? 0;
    }
    this.prices = prices;
    // The marker is a loose tile: each time prices are set (setup and every phase 8, the only
    // times buyers arrive) it moves to an empty niche of its segment, so it never covers a buyer
    // or a spark (developer decision). Nearest the band's middle diagonal first, then the
    // diagonal's own label spots; a segment with no empty niche keeps it on the first of those.
    for (const n of this.niches.copy()) n.price = 0;
    for (const seg of [1, 2, 3, 4] as Segment[]) {
      if (!prices[seg]) continue;
      const band = this.niches.filter((n) => n.segment() === seg);
      const offDiagonal = (n: Niche) => Math.abs(BOARD_SIZE - n.row + (n.col - 1) - LABEL_DIAGONAL[seg]) * 2 + (showsPrice(n.row, n.col) ? 0 : 1);
      const empty = band.filter((n) => n.buyers.length === 0 && n.sparks.length === 0).sort((a, b) => offDiagonal(a) - offDiagonal(b));
      const spot = empty[0] ?? band.find((n) => showsPrice(n.row, n.col));
      if (spot) spot.price = prices[seg];
    }
  }

  // ---------------------------------------------------------------- windows (P5.4–P5.7)
  windowCells(row: number, col: number, size: WindowSize, vertical: boolean) {
    const d = WINDOW_DIMENSIONS[size];
    const w = vertical ? d.h : d.w;
    const h = vertical ? d.w : d.h;
    const out: { row: number; col: number }[] = [];
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) out.push({ row: row + r, col: col + c });
    return out;
  }
  // P5.5 / P5.6: every on-board niche inside the window must be within the dealer's specs,
  // and the window may overhang any edge. Every such placement is offered, each by its
  // top-left corner (which may lie off the board).
  validAnchors(specs: Record<Dimension, number>, size: WindowSize, vertical: boolean): { row: number; col: number }[] {
    const d = WINDOW_DIMENSIONS[size];
    const w = vertical ? d.h : d.w;
    const h = vertical ? d.w : d.h;
    const out: { row: number; col: number }[] = [];
    for (let row = 2 - h; row <= BOARD_SIZE; row++) {
      for (let col = 2 - w; col <= BOARD_SIZE; col++) {
        const on = this.windowCells(row, col, size, vertical).filter((c) => this.inBounds(c.row, c.col));
        if (on.length === 0) continue;
        const ok = on.every((c) => {
          const req = this.requirement(c.row, c.col);
          return dimensions.every((dim) => req[dim] <= specs[dim]);
        });
        if (ok) out.push({ row, col });
      }
    }
    return out;
  }
  windowsOf(playerId: string): MarketWindow[] {
    return this.windows.filter((w) => w.playerId === playerId && !w.staged);
  }
  // Drop targets for windows, pooled by geometry so repeated prompts reuse them.
  // Every spot a window could be dropped, made once at setup in a fixed order: a pool grown on
  // demand numbered its targets by whichever prompt asked first, so a recorded move ("target 3")
  // meant a different spot under different timings (the tutorial's pinned bot moves).
  setupWindowTargets(): void {
    const shapes = new Map<string, { w: number; h: number }>();
    for (const d of Object.values(WINDOW_DIMENSIONS)) for (const f of [d, { w: d.h, h: d.w }]) shapes.set(`${f.w}x${f.h}`, f);
    for (const { w, h } of shapes.values())
      for (let row = 2 - h; row <= BOARD_SIZE; row++) for (let col = 2 - w; col <= BOARD_SIZE; col++) this.windowTarget(row, col, w, h); // overhangs too (P5.6)
  }
  windowTarget(row: number, col: number, w: number, h: number): WindowTarget {
    let t = this.windowTargets.find((x) => x.row === row && x.col === col && x.w === w && x.h === h);
    if (!t) {
      t = new WindowTarget().set((x) => { x.row = row; x.col = col; x.w = w; x.h = h; });
      this.windowTargets.add(t);
    }
    return t;
  }

  render(spec: ChitRenderSpec): void {
    // The real board (the photo, straightened); niches carry their own crops on top of it.
    const edge = new MeshPhongMaterial({ color: COLOR_PAPER });
    const face = StaticImage.material(boardArt.market);
    const board = new Mesh(new BoxGeometry(2 * MARKET_EDGE, 2 * MARKET_EDGE, BOARD_THICKNESS), [edge, edge, edge, edge, face, edge]);
    board.receiveShadow = true;
    spec.object = board;
    spec.offsetZ = TABLE_Z; // its underside on the table
    setupTable(spec);

    spec.camera = new CameraSpec();
    spec.camera.paddingTop = 6;
    spec.camera.paddingBottom = 6;
    spec.camera.paddingLeft = 6;
    spec.camera.paddingRight = 6;
    spec.camera.verticalRadiansRotation = BOARD_TILT;
    spec.summary = "The car market: 8×8 niches, four price segments, two active research tracks on the axes. The black arrow disc marks the track that leaves the market at the end of the year.";
  }
}
