import { BoxGeometry, Mesh, MeshPhongMaterial } from "three";
import { Chit, ChitRenderSpec } from "@pretty-chitty/core";
import { BASE_SIZE, Dimension, dimensionHex, dimensionLabel, TILE_THICKNESS } from "../consts";

// P4.4: one wooden cube on a dealership per point of its specs, in the dimension's colour. A cube
// is a child of its dealership and is made with the dealership as its `parentFallback`, so it rises
// out of the tile when added and sinks back into it when removed, never flying in from the table
// edge. Where it stands is stored here (renders read only their own chit): `slot` is its place in
// rows below the name band, `tileW`/`tileH` the dealership's printed size.
export const CUBE = 0.42;
const GAP = 0.12;

export class SpecCube extends Chit {
  dimension: Dimension = "speed";
  slot = 0;
  tileW = 4;
  tileH = 3;

  override functionallyIdentical(): boolean {
    return false;
  }

  render(spec: ChitRenderSpec): void {
    const perRow = Math.max(1, Math.floor((this.tileW - 0.4) / (CUBE + GAP)));
    const col = this.slot % perRow;
    const row = Math.floor(this.slot / perRow);
    const mesh = new Mesh(new BoxGeometry(CUBE * BASE_SIZE, CUBE * BASE_SIZE, CUBE * BASE_SIZE), new MeshPhongMaterial({ color: dimensionHex(this.dimension) }));
    mesh.castShadow = true;
    spec.object = mesh;
    spec.offsetX = (-this.tileW / 2 + 0.3 + CUBE / 2 + col * (CUBE + GAP)) * BASE_SIZE;
    spec.offsetY = (this.tileH / 2 - 1.1 - CUBE / 2 - row * (CUBE + GAP)) * BASE_SIZE;
    spec.offsetZ = TILE_THICKNESS / 2;
    spec.summary = `${dimensionLabel(this.dimension)}: one point of this dealership's specs.`;
    spec.worthSlidingToPanelToShowChange = false;
  }
}
