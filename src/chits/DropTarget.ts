import { Group } from "three";
import { Chit, ChitRenderSpec } from "@pretty-chitty/core";
import { BASE_SIZE } from "../consts";

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
  }
}

