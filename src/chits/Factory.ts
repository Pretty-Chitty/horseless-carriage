import { Chit, ChitRenderSpec, Ordered, OrderedOutlet } from "@pretty-chitty/core";
import { FloorTile } from "./FloorTile";
import { FactoryTile } from "./FactoryTile";
import { SpecIndicator } from "./SpecIndicator";
import { DropTarget } from "./DropTarget";
import { Catalogue } from "./Catalogue";
import { Cell, cellKey, cellsOf, computeZones, NEIGHBOURS, Zone, ZonePiece } from "../geometry";
import { BASE_SIZE, EXPANSIONS_PER_PLAYER, Footprint, station } from "../consts";


export type FloorPiece = FactoryTile | SpecIndicator;

interface Grid {
  floor: Set<string>; // buildable (black) squares
  bay: Set<string>;
  keepClear: Set<string>;
  occupied: Map<string, FloorPiece>;
  floorAll: Set<string>; // every square of every placed floor tile, bays included
}

// A player's factory (C22): floor tiles, the pieces built on them, their spec indicators, the
// bench of this year's buildable copies, and every legality query phase 3 needs. One
// authoritative list of pieces, one derived grid, one rebuild function.
export class Factory extends Chit {
  @Ordered floors = new OrderedOutlet<FloorTile>();
  @Ordered pieces = new OrderedOutlet<FactoryTile>();
  @Ordered indicators = new OrderedOutlet<SpecIndicator>();
  catalogue?: Catalogue; // this player's build catalogue, kept under the root (off the table)
  @Ordered targets = new OrderedOutlet<DropTarget>();

  expansionsLeft = EXPANSIONS_PER_PLAYER; // S11
  expansionsPlaced = 0; // P8.3 reads this

  private _grid?: Grid;

  // ------------------------------------------------------------------ grid
  recomputeGrid(): void {
    const g: Grid = { floor: new Set(), bay: new Set(), keepClear: new Set(), occupied: new Map(), floorAll: new Set() };
    // Only committed floor counts: this year's expansion is not buildable until next year
    // (Q12), and its own legal positions are measured against the factory without it.
    for (const fl of this.floors.copy()) {
      if (!fl.committed) continue;
      for (const c of fl.cells()) {
        g.floorAll.add(cellKey(c.x, c.y));
        g.floor.add(cellKey(c.x, c.y));
      }
      for (const c of fl.bayCells()) {
        g.bay.add(cellKey(c.x, c.y));
        g.floor.delete(cellKey(c.x, c.y));
      }
      for (const c of fl.keepClearCells()) g.keepClear.add(cellKey(c.x, c.y));
    }
    for (const p of this.placedPieces()) for (const c of p.cells()) g.occupied.set(cellKey(c.x, c.y), p);
    this._grid = g;
  }
  private grid(): Grid {
    if (!this._grid) this.recomputeGrid();
    return this._grid!;
  }

  placedTiles(): FactoryTile[] {
    return this.pieces.filter((p) => p.placed);
  }
  // The catalogue entries (see Catalogue): never on the table.
  benchTiles(): FactoryTile[] {
    return this.catalogue?.entries.copy() ?? [];
  }

  placedPieces(): FloorPiece[] {
    return [...this.placedTiles(), ...this.indicators.copy()];
  }

  // Bounding box of the placed floor, in squares.
  bounds() {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    // Only committed floor counts: this year's expansion is not buildable until next year
    // (Q12), and its own legal positions are measured against the factory without it.
    for (const fl of this.floors.copy()) {
      if (!fl.committed) continue;
      const f = fl.footprint();
      minX = Math.min(minX, fl.x);
      minY = Math.min(minY, fl.y);
      maxX = Math.max(maxX, fl.x + f.w);
      maxY = Math.max(maxY, fl.y + f.h);
    }
    if (minX === Infinity) return { minX: 0, minY: 0, maxX: 12, maxY: 12 };
    return { minX, minY, maxX, maxY };
  }

  // ------------------------------------------------------------------ fit (P3.5)
  fits(x: number, y: number, f: Footprint, exclude?: FloorPiece): boolean {
    const g = this.grid();
    for (const c of cellsOf(x, y, f)) {
      const k = cellKey(c.x, c.y);
      if (!g.floor.has(k)) return false;
      const occ = g.occupied.get(k);
      if (occ && occ !== exclude) return false;
    }
    return true;
  }
  // Every top-left where a footprint physically fits (floor squares, no overlap). This is
  // what drops are constrained by; everything else is relaxed and shown (UX1, UX2).
  fittingPositions(f: Footprint, exclude?: FloorPiece): Cell[] {
    const b = this.bounds();
    const out: Cell[] = [];
    for (let y = b.minY; y <= b.maxY - f.h; y++) for (let x = b.minX; x <= b.maxX - f.w; x++) if (this.fits(x, y, f, exclude)) out.push({ x, y });
    return out;
  }

  // ------------------------------------------------------------------ adjacency (P3.4, P3.6)
  adjacentPieces(p: FloorPiece): FloorPiece[] {
    const g = this.grid();
    const out = new Set<FloorPiece>();
    for (const c of p.cells()) for (const d of NEIGHBOURS) {
      const q = g.occupied.get(cellKey(c.x + d.x, c.y + d.y));
      if (q && q !== p) out.add(q);
    }
    return [...out];
  }
  adjacentToBay(p: FloorPiece): boolean {
    const g = this.grid();
    for (const c of p.cells()) for (const d of NEIGHBOURS) if (g.bay.has(cellKey(c.x + d.x, c.y + d.y))) return true;
    return false;
  }
  // Would a footprint at (x, y) connect to a loading bay (P3.6)? Something edge-adjacent is a
  // bay square or a piece that is already legal (problems as of the last refreshValidity).
  wouldConnectAt(x: number, y: number, f: Footprint, exclude?: FloorPiece): boolean {
    const g = this.grid();
    for (const c of cellsOf(x, y, f)) for (const d of NEIGHBOURS) {
      const k = cellKey(c.x + d.x, c.y + d.y);
      if (g.bay.has(k)) return true;
      const q = g.occupied.get(k);
      if (q && q !== exclude && q.problems.length === 0) return true;
    }
    return false;
  }
  connectedToBay(p: FloorPiece): boolean {
    const seen = new Set<FloorPiece>([p]);
    const queue = [p];
    while (queue.length) {
      const cur = queue.shift()!;
      if (this.adjacentToBay(cur)) return true;
      for (const n of this.adjacentPieces(cur)) if (!seen.has(n)) { seen.add(n); queue.push(n); }
    }
    return false;
  }

  // ------------------------------------------------------------------ zones (P3.13–P3.15)
  zones(): Zone[] {
    const zp: ZonePiece[] = [];
    for (const t of this.placedTiles()) {
      if (t.kind === "station") zp.push({ id: t.id!, kind: "station", step: t.step(), stationId: t.stationId, x: t.x, y: t.y, footprint: t.footprint(), rotation: t.rotation });
      if (t.kind === "mainline") zp.push({ id: t.id!, kind: "mainline", x: t.x, y: t.y, footprint: t.footprint(), rotation: t.rotation, flipped: t.flipped });
    }
    for (const i of this.indicators.copy()) zp.push({ id: i.id!, kind: "indicator", step: i.step, x: i.x, y: i.y, footprint: i.footprint(), rotation: 0 });
    return computeZones(zp);
  }
  zoneOf(p: FloorPiece, zones = this.zones()): Zone | undefined {
    return zones.find((z) => z.pieceIds.includes(p.id!));
  }
  // Mainlines touching a zone: the mainlines whose side is part of it.
  zoneMainlines(z: Zone): FactoryTile[] {
    const ids = new Set(z.mainlineSides.map((s) => s.mainlineId));
    return this.placedTiles().filter((t) => t.kind === "mainline" && ids.has(t.id!));
  }
  // P4.5: a mainline's spec on a dimension = indicators of that dimension in any of its zones.
  mainlineSpec(m: FactoryTile, dimension: string): number {
    let n = 0;
    for (const z of this.zones()) {
      if (!z.mainlineSides.some((s) => s.mainlineId === m.id)) continue;
      for (const i of this.indicators.copy()) if (z.pieceIds.includes(i.id!) && i.dimension === dimension) n++;
    }
    return n;
  }

  // ------------------------------------------------------------------ validity (UX2, UX3)
  problemsFor(p: FloorPiece, zones: Zone[]): string[] {
    const out: string[] = [];
    if (!this.fits(p.x, p.y, p.footprint(), p)) out.push("Must sit fully on black floor squares without overlapping.");
    if (!this.connectedToBay(p)) out.push("Must connect through adjacent tiles to a loading bay.");
    const adj = this.adjacentPieces(p);
    if (p instanceof FactoryTile) {
      if (p.kind === "mainline" && !adj.some((a) => a instanceof FactoryTile && a.kind === "dealership")) out.push("A mainline must be adjacent to a dealership.");
      if (p.kind === "dealership" && !adj.some((a) => a instanceof FactoryTile && a.kind === "mainline")) out.push("A dealership must be adjacent to a mainline.");
      if (p.kind === "department" && p.departmentType === "marketing" && !adj.some((a) => a instanceof FactoryTile && a.kind === "dealership")) out.push("A marketing department must be adjacent to a dealership.");
      if (p.kind === "station") {
        const z = this.zoneOf(p, zones);
        if (!z || z.mainlineSides.length === 0) out.push("A station must be in a manufacturing zone that includes a mainline side of its step.");
        if (z) {
          const dup = z.pieceIds.filter((id) => { const t = this.pieces.find((q) => q.id === id); return t && t.stationId === p.stationId; });
          if (dup.length > 1) out.push(`Two ${station(p.stationId!).label} stations cannot share a manufacturing zone.`);
        }
        if (!this.indicators.some((i) => i.station === p && adj.includes(i))) out.push("A station needs at least one spec indicator pointing at it.");
      }
    } else {
      if (!adj.includes(p.station)) out.push(`Must be adjacent to its ${p.station?.label() ?? "station"}.`);
    }
    return out;
  }
  refreshValidity(): void {
    this.recomputeGrid();
    this.syncHand();
    this.syncBenchCounts();
    const zones = this.zones();
    for (const t of this.pieces.copy()) t.problems = t.placed ? this.problemsFor(t, zones) : [];
    for (const i of this.indicators.copy()) i.problems = this.problemsFor(i, zones);
    for (const fl of this.floors.copy()) fl.problems = fl.committed ? [] : this.expansionProblems(fl);
    this.assignLayers();
  }
  violations(): FloorPiece[] {
    return this.placedPieces().filter((p) => p.problems.length > 0);
  }

  // The squares edge-adjacent to a piece, outside it: where its spec indicators may go (UX4).
  ringCells(p: FloorPiece): Cell[] {
    const fp = p.footprint();
    const seen = new Set<string>();
    const out: Cell[] = [];
    for (const c of cellsOf(p.x, p.y, fp)) for (const d of NEIGHBOURS) {
      const n = { x: c.x + d.x, y: c.y + d.y };
      const inside = n.x >= p.x && n.x < p.x + fp.w && n.y >= p.y && n.y < p.y + fp.h;
      const k = cellKey(n.x, n.y);
      if (!inside && !seen.has(k)) { seen.add(k); out.push(n); }
    }
    return out;
  }

  // Overlapping pieces (only possible mid-arrangement) are lifted so none disappears. Within a
  // transitively-overlapping cluster, smaller pieces always sit above bigger ones (so a spec
  // indicator is never hidden under a tile); between pieces of equal size, invalid ones sit
  // above valid or fixed ones. Pieces that overlap nothing stay on the floor. The result is
  // stored on each piece (a render must not read other chits) and refreshed with validity.
  assignLayers(): void {
    const placed = this.placedPieces();
    const keys = new Map(placed.map((q) => [q, new Set(q.cells().map((c) => cellKey(c.x, c.y)))]));
    const overlaps = (a: FloorPiece, b: FloorPiece) => [...keys.get(a)!].some((k) => keys.get(b)!.has(k));
    const area = (q: FloorPiece) => q.footprint().w * q.footprint().h;
    const done = new Set<FloorPiece>();
    for (const start of placed) {
      if (done.has(start)) continue;
      const cluster = [start];
      done.add(start);
      for (let i = 0; i < cluster.length; i++)
        for (const q of placed) if (!done.has(q) && overlaps(cluster[i], q)) { done.add(q); cluster.push(q); }
      cluster.sort((a, b) => area(b) - area(a) || (a.problems.length ? 1 : 0) - (b.problems.length ? 1 : 0));
      cluster.forEach((q, i) => { const layer = cluster.length === 1 ? 0 : i; if (q.layer !== layer) q.layer = layer; });
    }
  }

  // ------------------------------------------------------------------ expansions (P3.21–P3.23)
  expansionPositions(tile: FloorTile): Cell[] {
    const g = this.grid();
    const b = this.bounds();
    const f = tile.footprint();
    const out: Cell[] = [];
    for (let y = b.minY - f.h; y <= b.maxY; y++) {
      for (let x = b.minX - f.w; x <= b.maxX; x++) {
        const cells = cellsOf(x, y, f);
        if (cells.some((c) => g.floorAll.has(cellKey(c.x, c.y)))) continue; // no overlap
        if (cells.some((c) => g.keepClear.has(cellKey(c.x, c.y)))) continue; // P3.23 existing bays
        const touches = cells.some((c) => NEIGHBOURS.some((d) => g.floorAll.has(cellKey(c.x + d.x, c.y + d.y))));
        if (!touches) continue; // P3.22 adjacent to the existing factory
        const probe = new FloorTile().set((t) => { t.kind = "expansion"; t.x = x; t.y = y; t.rotation = tile.rotation; t.flipped = tile.flipped; });
        if (probe.keepClearCells().some((c) => g.floorAll.has(cellKey(c.x, c.y)))) continue; // P3.23 new bay
        out.push({ x, y });
      }
    }
    return out;
  }
  // P3.22, P3.23: what is wrong with this year's expansion where it lies (nothing if legal).
  expansionProblems(tile: FloorTile): string[] {
    const ok = this.expansionPositions(tile).some((c) => c.x === tile.x && c.y === tile.y);
    return ok ? [] : ["An expansion must touch the factory along the grid, may not cover a keep-clear strip, and its own keep-clear strip must stay free."];
  }
  // The first legal spot for a new expansion, trying each orientation in turn.
  placeNewExpansion(tile: FloorTile): void {
    for (const flipped of [false]) // P3.22: the tile's back is blank, so it is never turned over
      for (let r = 0; r < 4; r++) {
        tile.rotation = r;
        tile.flipped = flipped;
        const at = this.expansionPositions(tile)[0];
        if (at) { tile.x = at.x; tile.y = at.y; return; }
      }
  }
  pendingExpansion(): FloorTile | undefined {
    return this.floors.find((fl) => !fl.committed);
  }


  // ------------------------------------------------------------------ build stock (UX6)
  // What a player may build this year lives in their Catalogue (under the root, off the
  // table), one entry per kind with the number left, offered through the "Add" gallery.
  // The gallery: catalogue entries with at least one left.
  benchTops(): FactoryTile[] {
    return this.benchTiles().filter((t) => t.benchCount > 0);
  }
  // Each catalogue entry's "left" count: its maximum less the copies of that kind placed this
  // build and not yet paid for.
  syncBenchCounts(): void {
    const used = new Map<string, number>();
    for (const t of this.placedTiles()) if (!t.committed && !t.paid) used.set(t.signature(), (used.get(t.signature()) ?? 0) + 1);
    for (const e of this.benchTiles()) {
      const n = Math.max(0, e.catalogueMax - (used.get(e.signature()) ?? 0));
      if (e.benchCount !== n) e.benchCount = n;
    }
  }
  // Where a newly added piece lands: the first free spot that touches a loading bay or a
  // built tile (so it is likely to be legal), else any free spot, else the floor's corner
  // (shown invalid). The player then drags it where they want it.
  spotFor(tile: FactoryTile): Cell {
    const fp = tile.footprint();
    const free = this.onFloorPositions(fp).filter((c) => this.fits(c.x, c.y, fp, tile));
    const g = this.grid();
    const touches = (c: Cell) =>
      cellsOf(c.x, c.y, fp).some((q) => NEIGHBOURS.some((d) => {
        const k = cellKey(q.x + d.x, q.y + d.y);
        return g.bay.has(k) || (g.occupied.has(k) && g.occupied.get(k) !== tile);
      }));
    const b = this.bounds();
    return free.find(touches) ?? free[0] ?? { x: b.minX, y: b.minY };
  }
  // The hand deck lies just below the floor at its left end; it stores its own position (a
  // render must not read other chits' state, or it goes stale).
  syncHand(): void {
    const hand = (this.parent as unknown as { hand?: { x: number; y: number } } | undefined)?.hand;
    if (!hand) return;
    // In the main floor's loading bay: nothing is ever built on a bay, so the deck never collides
    // with a piece, and it adds nothing to the panel's framing (developer request).
    const bay = this.floors.get(0)?.bayRect();
    if (!bay) return;
    const hx = (bay.x + bay.w / 2) * BASE_SIZE;
    const hy = (bay.y + bay.h / 2) * BASE_SIZE;
    if (hand.x !== hx || hand.y !== hy) Object.assign(hand, { x: hx, y: hy });
  }
  // Every top-left where a footprint lies entirely on floor squares (bays excluded),
  // overlapping or not: the drop positions offered while arranging (UX1a).
  onFloorPositions(f: Footprint): Cell[] {
    const g = this.grid();
    const b = this.bounds();
    const out: Cell[] = [];
    for (let y = b.minY; y <= b.maxY - f.h; y++)
      for (let x = b.minX; x <= b.maxX - f.w; x++) if (cellsOf(x, y, f).every((c) => g.floor.has(cellKey(c.x, c.y)))) out.push({ x, y });
    return out;
  }



  // ------------------------------------------------------------------ drop-target pool
  // Targets are keyed by geometry and reused across prompts; creating and destroying a few
  // hundred chits per pick is what makes an arrangement loop crawl. `resetDropTargets()`
  // starts a new generation, `getDropTarget()` claims or creates, `pruneDropTargets()`
  // removes what this generation did not claim.
  private _targetGen = 0;
  private _claimed = new Map<string, DropTarget>();
  resetDropTargets(): void {
    this._targetGen++;
    this._index = undefined;
    this._claimed = new Map();
  }
  private _index?: Map<string, DropTarget>; // rebuilt per generation; never state
  getDropTarget(x: number, y: number, w: number, h: number): DropTarget {
    const k = `${x},${y},${w},${h}`;
    let t = this._claimed.get(k);
    if (t) return t;
    if (!this._index) this._index = new Map(this.targets.copy().map((d) => [`${d.x},${d.y},${d.w},${d.h}`, d]));
    t = this._index.get(k);
    if (!t) {
      t = new DropTarget().set((d) => { d.x = x; d.y = y; d.w = w; d.h = h; });
      this.targets.add(t);
      this._index.set(k, t);
    }
    this._claimed.set(k, t);
    return t;
  }
  pruneDropTargets(): void {
    const keep = new Set(this._claimed.values());
    for (const t of this.targets.copy()) if (!keep.has(t)) t.removeFromParent();
  }

  render(spec: ChitRenderSpec): void {
    // Bookkeeping only (expansions left, the catalogue link); its floors and tiles show changes.
    spec.worthSlidingToPanelToShowChange = false;
  }
}
