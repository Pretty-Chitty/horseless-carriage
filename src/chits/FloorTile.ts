import { BoxGeometry, Mesh, MeshPhongMaterial } from "three";
import { Chit, ChitRenderSpec } from "@pretty-chitty/core";
import { FloorFace } from "../canvas/FloorFace";
import { TABLE_Z, FLOOR_THICKNESS, FACTORY_OFFSET_SPEED, COLOR_INVALID, COLOR_SELECTED, EXPANSION_FLOOR, FloorSpec, MAIN_FLOOR, BASE_SIZE, Footprint, Edge } from "../consts";
import { Cell, cellsOf, rotatedFootprint, rotateEdge, rotateRect, stripOutside } from "../geometry";
import { Factory } from "./Factory";

const MIRROR: Record<Edge, Edge> = { top: "top", bottom: "bottom", left: "right", right: "left" };

// A factory floor tile (M9, M10): black buildable squares with a printed loading bay and the
// bay's keep-clear line along one outer edge. x/y is the top-left in factory squares. An
// expansion is placed during the build turn (P3.21) and stays provisional — movable, and not
// yet buildable — until the build is committed.
export class FloorTile extends Chit {
  kind: "main" | "expansion" = "main";
  x = 0;
  y = 0;
  rotation = 0; // CCW quarter turns
  flipped = false; // laid the other way up: the bay and its keep-clear line mirror left/right
  committed = true; // false for this year's expansion until the build is confirmed
  selected = false;
  problems: string[] = [];

  override functionallyIdentical(): boolean {
    return false;
  }

  spec(): FloorSpec {
    return this.kind === "main" ? MAIN_FLOOR : EXPANSION_FLOOR;
  }
  printedFootprint(): Footprint {
    const s = this.spec();
    return { w: s.w, h: s.h };
  }
  footprint(): Footprint {
    return rotatedFootprint(this.printedFootprint(), this.rotation);
  }
  cells(): Cell[] {
    return cellsOf(this.x, this.y, this.footprint());
  }
  // The bay and its keep-clear edge in the tile's own frame, after any flip.
  private printedBay() {
    const s = this.spec();
    const bay = this.flipped ? { ...s.bay, x: s.w - s.bay.x - s.bay.w } : s.bay;
    const edge = this.flipped ? MIRROR[s.keepClearEdge] : s.keepClearEdge;
    return { bay, edge };
  }
  // The bay rectangle in factory coordinates after flip and rotation.
  bayRect() {
    const r = rotateRect(this.printedFootprint(), this.printedBay().bay, this.rotation);
    return { x: this.x + r.x, y: this.y + r.y, w: r.w, h: r.h };
  }
  bayCells(): Cell[] {
    const b = this.bayRect();
    return cellsOf(b.x, b.y, { w: b.w, h: b.h });
  }
  // The strip of table outside the bay's keep-clear edge that must stay empty (P3.23).
  keepClearCells(): Cell[] {
    const b = this.bayRect();
    return stripOutside(b.x, b.y, { w: b.w, h: b.h }, rotateEdge(this.printedBay().edge, this.rotation));
  }

  render(spec: ChitRenderSpec): void {
    const p = this.printedFootprint();
    // The floor as printed, drawn from the real floor's squares; a flip mirrors the print,
    // since the underside of a floor tile is blank.
    const geo = new BoxGeometry(p.w * BASE_SIZE, p.h * BASE_SIZE, FLOOR_THICKNESS);
    const edge = new MeshPhongMaterial({ color: "#161616" }); // the cut edge of black board
    const face = new FloorFace().set((f) => { f.kind = this.kind; f.flipped = this.flipped; f.width = p.w * 80; f.height = p.h * 80; }).material;
    spec.object = new Mesh(geo, [edge, edge, edge, edge, face, edge]);
    spec.object.receiveShadow = true;

    if (this.parent instanceof Factory) {
      const f = this.footprint();
      spec.offsetX = (this.x + f.w / 2) * BASE_SIZE;
      spec.offsetY = -(this.y + f.h / 2) * BASE_SIZE;
      spec.offsetZ = TABLE_Z; // its underside on the table
      spec.offsetSpeed = FACTORY_OFFSET_SPEED;
    }
    spec.rotateZ = (this.rotation * Math.PI) / 2;
    const status = this.selected ? COLOR_SELECTED : this.problems.length ? COLOR_INVALID : undefined;
    if (status) {
      spec.highlight.color = status;
      spec.highlight.clickColor = status;
    }
    spec.showDetailsOnLongPress = true;
    spec.summary =
      this.kind === "main"
        ? "Main factory floor, 12×12 with a 5×5 loading bay."
        : `Floor expansion, 6×8 with a 2×2 loading bay. The light line is the keep-clear zone: the squares beyond it must stay empty table.${this.committed ? "" : " Placed this year: it can still be moved, rotated or flipped, and can be built on from next year."}${this.problems.length ? `\n\nNot legal yet:\n${this.problems.map((x) => `• ${x}`).join("\n")}` : ""}`;
    spec.shortSummary = this.kind === "main" ? "Main floor" : "Floor expansion";
  }
}
