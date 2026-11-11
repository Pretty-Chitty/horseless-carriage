import { Group, Mesh, MeshBasicMaterial, PlaneGeometry } from "three";
import { Chit, ChitRenderSpec } from "@pretty-chitty/core";
import { BASE_SIZE, FLOOR_THICKNESS, TABLE_Z, TILE_THICKNESS } from "../consts";

// An invisible, pooled drop target over a rectangle of factory squares (patterns.md, *Spatial
// placement is drag-and-drop*). It sets nothing but geometry: the engine flags the target
// under a dragged piece on its own. The engine picks the target whose centre is nearest the
// dragged piece's centre, so the target needs no size at all: an empty object has a zero-size box,
// which the panel's camera framing skips. Full-size targets for the floor expansion (which reach a
// footprint past the floor on every side) zoomed the factory far out (developer: "80% wasted space").
export class DropTarget extends Chit {
  x = 0;
  y = 0;
  w = 1;
  h = 1;

  override functionallyIdentical(): boolean {
    return false;
  }

  render(spec: ChitRenderSpec): void {
    spec.object = new Group();
    spec.offsetX = (this.x + this.w / 2) * BASE_SIZE;
    spec.offsetY = -(this.y + this.h / 2) * BASE_SIZE;
    spec.offsetZ = 0.05;
    spec.offsetSpeed = 0;
    spec.worthSlidingToPanelToShowChange = false;
    // The target under a dragged piece shows where it would land: a faint frame of its
    // footprint (developer request). An ornament, so the target's own box stays empty for framing.
    if (this.isDropTarget) {
      const frame = dropFrame(this.w * BASE_SIZE, this.h * BASE_SIZE);
      frame.position.z = FRAME_Z - spec.offsetZ; // over the floor's top and any tile on it, not inside the cardboard
      spec.ornaments.push(frame);
    }
  }
}

const FRAME_Z = TABLE_Z + FLOOR_THICKNESS + TILE_THICKNESS + 0.01;
const frameMaterial = new MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.45, depthWrite: false });
const fillMaterial = new MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.08, depthWrite: false });

function dropFrame(w: number, h: number): Group {
  const g = new Group();
  const t = 0.06;
  g.add(new Mesh(new PlaneGeometry(w, h), fillMaterial));
  for (const [x, y, sw, sh] of [[0, h / 2 - t / 2, w, t], [0, -h / 2 + t / 2, w, t], [w / 2 - t / 2, 0, t, h], [-w / 2 + t / 2, 0, t, h]]) {
    const m = new Mesh(new PlaneGeometry(sw, sh), frameMaterial);
    m.position.set(x, y, 0.001);
    g.add(m);
  }
  return g;
}

