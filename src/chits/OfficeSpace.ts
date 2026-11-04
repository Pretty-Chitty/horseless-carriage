import { Mesh, PlaneGeometry } from "three";
import { StaticImage, Chit, ChitRenderSpec, Ordered, OrderedOutlet } from "@pretty-chitty/core";
import { BOARD_THICKNESS, GANTT_MAX, GANTT_PUNCH_CLOCK, FOCUS_SLOTS } from "../consts";
import { BrandPiece } from "./ResearchTrack";
import { officeCellArt } from "../art";
import { spacePlacement } from "../boardGeometry";

export type OfficeTrack = "gantt" | "focus" | "historical" | "capacity" | "clock";

// One printed space on the board's right half (C36–C40): a Gantt chart square, a focus slot,
// an assembly-capacity box or a punch-clock square. Brand pieces standing on it are its
// children, so several on one space splay into a countable pile. Its own crop of the board
// lies exactly over the same art on the board, so what is drawn and what is clicked are the
// same square.
export class OfficeSpace extends Chit {
  track: OfficeTrack = "gantt";
  index = 0; // the printed number
  punchClock = false;
  @Ordered pieces = new OrderedOutlet<BrandPiece>();

  override functionallyIdentical(): boolean {
    return false;
  }

  render(spec: ChitRenderSpec): void {
    const p = spacePlacement(this.track, this.index);
    spec.object = new Mesh(new PlaneGeometry(p.w, p.h), StaticImage.material(officeCellArt(this.track, this.index)));
    spec.object.receiveShadow = true;
    spec.offsetX = p.x;
    spec.offsetY = p.y;
    spec.offsetZ = BOARD_THICKNESS / 2 + 0.001; // printed on its section's top face
    spec.offsetSpeed = 0;
    spec.summary = this.describe();
    spec.shortSummary = `${this.track} ${this.index}`;
    void GANTT_MAX;
  }
  private describe(): string {
    switch (this.track) {
      case "gantt":
        return `Gantt chart ${this.index}${this.punchClock || this.index === GANTT_PUNCH_CLOCK ? " — punch clock: the timecard drops a step when a marker reaches or passes here" : ""}.`;
      case "focus":
        return `Focus slot ${this.index}: ${this.index === 1 ? "strongest engineering focus" : this.index === FOCUS_SLOTS ? "strongest sales focus" : "between engineering and sales"}.`;
      case "historical":
        return `Historical focus slot ${this.index}: last year's focus, which sets the order of phases 1 and 2.`;
      case "capacity":
        return `Assembly capacity ${this.index}: each mainline builds this many cars a year${this.punchClock ? "; reaching it moves the timecard down" : ""}.`;
      case "clock":
        return `Punch clock space ${this.index}.`;
    }
  }
}
