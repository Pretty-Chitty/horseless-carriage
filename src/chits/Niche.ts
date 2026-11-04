import { BoxGeometry, Mesh, MeshPhongMaterial, PlaneGeometry } from "three";
import { Chit, ChitRenderSpec, Ordered, OrderedOutlet } from "@pretty-chitty/core";
import { BOARD_THICKNESS, TILE_THICKNESS, outlineFor, CarType, carTypeHex, carTypeLabel, NICHE, quadrantOf, segmentOf, COLOR_SELECTED } from "../consts";
import { NicheFace } from "../canvas/NicheFace";
import { carGeometry, carWoodHex } from "../svg";
import { SparkFace } from "../canvas/SparkFace";
import { MarketBoard } from "./MarketBoard";

// A car meeple (C18): a buyer while it stands on a niche. An extruded silhouette in the
// type's colour, lying flat with its outline up as the wooden piece does on the board.
export class Car extends Chit {
  // Not `type`: that is the engine's own (Chit.type, never sent to the players' views), so every
  // buyer reached the browser as a plain car whatever it was.
  carType: CarType = "car";

  override functionallyIdentical(): boolean {
    return false;
  }

  render(spec: ChitRenderSpec): void {
    spec.object = new Mesh(carGeometry(this.carType), new MeshPhongMaterial({ color: carWoodHex[this.carType] }));
    spec.object.castShadow = true;
    spec.offsetZ = 0.001; // standing on the niche
    spec.highlight.color = outlineFor(carWoodHex[this.carType]);
    if (!(this.parent instanceof Niche)) {
      // Sold, standing on the mainline that built it (P5.10): a row across the tile's middle,
      // wrapping to a second row.
      spec.offsetZ = TILE_THICKNESS / 2;
      spec.splay.enabled = true;
      spec.splay.rows = 2;
      spec.splay.columns = 3;
      spec.splay.itemWidth = 1;
      spec.splay.itemHeight = 0.7;
      spec.summary = `A ${carTypeLabel(this.carType)} sold this year from this mainline.`;
      return;
    }
    if (this.parent instanceof Niche) {
      // Four buyers in a 2×2 block; a fifth and beyond stack on top of those (splay wraps
      // into Z once rows × columns are full).
      spec.splay.enabled = true;
      spec.splay.rows = 2;
      spec.splay.columns = 2;
      spec.splay.itemWidth = 0.88;
      spec.splay.itemHeight = 0.5;
      spec.splay.spacingMultiplier = 1;
    }
    spec.summary = `A ${carTypeLabel(this.carType)} buyer.`;
  }
}

// A spark marker (C32): generates one buyer of its type each year, up to the cap (P8.7).
export class Spark extends Chit {
  carType: CarType = "car"; // not `type` (see Car)
  count: 1 | 2 = 1;

  override functionallyIdentical(): boolean {
    return false;
  }

  render(spec: ChitRenderSpec): void {
    // The spark counter as printed: one or two white cars on the type's colour, drawn.
    const face = new SparkFace().set((f) => { f.type = this.carType; f.count = this.count; }).material;
    const side = new MeshPhongMaterial({ color: carTypeHex(this.carType) });
    spec.object = new Mesh(new BoxGeometry(0.5, 0.5, 0.06), [side, side, side, side, face, side]);
    spec.offsetZ = 0.001; // lying on the niche
    spec.highlight.color = outlineFor(carTypeHex(this.carType));
    if (this.parent instanceof Niche) {
      spec.splay.enabled = true; // sparks in a short row in the niche's bottom-right corner
      spec.splay.rows = 1;
      spec.splay.columns = 3;
      spec.splay.columnOrientation = "decreasing";
      spec.splay.itemWidth = 0.45;
    }
    spec.summary = `${this.count} ${carTypeLabel(this.carType)} spark${this.count > 1 ? "s" : ""}: adds up to ${this.count} ${carTypeLabel(this.carType)} buyer${this.count > 1 ? "s" : ""} here each year, to a maximum of ${2 * this.count}.`;
  }
}

// One market niche (C4): knows its quadrant and price segment, holds buyers and sparks, and
// is the thing a player clicks to sell or to anchor a market window.
export class Niche extends Chit {
  row = 1; // 1 at the top
  col = 1; // 1 at the left
  highlighted = false;
  price = 0; // the segment's price marker, shown on this niche if it is the home niche
  @Ordered buyers = new OrderedOutlet<Car>();
  @Ordered sparks = new OrderedOutlet<Spark>();

  override functionallyIdentical(): boolean {
    return false;
  }

  quadrant() {
    return quadrantOf(this.row, this.col);
  }
  segment() {
    return segmentOf(this.row, this.col);
  }
  buyersOf(type: CarType): Car[] {
    return this.buyers.filter((c) => c.carType === type);
  }
  sparksOf(type: CarType): number {
    return this.sparks.filter((s) => s.carType === type).reduce((n, s) => n + s.count, 0);
  }

  render(spec: ChitRenderSpec): void {
    const seg = this.segment();
    const material = new NicheFace().set((f) => { f.row = this.row; f.col = this.col; f.price = this.price; }).material;
    // The crop covers the niche and its share of the gutters, so the niches tile the grid.
    spec.object = new Mesh(new PlaneGeometry(NICHE, NICHE), material);
    spec.object.receiveShadow = true;
    spec.offsetX = MarketBoard.nicheX(this.col);
    spec.offsetY = MarketBoard.nicheY(this.row);
    spec.offsetZ = BOARD_THICKNESS / 2 + 0.001; // printed on the top face of the board
    spec.offsetSpeed = 0;
    // Buyers in a 2×2 block in the upper part; sparks in a row along the bottom edge, from
    // the right. Neither block reaches the other.
    spec.setOutletPosition("buyers", 0, 0.22, 0);
    spec.setOutletPosition("sparks", 0.55, -0.7, 0);
    if (this.highlighted) {
      spec.highlight.color = COLOR_SELECTED;
      spec.highlight.clickColor = COLOR_SELECTED;
    }
    const board = this.parent instanceof MarketBoard ? this.parent : undefined;
    const req = board?.requirementText(this.row, this.col) ?? "";
    spec.summary = `Niche row ${this.row}, column ${this.col} — quadrant ${["I", "II", "III", "IV"][this.quadrant() - 1]}, segment ${seg} ($${board?.segmentPrice(seg) ?? "–"}). Requires ${req}. ${this.buyers.length} buyer${this.buyers.length === 1 ? "" : "s"}.`;
    spec.shortSummary = `niche ${this.row},${this.col}`;
    spec.showDetailsOnLongPress = true;
  }
}
