import { spacePlacement } from "../boardGeometry";
import { BoxGeometry, Mesh, MeshPhongMaterial, PlaneGeometry } from "three";
import { Chit, ChitRenderSpec, Ordered, OrderedOutlet, StaticImage } from "@pretty-chitty/core";
import { BRAND_THICKNESS, TABLE_Z, outlineFor, Dimension, dimensionHex, dimensionLabel, playerHex, PlayerColor, TRACK_HEIGHT, TRACK_SLOTS, trackSlotStation, station, TRACK_PUNCH_CLOCK_SLOTS } from "../consts";
import { trackArt, trackSlotArt } from "../art";
import { TRACK_OUTLINES, TRACK_SLOT_PX } from "../outlines";
import { brandGeometry, trackGeometry, TRACK_THICKNESS } from "../svg";
import { OfficeSpace } from "./OfficeSpace";

// A brand piece on a research slot: two columns of three seats fit a slot at this width.
const TRACK_PIECE = 0.74;

export const TRACK_LENGTH = 16; // matches the board edge (C8)
// World units per pixel of a track's own crop.
const PX = (d: Dimension) => TRACK_LENGTH / TRACK_OUTLINES[d].w;

// Where a track position (0 = start spot, 1..6 = slots) sits along the track's local X, as
// printed on that track (measured from its body's left edge).
export function trackSlotX(d: Dimension, position: number): number {
  const o = TRACK_OUTLINES[d];
  return -TRACK_LENGTH / 2 + (o.bodyLeft + TRACK_SLOT_PX.dx0 + TRACK_SLOT_PX.pitch * position) * PX(d);
}
// The slots' vertical centre relative to the body's centre.
const slotY = (d: Dimension) => -((TRACK_SLOT_PX.y0 + TRACK_SLOT_PX.y1) / 2 - TRACK_OUTLINES[d].bodyH / 2) * PX(d);

// A brand piece (C21): a player's marker on a research-track slot or a planning-office space.
// Wherever it stands, the space is its parent and pieces sharing a space splay into a
// countable block (chits-and-rendering.md, *Splay*).
export class BrandPiece extends Chit {
  playerId = "";
  playerColor: PlayerColor = "red";
  seat = 0;
  // On an office-board space: where it stands among the pieces sharing that space, kept by
  // PlanningOffice.arrange whenever a piece arrives or leaves (renders read only this chit).
  officeSpot = 0;
  officeCount = 1;

  override functionallyIdentical(): boolean {
    return false;
  }

  // The track position this piece stands on (0 = start spot), when it is on a track.
  get position(): number {
    return this.parent instanceof TrackSlot ? this.parent.position : 0;
  }

  render(spec: ChitRenderSpec): void {
    // One physical piece, one size, wherever it stands: wood never shrinks to fit (developer rule).
    // Crowded spaces stack the pieces (splay below) instead.
    spec.object = new Mesh(brandGeometry(this.playerColor, TRACK_PIECE), new MeshPhongMaterial({ color: playerHex(this.playerColor) }));
    spec.object.castShadow = true;
    spec.highlight.color = outlineFor(playerHex(this.playerColor));
    if (this.parent instanceof OfficeSpace || this.parent instanceof TrackSlot) {
      // Up to five pieces in a 3×2 block that stays inside one slot (and clear of the white
      // innovation bar in the gap between slots).
      const office = this.parent instanceof OfficeSpace;
      if (office) {
        // Centred on the printed space. Pieces sharing it stack as real ones would: each rests
        // on the one before it, nudged sideways so every colour shows (OfficeSpace.pieces is the pile).
        // Side by side where the printed space is wide enough (the Gantt "0" box spans its row);
        // on a small square, an offset stack with each piece resting on the one before.
        const sp = spacePlacement(this.parent.track, this.parent.index);
        const room = (sp.w - TRACK_PIECE) / 4;
        const apart = room >= TRACK_PIECE + 0.06;
        spec.splay.enabled = true;
        spec.splay.rows = 1;
        spec.splay.columns = 5;
        spec.splay.itemWidth = apart ? TRACK_PIECE + 0.06 : 0.22;
        spec.splay.zPerIndexMultiplier = apart ? 0 : BRAND_THICKNESS * 0.8;
      } else {
        // Research spaces: every seat has its own fixed spot (developer decision), so a
        // colour is always in the same place on every space and nothing shuffles as markers
        // come and go. Seats fill two columns of three rows over the whole slot, so each piece
        // can be large and none touches another.
        const col = this.seat % 2;
        const row = Math.floor(this.seat / 2);
        spec.offsetX = (col - 0.5) * 0.84;
        spec.offsetY = (1 - row) * 0.82;
      }
      // Standing on the printed space (a plane on the board or the track); a fifth piece on an
      // office space stands on the others.
      spec.offsetZ = 0.001;
    }
    spec.summary = this.parent instanceof TrackSlot ? `Research marker on ${this.parent.label()}.` : "Brand piece.";
    spec.galleryPreferredWidth = 220; // the "which marker?" picker
    spec.galleryPreferredHeight = 220;
  }
}

// One space on a research track (position 0 = the start spot, 1..6 = the slots). Markers on
// it are its children so they splay instead of being placed by hand.
export class TrackSlot extends Chit {
  position = 0;
  dimension: Dimension = "range";
  @Ordered markers = new OrderedOutlet<BrandPiece>();

  override functionallyIdentical(): boolean {
    return false;
  }

  label(): string {
    if (this.position === 0) return `the ${dimensionLabel(this.dimension)} start spot`;
    const s = station(trackSlotStation(this.dimension, this.position));
    return `${dimensionLabel(this.dimension)} ${this.position} (${s.label})`;
  }

  render(spec: ChitRenderSpec): void {
    // The space is a real piece with its own art (the track face underneath is only the band),
    // so what is drawn and what is clicked are the same thing.
    // Its own crop of the track scan, exactly over the same art on the track.
    const w = (this.position === 0 ? TRACK_SLOT_PX.startW : TRACK_SLOT_PX.slotW) * PX(this.dimension);
    const h = (TRACK_SLOT_PX.y1 - TRACK_SLOT_PX.y0) * PX(this.dimension);
    spec.object = new Mesh(new PlaneGeometry(w, h), StaticImage.material(trackSlotArt(this.dimension, this.position)));
    spec.object.receiveShadow = true;
    spec.offsetX = trackSlotX(this.dimension, this.position);
    spec.offsetY = slotY(this.dimension);
    spec.offsetZ = TRACK_THICKNESS / 2 + 0.001; // printed on the track's top face
    spec.offsetSpeed = 0;
    // Markers stand over the slot's middle (their seat spots spread across the whole slot).
    spec.setOutletPosition("markers", 0, 0, 0);
    spec.summary = this.label();
  }
}

export class InnovationIndicator extends Chit {
  position = 0; // sits between position and position + 1 (S7)
  render(spec: ChitRenderSpec): void {
    // A thin white bar in the gap between two slots, so it never sits on a marker.
    spec.object = new Mesh(new BoxGeometry(0.16, TRACK_HEIGHT - 1.1, 0.3), new MeshPhongMaterial({ color: "#f5f5f5" }));
    spec.object.castShadow = true;
    const d = this.parent instanceof ResearchTrack ? this.parent.dimension : "range";
    spec.offsetX = (trackSlotX(d, this.position) + trackSlotX(d, this.position + 1)) / 2;
    spec.offsetY = slotY(d);
    spec.offsetZ = TRACK_THICKNESS / 2; // standing on the track
    spec.summary = "Innovation indicator: research markers ahead of it count toward this track's innovation in phase 7.";
  }
}

// A research track (C10–C14, M5–M7). Active tracks are children of the market board;
// off-board tracks are children of the research area. Markers are brand pieces.
export class ResearchTrack extends Chit {
  dimension: Dimension = "range";
  minSpec = 0; // P7.3, raised each time the track leaves the board
  @Ordered slots = new OrderedOutlet<TrackSlot>();
  @Ordered innovation = new OrderedOutlet<InnovationIndicator>();

  setup(players: { playerId: string; playerColor: PlayerColor; seat: number }[], startPosition: number): void {
    for (let p = 0; p <= TRACK_SLOTS; p++) this.slots.add(new TrackSlot().set((s) => { s.position = p; s.dimension = this.dimension; }));
    for (const pl of players) this.slot(startPosition).markers.add(new BrandPiece().set((m) => { m.playerId = pl.playerId; m.playerColor = pl.playerColor; m.seat = pl.seat; }));
    this.innovation.add(new InnovationIndicator());
  }
  slot(position: number): TrackSlot {
    return this.slots.find((s) => s.position === position)!;
  }
  markers(): BrandPiece[] {
    return this.slots.copy().flatMap((s) => s.markers.copy());
  }
  advance(piece: BrandPiece): void {
    this.slot(Math.min(TRACK_SLOTS, piece.position + 1)).markers.add(piece);
  }
  positionOf(playerId: string): number {
    return this.markerOf(playerId)?.position ?? 0;
  }
  markerOf(playerId: string): BrandPiece | undefined {
    return this.markers().find((m) => m.playerId === playerId);
  }
  innovationPosition(): number {
    return this.innovation.get(0)?.position ?? 0;
  }
  // P7.8: sum over markers ahead of the indicator of how many spaces ahead each is.
  innovationScore(): number {
    const i = this.innovationPosition();
    return this.markers().reduce((n, m) => n + Math.max(0, m.position - i), 0);
  }
  furthestMarker(): number {
    return this.markers().reduce((n, m) => Math.max(n, m.position), 0);
  }
  slotLabel(position: number): string {
    if (position === 0) return "start";
    const s = station(trackSlotStation(this.dimension, position));
    return `${s.label} (${s.step})${TRACK_PUNCH_CLOCK_SLOTS.includes(position) ? " ⏱" : ""}`;
  }

  render(spec: ChitRenderSpec): void {
    // The real track: its die-cut outline extruded, the scanned strip printed on top.
    const edge = new MeshPhongMaterial({ color: dimensionHex(this.dimension) });
    spec.object = new Mesh(trackGeometry(this.dimension, TRACK_LENGTH), [StaticImage.material(trackArt(this.dimension)), edge]);
    spec.object.receiveShadow = true;
    spec.showDetailsOnLongPress = true; // a board: no outline
    // Where it lies: along the market's left axis it stands on end; off-board tracks stack.
    // The name tab always points away from the board.
    if (this.parentOutlet === "leftTrack") spec.rotateZ = -Math.PI / 2;
    if (this.parentOutlet === "offBoard") {
      spec.offsetY = -(this.parentOutletIndex ?? 0) * (TRACK_OUTLINES[this.dimension].h * PX(this.dimension) + 0.3);
      spec.offsetZ = TABLE_Z; // its underside on the table
    }
    spec.summary = `**${dimensionLabel(this.dimension)}** research track. Minimum spec ${this.minSpec}. Slots: ${Array.from({ length: TRACK_SLOTS }, (_, i) => this.slotLabel(i + 1)).join(", ")}.`;
    spec.shortSummary = `${dimensionLabel(this.dimension)} track`;
  }
}
