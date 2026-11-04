import { setupTable } from "../table";
import * as icons from "../assets/icons";
import { BoxGeometry, Mesh, MeshPhongMaterial } from "three";
import { StaticImage, CameraSpec, Chit, ChitRenderSpec, ChildOutlet, Ordered, OrderedOutlet, PanelTab } from "@pretty-chitty/core";
import { TABLE_Z, BOARD_THICKNESS, GANTT_MAX, GANTT_PUNCH_CLOCK, FOCUS_SLOTS, COLOR_PAPER } from "../consts";
import { Player } from "./Player";
import { BrandPiece } from "./ResearchTrack";
import { OfficeSpace, OfficeTrack } from "./OfficeSpace";
import { CapacityStrip } from "./ClockBoard";
import { boardArt } from "../art";
import { sectionSize } from "../boardGeometry";
import { BOARD_TILT } from "./MarketBoard";

export type { OfficeTrack } from "./OfficeSpace";
export { OfficeSpace } from "./OfficeSpace";

// LAYOUT.md §4 "Planning office": the planning office section of the real board — Gantt
// charts, this year's and last year's focus (C36, C37). Turn order is read off where the
// brand pieces stand, so there is no second source of truth. The office answers for every
// brand-piece track (assembly capacity included) so callers have one API.
export class PlanningOffice extends Chit {
  @Ordered spaces = new OrderedOutlet<OfficeSpace>();
  @ChildOutlet capacity = new CapacityStrip(); // M23, a spark: its spaces are bookkeeping, not shown

  public get panelTab(): PanelTab {
    return { icon: icons.officeIcon, color: "#7a8fa6" };
  }

  setup(players: Player[]): void {
    const add = (track: OfficeTrack, index: number, punchClock = false) =>
      this.spaces.add(new OfficeSpace().set((s) => { s.track = track; s.index = index; s.punchClock = punchClock; }));
    for (let i = 0; i <= GANTT_MAX; i++) add("gantt", i, i === GANTT_PUNCH_CLOCK); // M22
    for (let i = 1; i <= FOCUS_SLOTS; i++) add("focus", i); // C37
    for (let i = 1; i <= FOCUS_SLOTS; i++) add("historical", i);
    // S8: historical focus in seat order; S9: Gantt charts N, N-1, …, 1; S12: capacity 1.
    players.forEach((p, i) => {
      this.space("historical", i + 1).pieces.add(this.brand(p));
      this.space("gantt", players.length - i).pieces.add(this.brand(p));
      this.space("capacity", 1).pieces.add(this.brand(p));
      p.gantt.value = players.length - i;
      p.capacity.value = 1;
    });
    for (const s of this.allSpaces()) this.arrange(s);
  }

  // Assembly capacity is a spark (the coordinator's phase 1 Capacity button); its boxes are
  // not part of this panel.
  override shouldRenderChild(child: Chit): boolean {
    return child !== this.capacity;
  }

  // Where each brand piece on a space stands among the others there (renders read only
  // their own chit, so the spot is stored on the piece when pieces arrive or leave).
  private arrange(space: OfficeSpace): void {
    const pieces = space.pieces.copy();
    pieces.forEach((b, i) => {
      if (b.officeSpot !== i) b.officeSpot = i;
      if (b.officeCount !== pieces.length) b.officeCount = pieces.length;
    });
  }
  private brand(p: Player): BrandPiece {
    return new BrandPiece().set((b) => { b.playerId = p.playerId; b.playerColor = p.playerColor; b.seat = p.seat; });
  }

  // Every brand-piece space: the office's own and the capacity boxes.
  private allSpaces(): OfficeSpace[] {
    return [...this.spaces.copy(), ...this.capacity.spaces.copy()];
  }
  space(track: OfficeTrack, index: number): OfficeSpace {
    const s = this.allSpaces().find((x) => x.track === track && x.index === index);
    if (!s) throw new Error(`no ${track} space ${index}`);
    return s;
  }
  // Where a player's piece stands on a track, or undefined if it is not on that track.
  positionOn(track: OfficeTrack, playerId: string): number | undefined {
    return this.allSpaces().find((s) => s.track === track && s.pieces.some((b) => b.playerId === playerId))?.index;
  }
  moveTo(track: OfficeTrack, playerId: string, index: number): void {
    const from = this.allSpaces().find((s) => (s.track === track || (track === "focus" && s.track === "historical") || (track === "historical" && s.track === "focus")) && s.pieces.some((b) => b.playerId === playerId));
    const piece = from?.pieces.find((b) => b.playerId === playerId);
    if (!piece) throw new Error(`no ${track} piece for ${playerId}`);
    const to = this.space(track, index);
    to.pieces.add(piece);
    this.arrange(from!);
    this.arrange(to);
  }
  focusSlot(playerId: string): number | undefined {
    return this.positionOn("focus", playerId);
  }
  historicalSlot(playerId: string): number | undefined {
    return this.positionOn("historical", playerId);
  }
  openFocusSlots(playerCount: number): OfficeSpace[] {
    return this.spaces.filter((s) => s.track === "focus" && s.index <= playerCount && s.pieces.length === 0); // P2.4
  }

  // P2.6 / C37: engineering order is ascending focus slot; players still on the historical
  // track (before phase 2, or during setup) sort after, by their historical slot.
  engineeringOrder(players: Player[]): Player[] {
    const key = (p: Player) => this.focusSlot(p.playerId) ?? 100 + (this.historicalSlot(p.playerId) ?? 0);
    return [...players].sort((a, b) => key(a) - key(b));
  }
  salesOrder(players: Player[]): Player[] {
    return this.engineeringOrder(players).reverse();
  }
  engineeringRank(player: Player, players: Player[]): number {
    return this.engineeringOrder(players).indexOf(player) + 1;
  }
  // P1.1 / P2.2 tiebreak: the order given by the historical focus track alone.
  historicalOrder(players: Player[]): Player[] {
    return [...players].sort((a, b) => (this.historicalSlot(a.playerId) ?? 99) - (this.historicalSlot(b.playerId) ?? 99));
  }
  // P3.24: after a build turn the focus marker drops to the historical track, same slot.
  moveToHistorical(player: Player): void {
    const slot = this.focusSlot(player.playerId);
    if (slot === undefined) return;
    this.moveTo("historical", player.playerId, slot);
  }

  render(spec: ChitRenderSpec): void {
    // The planning office section of the real board, a slab with the scan on top; its spaces
    // carry their own crops on top of it.
    const { w, h } = sectionSize("office");
    const edge = new MeshPhongMaterial({ color: COLOR_PAPER });
    const face = StaticImage.material(boardArt.office);
    const board = new Mesh(new BoxGeometry(w, h, BOARD_THICKNESS), [edge, edge, edge, edge, face, edge]);
    board.receiveShadow = true;
    spec.object = board;
    spec.offsetZ = TABLE_Z; // its underside on the table
    setupTable(spec);
    spec.showDetailsOnLongPress = true;
    spec.camera = new CameraSpec();
    spec.camera.paddingTop = 6;
    spec.camera.paddingBottom = 6;
    spec.camera.paddingLeft = 6;
    spec.camera.paddingRight = 6;
    spec.camera.verticalRadiansRotation = BOARD_TILT;
    spec.summary = "The planning office: Gantt charts, this year's focus (slot 1 builds first, the highest slot sells first) and last year's focus.";
    spec.shortSummary = "Planning office";
  }
}
