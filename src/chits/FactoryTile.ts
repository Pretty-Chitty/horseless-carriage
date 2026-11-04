import { BoxGeometry, Material, Mesh, MeshPhongMaterial } from "three";
import { Chit, ChitRenderSpec, Ordered, OrderedOutlet } from "@pretty-chitty/core";
import { SpecCube } from "./SpecCube";
import { dimensionHex, TABLE_Z, FLOOR_THICKNESS, FACTORY_OFFSET_SPEED, outlineFor, TEXELS_PER_SQUARE, CarType, carTypeHex, carTypeLabel, COLOR_INVALID, COLOR_SELECTED, DEALERSHIPS, department, DepartmentType, Dimension, dimensions, Footprint, mainline, playerHex, PlayerColor, station, StationId, Step, stepHex, TILE_THICKNESS, BASE_SIZE, WindowSize, DEALERSHIP_NAMES, flipLift } from "../consts";
import type { Car } from "./Niche";
import { Cell, cellsOf, rotatedFootprint } from "../geometry";
import { MainlineFace } from "../canvas/MainlineFace";
import { componentFace } from "../tileFaces";
import { Factory } from "./Factory";

export type TileKind = "station" | "mainline" | "dealership" | "department";

// A factory tile (C23): station, mainline, dealership or department. Lives under its
// player's Factory whether on the bench (placed = false) or on the floor, so a drag never
// changes parent. Position is the top-left square of the rotated footprint.
export class FactoryTile extends Chit {
  kind: TileKind = "station";
  stationId?: StationId;
  carType?: CarType;
  departmentType?: DepartmentType;
  dealerIndex?: 0 | 1 | 2;
  playerColor: PlayerColor = "green";
  playerOwnerId = "";

  x = 0;
  y = 0;
  rotation = 0;
  flipped = false; // mainlines only: the back is the mirror image (B and C swapped)
  placed = false;
  placedYear = 0; // 0 = provisional (this year's arrangement, still movable, P3.3)
  paid = false;
  // Catalogue entries (placed = false) only: how many may be placed this build, and how many
  // are still left. Shown in the "Add" gallery.
  catalogueMax = 0;
  benchCount = 0; // deducted from the shared supply at the end-of-phase true-up (P3.7, UX6)
  selected = false;
  layer = 0; // stacking order among overlapping pieces (Factory.assignLayers)
  problems: string[] = []; // derived by Factory.refreshValidity; drives the outline and the commit gate (UX2, UX3)

  // Mainlines: the cars sold through this mainline this year stand on it (P5.10), as in the
  // physical game, until the end of the sell phase (P5.15); their count is its capacity used.
  @Ordered soldCars = new OrderedOutlet<Car>();
  get carsSold(): number {
    return this.soldCars.length;
  }
  // Dealerships: published in phase 4, spent in phase 5 (P4.4–P4.9).
  publishedSpecs: Record<Dimension, number> = { speed: 0, reliability: 0, design: 0, range: 0, safety: 0 };
  // Dealerships: one SpecCube per point of the specs it would publish right now (src/reach.ts),
  // so the cubes follow the build as it happens (P4.4).
  @Ordered cubes = new OrderedOutlet<SpecCube>();
  publishedSize: WindowSize | "none" = "none";

  override functionallyIdentical(): boolean {
    return false;
  }

  // The signature that makes two bench pieces interchangeable (one stack per signature).
  signature(): string {
    switch (this.kind) {
      case "station":
        return `station:${this.stationId}`;
      case "mainline":
        return `mainline:${this.carType}`;
      case "department":
        return `dept:${this.departmentType}`;
      case "dealership":
        return `dealership:${this.dealerIndex}`;
    }
  }
  // Shared-supply key, or undefined for per-player components (dealerships, marketing).
  supplyKey(): string | undefined {
    if (this.kind === "dealership") return undefined;
    if (this.kind === "department" && this.departmentType === "marketing") return undefined;
    return this.signature();
  }
  label(): string {
    switch (this.kind) {
      case "station":
        return this.stationId ? station(this.stationId).label : "station";
      case "mainline":
        return `${carTypeLabel(this.carType!)} mainline`;
      case "department":
        return `${department(this.departmentType!).label} department`;
      case "dealership":
        return DEALERSHIP_NAMES[this.playerColor][this.dealerIndex ?? 0];
    }
  }
  step(): Step | undefined {
    return this.kind === "station" && this.stationId ? station(this.stationId).step : undefined;
  }
  // Tolerant of a half-initialised chit: render can run between construction and set().
  printedFootprint(): Footprint {
    switch (this.kind) {
      case "station":
        return this.stationId ? station(this.stationId).footprint : { w: 1, h: 1 };
      case "mainline":
        return mainline(this.carType ?? "car").footprint;
      case "department":
        return department(this.departmentType ?? "research").footprint;
      case "dealership":
        return (DEALERSHIPS.find((d) => d.index === this.dealerIndex) ?? DEALERSHIPS[0]).footprint;
    }
  }
  footprint(): Footprint {
    return rotatedFootprint(this.printedFootprint(), this.rotation);
  }
  cells(): Cell[] {
    return cellsOf(this.x, this.y, this.footprint());
  }
  // P3.3: anything committed at the end of an earlier build phase (setup included) is fixed.
  committed = false;
  locked(_currentYear?: number): boolean {
    return this.committed;
  }

  private faceMaterial(): Material {
    const p = this.printedFootprint();
    return componentFace(this.signature(), this.playerColor, p.w, p.h);
  }
  private sideHex(): string {
    switch (this.kind) {
      case "station":
        return stepHex(this.step() ?? "A");
      case "mainline":
        return carTypeHex(this.carType ?? "car");
      case "department":
        return this.departmentType === "marketing" ? "#6cc24a" : this.departmentType === "planning" ? "#c9dde2" : "#6e8291";
      case "dealership":
        return playerHex(this.playerColor);
    }
  }


  render(spec: ChitRenderSpec): void {
    const p = this.printedFootprint();
    const side = new MeshPhongMaterial({ color: this.sideHex() });
    const face = this.faceMaterial();
    const backFace = this.kind === "mainline" ? new MainlineFace().set((f) => { f.carType = this.carType ?? "car"; f.back = true; f.width = p.w * TEXELS_PER_SQUARE; f.height = p.h * TEXELS_PER_SQUARE; }).material : side;
    spec.object = new Mesh(new BoxGeometry(p.w * BASE_SIZE, p.h * BASE_SIZE, TILE_THICKNESS), [side, side, side, side, face, backFace]);
    spec.object.castShadow = true;
    spec.object.receiveShadow = true;
    spec.rotateZ = (this.rotation * Math.PI) / 2;
    if (this.flipped) spec.rotateY = Math.PI; // shows the mirrored back (see mainlineStepOnEdge)
    spec.zLiftRotationMultiplier = flipLift((Math.max(p.w, p.h) * BASE_SIZE) / 2);

    const factory = this.parent instanceof Factory ? this.parent : undefined;
    if (factory) {
      const f = this.footprint();
      if (this.placed) {
        spec.offsetX = (this.x + f.w / 2) * BASE_SIZE;
        spec.offsetY = -(this.y + f.h / 2) * BASE_SIZE;
        // On the top face of the floor; an overlapping cluster stacks one thickness apart.
        spec.offsetZ = TABLE_Z + FLOOR_THICKNESS + this.layer * TILE_THICKNESS; // on the floor; overlaps stack
        spec.offsetSpeed = FACTORY_OFFSET_SPEED;
      } else {
        // Not on the table: the copies wait under the floor, out of sight, and are offered
        // through the "Add" gallery.
        const bb = factory.bounds();
        spec.offsetX = ((bb.minX + bb.maxX) / 2) * BASE_SIZE;
        spec.offsetY = -((bb.minY + bb.maxY) / 2) * BASE_SIZE;
        spec.offsetZ = TABLE_Z - 1;
        spec.offsetSpeed = 0;
      }
    }
    // Status is an outline, never a repaint (chits-and-rendering.md). Selected beats invalid.
    const status = this.selected ? COLOR_SELECTED : this.problems.length ? COLOR_INVALID : undefined;
    spec.highlight.color = status ?? outlineFor(this.sideHex());
    if (status) spec.highlight.clickColor = status;
    spec.showDetailsOnLongPress = true;
    const state = !this.placed ? `${this.benchCount} left to build this year.` : this.committed ? "Fixed: built in an earlier year." : this.problems.length ? "Not legal yet:" : "Placed this year; can still be moved.";
    spec.summary = `${this.describe()}\n\n${state}${this.problems.length ? `\n${this.problems.map((x) => `• ${x}`).join("\n")}` : ""}`;
    // In the "Add" gallery the caption carries how many are left.
    // In the gallery's small captions: one line, the size and how many are left (the face shows
    // what it is).
    const p2 = this.printedFootprint();
    spec.shortSummary = this.placed ? this.label() : `${p2.w}×${p2.h} · ${this.benchCount} left`;
    // Galleries ("Add") size every item from these: big enough to read in full screen.
    spec.galleryPreferredWidth = 320;
    spec.galleryPreferredHeight = 280;
  }

  private describe(): string {
    switch (this.kind) {
      case "station": {
        if (!this.stationId) return "station";
        const s = station(this.stationId);
        return `**${s.label}** (step ${s.step}, ${s.footprint.w}×${s.footprint.h}). Unlocked by: ${s.slots.map((sl) => `${sl.dimension} ${sl.slot}`).join(", ")}.`;
      }
      case "mainline":
        return `**${this.label()}** — produces one ${carTypeLabel(this.carType!)} per point of assembly capacity each year. Each side is one manufacturing step (A bottom, B right, C left, D top as printed).`;
      case "department":
        return this.departmentType === "research" ? "**Research department** — one research action in phase 1." : this.departmentType === "planning" ? "**Planning department** — one Gantt chart in phase 4." : "**Marketing department** — enlarges the market window of every adjacent dealership.";
      case "dealership":
        return `**${this.label()}** — sells the cars of adjacent mainlines. Specs: ${dimensions.map((d) => `${d} ${this.publishedSpecs[d]}`).join(", ")}; window ${this.publishedSize}.`;
    }
  }
}
