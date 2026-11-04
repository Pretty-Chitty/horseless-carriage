import { setupTable } from "../table";
import * as icons from "../assets/icons";
import { BoxGeometry, Mesh, MeshPhongMaterial, PlaneGeometry } from "three";
import { CameraSpec, Chit, ChitRenderSpec, Ordered, OrderedOutlet, PanelTab, StaticImage } from "@pretty-chitty/core";
import { outlineFor, PUNCH_CLOCK_TOP, PUNCH_CLOCK_START, CAPACITY_MAX, CAPACITY_PUNCH_CLOCK, TILE_THICKNESS, BOARD_THICKNESS, TABLE_Z, COLOR_PAPER, flipLift } from "../consts";
import { boardArt } from "../art";
import { OfficeSpace } from "./OfficeSpace";
import { TimecardFace } from "../canvas/TimecardFace";
import { sectionSize, spacePlacement } from "../boardGeometry";

// An invisible holder that lies flat in the middle of the board, so the spaces it owns place
// themselves on the board's top face like the office's own.
function holder(spec: ChitRenderSpec, summary: string): void {
  spec.object = new Mesh(new PlaneGeometry(0.01, 0.01), new MeshPhongMaterial({ transparent: true, opacity: 0 }));
  spec.offsetZ = 0;
  spec.offsetSpeed = 0;
  spec.worthSlidingToPanelToShowChange = false;
  spec.summary = summary;
}

// The timecard (C35, C40): a square cardboard marker showing the punch clock, turned over to
// its FINISH side when time runs out. It stands on its punch-clock space.
export class Timecard extends Chit {
  position = PUNCH_CLOCK_TOP; // the punch-clock space it stands on (C40)
  flipped = false; // C35
  render(spec: ChitRenderSpec): void {
    const side = new MeshPhongMaterial({ color: "#e6e2d8" });
    const front = new TimecardFace().set((f) => (f.side = "clock")).material;
    const back = new TimecardFace().set((f) => (f.side = "finish")).material;
    const size = 0.72;
    spec.object = new Mesh(new BoxGeometry(size, size, TILE_THICKNESS), [side, side, side, side, front, back]);
    spec.object.castShadow = true;
    if (this.flipped) spec.rotateY = Math.PI;
    spec.zLiftRotationMultiplier = flipLift(size / 2);
    const p = spacePlacement("clock", this.position);
    spec.offsetX = p.x;
    spec.offsetY = p.y;
    spec.offsetZ = BOARD_THICKNESS / 2 + 0.001; // lying on its punch-clock space
    spec.highlight.color = outlineFor("#e6e2d8");
    spec.summary = this.flipped ? "The timecard has been turned over: the game ends at the next Finish? phase." : `The timecard on ${this.position}. Punch clocks move it down; at 0 it flips and the game ends soon.`;
    spec.shortSummary = "Timecard";
  }
}

// The punch clock (C35, C40, M25): the board's punch-clock section, spaces 40..1 and the
// timecard. Its own panel, folded into a tab group by default: it rarely moves.
export class ClockBoard extends Chit {
  @Ordered spaces = new OrderedOutlet<OfficeSpace>();
  @Ordered timecard = new OrderedOutlet<Timecard>();

  public get panelTab(): PanelTab {
    return { icon: icons.clockIcon, color: "#b89a5a" };
  }

  setup(playerCount: number): void {
    for (let i = PUNCH_CLOCK_TOP; i >= 1; i--) {
      this.spaces.add(new OfficeSpace().set((s) => { s.track = "clock"; s.index = i; }));
    }
    this.timecard.add(new Timecard().set((t) => (t.position = PUNCH_CLOCK_START[playerCount]))); // S13
  }

  timecardValue(): number {
    return this.timecard.get(0).position;
  }
  timecardFlipped(): boolean {
    return this.timecard.get(0).flipped;
  }
  // C35: each punch clock moves the timecard down one; from 1 it flips instead of reaching 0.
  punch(steps = 1): void {
    const t = this.timecard.get(0);
    for (let i = 0; i < steps; i++) {
      if (t.position > 1) t.position -= 1;
      else t.flipped = true;
    }
  }

  render(spec: ChitRenderSpec): void {
    const { w, h } = sectionSize("clock");
    const edge = new MeshPhongMaterial({ color: COLOR_PAPER });
    const board = new Mesh(new BoxGeometry(w, h, BOARD_THICKNESS), [edge, edge, edge, edge, StaticImage.material(boardArt.clock), edge]);
    board.receiveShadow = true;
    spec.object = board;
    spec.offsetZ = TABLE_Z; // its underside on the table
    setupTable(spec);
    spec.camera = new CameraSpec();
    spec.camera.paddingTop = 6;
    spec.camera.paddingBottom = 6;
    spec.camera.paddingLeft = 6;
    spec.camera.paddingRight = 6;
    spec.summary = "Punch clock: every punch-clock event moves the timecard down one space. When it runs out the game ends.";
    spec.shortSummary = "Punch clock";
  }
}

// The Assembly Capacity boxes (M23) on the board's right half.
export class CapacityStrip extends Chit {
  @Ordered spaces = new OrderedOutlet<OfficeSpace>();

  setup(): void {
    for (let i = 1; i <= CAPACITY_MAX; i++) this.spaces.add(new OfficeSpace().set((s) => { s.track = "capacity"; s.index = i; s.punchClock = i === CAPACITY_PUNCH_CLOCK; }));
  }

  render(spec: ChitRenderSpec): void {
    holder(spec, `Assembly capacity: each of your mainlines assembles this many cars a year. Research raises it; reaching ${CAPACITY_PUNCH_CLOCK} punches the clock.`);
  }
}
