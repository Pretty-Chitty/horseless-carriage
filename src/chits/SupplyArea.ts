import { setupTable } from "../table";
import { stationArt } from "../art";
import { BoxGeometry, Mesh, MeshPhongMaterial, PlaneGeometry } from "three";
import { componentCanvas, componentFace } from "../tileFaces";
import { CameraSpec, Chit, ChitRenderSpec, Ordered, OrderedOutlet, PanelTab } from "@pretty-chitty/core";
import { STATIONS, MAINLINES, stepHex, carTypeHex, carTypeLabel, DEPARTMENTS, RESEARCH_DEPARTMENTS_PER_SET, PLANNING_DEPARTMENTS_PER_SET, TABLE_Z, TILE_THICKNESS, BASE_SIZE, outlineFor } from "../consts";
import { LabelFace } from "../canvas/LabelFace";

// One stack of a shared component kind, with its remaining count (S16, P3.7).
export class SupplyStack extends Chit {
  key = "";
  label = "";
  hex = "#777";
  textHex = "#fff";
  w = 2;
  h = 2;
  count = 0;
  x = 0; // centre, in world units, packed by SupplyArea.setup
  y = 0;

  override functionallyIdentical(): boolean {
    return false;
  }

  render(spec: ChitRenderSpec): void {
    // The real tile on top of a pile as tall as the stock, with a paper tag for the count. An
    // empty stack is a faint ghost of its tile (developer request), so the rows keep their shape.
    const empty = this.count === 0;
    // Faces are shared, so the ghost gets its own faded material over the same live texture.
    const face = empty
      ? new MeshPhongMaterial({ map: componentCanvas(this.key, "green", this.w, this.h).texture, transparent: true, opacity: 0.18 })
      : componentFace(this.key, "green", this.w, this.h);
    const side = new MeshPhongMaterial({ color: "#d8d4c8", transparent: empty, opacity: empty ? 0.18 : 1 });
    const depth = Math.max(1, this.count) * TILE_THICKNESS;
    spec.object = new Mesh(new BoxGeometry(this.w * BASE_SIZE, this.h * BASE_SIZE, depth), [side, side, side, side, face, side]);
    spec.object.castShadow = !empty;
    const tag = new Mesh(
      new PlaneGeometry(1.1, 0.6),
      new LabelFace().set((f) => { f.label = `×${this.count}`; f.hex = "#f4f1e8"; f.textHex = "#1c1c1c"; f.width = 110; f.height = 60; f.fontPx = 40; }).material,
    );
    tag.position.set(this.w / 2 - 0.55, -this.h / 2 - 0.35, -depth / 2 + 0.002);
    spec.ornaments.push(tag);
    spec.offsetX = this.x;
    spec.offsetY = this.y;
    spec.offsetZ = TABLE_Z; // a stack resting on the table
    spec.highlight.color = empty ? outlineFor("#6d6d6d") : outlineFor(this.hex);
    spec.showDetailsOnLongPress = true;
    spec.summary = `${this.label}: ${this.count} left in the shared supply. When a stack is empty nobody can build that tile this year.`;
  }
}

// LAYOUT.md §4 "Supply": the shared stock of stations, mainlines and research/planning
// departments. Dealerships and marketing departments are per player and live on the bench.
export class SupplyArea extends Chit {
  @Ordered stacks = new OrderedOutlet<SupplyStack>();

  public get panelTab(): PanelTab {
    return { icon: stationArt.steeringWheel, color: "#6d6d6d" };
  }

  setup(sets: number, intro: boolean): void {
    // The stock laid out as the rulebook groups it: one row per manufacturing step (A, B,
    // C+D), then the mainlines and departments. Piles in a row stand on one baseline with one
    // gap between them, each row centred, with room under the piles for the count tags.
    type Item = { key: string; label: string; hex: string; textHex: string; w: number; h: number; count: number };
    const station = (step: string): Item[] =>
      STATIONS.filter((s) => s.step === step).map((s) => ({ key: `station:${s.id}`, label: s.label, hex: stepHex(s.step), textHex: s.step === "A" || s.step === "B" ? "#222" : "#fff", w: s.footprint.w, h: s.footprint.h, count: s.copiesPerSet * sets }));
    const rows: Item[][] = [
      station("A"),
      station("B"),
      [...station("C"), ...station("D")],
      [
        // V2a: the introductory game leaves the truck and sports-car mainlines in the box.
        ...MAINLINES.filter((m) => !intro || m.type === "car").map((m) => ({ key: `mainline:${m.type}`, label: `${carTypeLabel(m.type)} mainline`, hex: carTypeHex(m.type), textHex: "#fff", w: m.footprint.w, h: m.footprint.h, count: m.copiesPerSet * sets })),
        ...DEPARTMENTS.filter((d) => d.type !== "marketing").map((d) => ({ key: `dept:${d.type}`, label: d.label, hex: d.type === "research" ? "#6e8291" : "#c9dde2", textHex: d.type === "research" ? "#fff" : "#222", w: d.footprint.w, h: d.footprint.h, count: (d.type === "research" ? RESEARCH_DEPARTMENTS_PER_SET : PLANNING_DEPARTMENTS_PER_SET) * sets })),
      ],
    ];
    const GAP = 0.6;
    const TAG = 0.9; // room for the count tag under a row
    let y = 0;
    for (const row of rows) {
      const width = row.reduce((n, it) => n + it.w, 0) + GAP * (row.length - 1);
      const tallest = Math.max(...row.map((it) => it.h));
      let x = -width / 2;
      for (const it of row) {
        const cx = x + it.w / 2;
        const cy = y - tallest + it.h / 2; // bottoms on the row's baseline
        this.stacks.add(new SupplyStack().set((s) => {
          s.key = it.key; s.label = it.label; s.hex = it.hex; s.textHex = it.textHex; s.w = it.w; s.h = it.h; s.count = it.count;
          s.x = cx; s.y = cy;
        }));
        x += it.w + GAP;
      }
      y -= tallest + TAG + GAP;
    }
  }

  stock(key: string): number {
    return this.stacks.find((s) => s.key === key)?.count ?? 0;
  }
  // P3.7: a paid copy returned during a shortage rebuild.
  give(key: string): void {
    const st = this.stacks.find((x) => x.key === key);
    if (st) st.count += 1;
  }
  take(key: string): boolean {
    const s = this.stacks.find((st) => st.key === key);
    if (!s || s.count <= 0) return false;
    s.count -= 1;
    return true;
  }

  render(spec: ChitRenderSpec): void {
    spec.camera = new CameraSpec();
    spec.camera.paddingTop = 6;
    spec.camera.paddingBottom = 6;
    spec.camera.paddingLeft = 6;
    spec.camera.paddingRight = 6;
    setupTable(spec);
    spec.summary = "Shared supply of stations, mainlines and departments.";
  }
}
