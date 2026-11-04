import { BoxGeometry, Mesh, MeshPhongMaterial } from "three";
import { Chit, ChitRenderSpec } from "@pretty-chitty/core";
import { dimensionLabel, TABLE_Z, FLOOR_THICKNESS, FACTORY_OFFSET_SPEED, INDICATOR_ROTATION_SPEED, outlineFor, BASE_SIZE, COLOR_INVALID, COLOR_SELECTED, Dimension, dimensionAbbrev, dimensionHex, INDICATOR_FOOTPRINT, Step, stepHex, TILE_THICKNESS } from "../consts";
import { Cell, cellsOf } from "../geometry";
import { IndicatorFace } from "../canvas/TileFace";
import { FactoryTile } from "./FactoryTile";
import { Factory } from "./Factory";

// A spec indicator (C29, M16): a 1×1 tile pointing at the station it belongs to. It is
// created by the "Add … spec" button on a selected station (UX4), always points at that
// station, and can be dragged like any unlocked piece.
export class SpecIndicator extends Chit {
  dimension: Dimension = "range";
  step: Step = "B";
  slot = 1; // research-track slot that granted it (P3.17)
  station!: FactoryTile; // serialised as a reference by id
  x = 0;
  y = 0;
  placedYear = 0;
  selected = false;
  layer = 0; // stacking order among overlapping pieces (Factory.assignLayers)
  problems: string[] = [];

  override functionallyIdentical(): boolean {
    return false;
  }

  footprint() {
    return INDICATOR_FOOTPRINT;
  }
  cells(): Cell[] {
    return cellsOf(this.x, this.y, INDICATOR_FOOTPRINT);
  }
  committed = false; // P3.3
  locked(_currentYear?: number): boolean {
    return this.committed;
  }

  render(spec: ChitRenderSpec): void {
    const side = new MeshPhongMaterial({ color: stepHex(this.step) });
    const face = new IndicatorFace().set((f) => {
      f.dimension = this.dimension;
      f.step = this.step;
    }).material;
    spec.object = new Mesh(new BoxGeometry(BASE_SIZE, BASE_SIZE, TILE_THICKNESS), [side, side, side, side, face, side]);
    spec.object.castShadow = true;
    if (this.parentOutlet === "previews") {
      // A choice in the Add spec picker: only ever seen in the gallery, so it waits under the
      // floor, and its caption names the research slot it comes from.
      spec.offsetZ = TABLE_Z - 1;
      spec.offsetSpeed = 0;
      spec.shortSummary = `${dimensionLabel(this.dimension)} ${this.slot}`;
      spec.galleryPreferredWidth = 220;
      spec.galleryPreferredHeight = 220;
      spec.summary = `Add a ${this.dimension} indicator to the ${this.station?.label() ?? "station"} (from ${this.dimension} research slot ${this.slot}).`;
      return;
    }
    if (this.parent instanceof Factory) {
      spec.offsetX = (this.x + 0.5) * BASE_SIZE;
      spec.offsetY = -(this.y + 0.5) * BASE_SIZE;
      spec.offsetZ = TABLE_Z + FLOOR_THICKNESS + this.layer * TILE_THICKNESS; // on the floor; overlaps stack
      spec.offsetSpeed = FACTORY_OFFSET_SPEED;
      spec.rotationSpeed = INDICATOR_ROTATION_SPEED;
      // Point at the station (P3.20), always in a quarter turn: toward the nearest station
      // square along the dominant axis. Art is drawn pointing up (grid -y).
      const s = this.station;
      if (s) {
        const f = s.footprint();
        const tx = Math.min(Math.max(this.x, s.x), s.x + f.w - 1);
        const ty = Math.min(Math.max(this.y, s.y), s.y + f.h - 1);
        const dx = tx - this.x;
        const dy = ty - this.y;
        if (Math.abs(dx) > Math.abs(dy)) spec.rotateZ = dx > 0 ? -Math.PI / 2 : Math.PI / 2;
        else if (dy !== 0) spec.rotateZ = dy > 0 ? Math.PI : 0;
      }
    }
    const status = this.selected ? COLOR_SELECTED : this.problems.length ? COLOR_INVALID : undefined;
    spec.highlight.color = status ?? outlineFor(stepHex(this.step));
    if (status) spec.highlight.clickColor = status;
    spec.showDetailsOnLongPress = true;
    const what = `**${this.dimension} spec indicator** (step ${this.step}, from ${this.dimension} research slot ${this.slot}) for the ${this.station?.label() ?? "station"}. Adds 1 ${this.dimension} to every mainline in its manufacturing zone.`;
    spec.summary = this.problems.length ? `${what}\n\nNot legal yet:\n${this.problems.map((x) => `• ${x}`).join("\n")}` : `${what}${this.committed ? "\n\nFixed: built in an earlier year." : ""}`;
    spec.shortSummary = `${dimensionAbbrev(this.dimension)} → ${this.station?.label() ?? ""}`;
    void dimensionHex;
  }
}
