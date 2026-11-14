// Static rulebook and component data for Horseless Carriage.
// Every table here is literal (never a formula standing in for something printed), an array of
// objects (never parallel arrays), and asserted at module load. Rule ids refer to RULES.md.

// ---------------------------------------------------------------------------------------------
// Sizes — one unit is one factory floor square (M9). Everything else derives from it.
// ---------------------------------------------------------------------------------------------
export const BASE_SIZE = 1;
export const TILE_THICKNESS = 0.08;
// Resting heights. The engine places a chit so its BOTTOM is at offsetZ, measured from its
// parent's origin, which is the parent's geometric centre. So a piece on its parent's top face
// gets offsetZ = parentThickness / 2, and a panel-level chit on the table gets TABLE_Z.
export const TABLE_Z = -0.02;
// Factory pieces slide about 30% faster than the engine's default (250 ms per unit), so building
// feels brisk (developer request); a spec indicator swings to face its station four times as fast
// as the default spin (2000 ms per full turn).
export const FACTORY_OFFSET_SPEED = 175;
export const INDICATOR_ROTATION_SPEED = 500;
export const FLOOR_THICKNESS = 0.12; // thick cardboard (developer: boards should feel thick)
export const BOARD_THICKNESS = 0.2; // thick cardboard, like the real board
export const BRAND_THICKNESS = 0.27; // extruded brand pieces, at every size (svg.ts)
export const CAR_THICKNESS = 0.252; // extruded car meeple (svg.ts: depth 35 x scale 0.0072)
export const NICHE = BASE_SIZE * 2; // one market niche (C4)
export const TRACK_SLOT = 2.1; // one research-track slot, so 7 slots ≈ the 16-unit board edge
export const TRACK_HEIGHT = 3.2;
export const AXIS_HEIGHT = 1.2;
export const CARD_W = 2;
export const CARD_H = 2.8;
export const SPACE = 1.4; // one planning-office / punch-clock space

// ---------------------------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------------------------
export const dimensions = ["speed", "reliability", "design", "range", "safety"] as const;
export type Dimension = (typeof dimensions)[number];

export const steps = ["A", "B", "C", "D"] as const;
export type Step = (typeof steps)[number];

export const carTypes = ["car", "sports", "truck"] as const;
export type CarType = (typeof carTypes)[number];

export const playerColors = ["red", "blue", "purple", "green", "yellow"] as const;
export type PlayerColor = (typeof playerColors)[number];

export function dimensionLabel(d: Dimension): string {
  switch (d) {
    case "speed":
      return "Speed";
    case "reliability":
      return "Reliability";
    case "design":
      return "Design";
    case "range":
      return "Range";
    case "safety":
      return "Safety";
  }
}

export function dimensionAbbrev(d: Dimension): string {
  switch (d) {
    case "speed":
      return "Spd";
    case "reliability":
      return "Rel";
    case "design":
      return "Des";
    case "range":
      return "Rng";
    case "safety":
      return "Saf";
  }
}

export function carTypeLabel(t: CarType): string {
  switch (t) {
    case "car":
      return "car";
    case "sports":
      return "sports car";
    case "truck":
      return "truck";
  }
}

// P5.9 — bonus per car sold, by type.
export function saleBonus(t: CarType): number {
  switch (t) {
    case "car":
      return 0;
    case "truck":
      return 1;
    case "sports":
      return 2;
  }
}

// ---------------------------------------------------------------------------------------------
// Colours (LAYOUT.md §6). Status colours stay out of both the player and dimension palettes.
// ---------------------------------------------------------------------------------------------
export const COLOR_SELECTED = "#19e6ff";
export const COLOR_OUTLINE = "#0d0d0d"; // default outline so every piece reads against the table
// The outline a piece of this colour should get: its own colour taken halfway toward black,
// except for very dark pieces, which go halfway toward white. A light outline on a medium
// colour reads as "selected" (developer note), so only near-black pieces get one.
export function outlineFor(hex: string): string {
  const n = parseInt(hex.replace("#", "").slice(0, 6), 16);
  const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const lum = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
  const target = lum < 0.18 ? 255 : 0;
  return "#" + rgb.map((c) => Math.round(c + (target - c) * 0.5).toString(16).padStart(2, "0")).join("");
}
// A piece turned over (rotateY by a half turn) swings its edges down by half its width. The
// engine lifts it by (turns × zLiftRotationMultiplier), half a turn being 0.5, so this lifts it
// clear of the table by its half-width plus a little (developer request).
export const flipLift = (halfWidth: number) => 2 * (halfWidth + 0.15);
export const TEXELS_PER_SQUARE = 128; // face canvases are sized footprint × this, never stretched (crisp at 2400-wide captures)
export const COLOR_INVALID = "#ff2bd6";
export const COLOR_TABLE = "#2b2b2b";
export const COLOR_FLOOR = "#1c1c1c"; // the black factory floor (M9)
export const COLOR_BAY = "#9a9a9a"; // loading bay stripes
export const COLOR_PAPER = "#efece4";

// The brand pieces' wood colours, sampled from the mod's cut-outs (raw scans/tts/065–069).
export function playerHex(c: PlayerColor): string {
  switch (c) {
    case "red":
      return "#e13b2f";
    case "blue":
      return "#3d5da8";
    case "purple":
      return "#9a73aa";
    case "green":
      return "#7fbe6f";
    case "yellow":
      return "#f4cf3c";
  }
}

// Track band colours, sampled from the tracks scan.
export function dimensionHex(d: Dimension): string {
  switch (d) {
    case "speed":
      return "#b5342c";
    case "reliability":
      return "#3f6fa8";
    case "design":
      return "#4a3a66";
    case "range":
      return "#4f6b3a";
    case "safety":
      return "#c9892d";
  }
}

export function carTypeHex(t: CarType): string {
  switch (t) {
    case "car":
      return "#4e2d3f"; // purple normal cars, sampled from the mod's meeple (raw scans/tts/070)
    case "sports":
      return "#326f78"; // teal sports cars (076)
    case "truck":
      return "#aa4525"; // orange trucks (077)
  }
}

// Step hatching fill, from the station tiles (A diamond light, B lined light grey,
// C diagonal grey, D crosshatch dark).
export function stepHex(s: Step): string {
  switch (s) {
    case "A":
      return "#e9e7df";
    case "B":
      return "#b9b7b2";
    case "C":
      return "#7d7b77";
    case "D":
      return "#4a4947";
  }
}

// ---------------------------------------------------------------------------------------------
// Technology stations (M12). Footprint is width × height as printed; tiles rotate.
// ---------------------------------------------------------------------------------------------
export const stationIds = [
  "chassis",
  "carBody",
  "radiator",
  "windscreen",
  "bumper",
  "engine",
  "hub",
  "fuelTank",
  "steeringWheel",
  "brake",
  "dashboard",
  "paint",
  "battery",
  "tire",
  "headlamp",
  "windowPane",
  "horn",
] as const;
export type StationId = (typeof stationIds)[number];

export interface Footprint {
  w: number;
  h: number;
}

export interface IndicatorSlot {
  dimension: Dimension;
  slot: number; // 1..6 on that dimension's research track (M5)
}

export interface StationSpec {
  id: StationId;
  label: string;
  step: Step;
  footprint: Footprint;
  slots: IndicatorSlot[];
  copiesPerSet: number;
}

export const STATIONS: readonly StationSpec[] = [
  { id: "chassis", label: "Chassis", step: "A", footprint: { w: 3, h: 4 }, slots: [{ dimension: "reliability", slot: 2 }, { dimension: "reliability", slot: 6 }], copiesPerSet: 1 },
  { id: "carBody", label: "Car body", step: "A", footprint: { w: 3, h: 3 }, slots: [{ dimension: "reliability", slot: 3 }, { dimension: "design", slot: 5 }], copiesPerSet: 1 },
  { id: "radiator", label: "Radiator", step: "A", footprint: { w: 2, h: 3 }, slots: [{ dimension: "range", slot: 2 }, { dimension: "range", slot: 5 }], copiesPerSet: 2 },
  { id: "windscreen", label: "Windscreen", step: "A", footprint: { w: 2, h: 3 }, slots: [{ dimension: "design", slot: 2 }], copiesPerSet: 2 },
  { id: "bumper", label: "Bumper", step: "A", footprint: { w: 4, h: 2 }, slots: [{ dimension: "reliability", slot: 4 }, { dimension: "safety", slot: 4 }], copiesPerSet: 2 },
  { id: "engine", label: "Engine", step: "B", footprint: { w: 4, h: 4 }, slots: [{ dimension: "speed", slot: 1 }, { dimension: "range", slot: 1 }, { dimension: "reliability", slot: 5 }], copiesPerSet: 1 },
  { id: "hub", label: "Hub", step: "B", footprint: { w: 3, h: 4 }, slots: [{ dimension: "speed", slot: 3 }, { dimension: "range", slot: 6 }], copiesPerSet: 1 },
  { id: "fuelTank", label: "Fuel tank", step: "B", footprint: { w: 4, h: 2 }, slots: [{ dimension: "range", slot: 4 }, { dimension: "speed", slot: 5 }], copiesPerSet: 1 },
  { id: "steeringWheel", label: "Steering wheel", step: "B", footprint: { w: 3, h: 3 }, slots: [{ dimension: "safety", slot: 3 }, { dimension: "design", slot: 6 }], copiesPerSet: 1 },
  { id: "brake", label: "Brake", step: "B", footprint: { w: 2, h: 2 }, slots: [{ dimension: "safety", slot: 1 }], copiesPerSet: 2 },
  { id: "dashboard", label: "Dashboard", step: "C", footprint: { w: 4, h: 2 }, slots: [{ dimension: "design", slot: 4 }, { dimension: "speed", slot: 6 }], copiesPerSet: 1 },
  { id: "paint", label: "Paint", step: "C", footprint: { w: 2, h: 3 }, slots: [{ dimension: "design", slot: 1 }], copiesPerSet: 2 },
  { id: "battery", label: "Battery", step: "C", footprint: { w: 2, h: 2 }, slots: [{ dimension: "reliability", slot: 1 }], copiesPerSet: 2 },
  { id: "tire", label: "Tire", step: "D", footprint: { w: 3, h: 3 }, slots: [{ dimension: "range", slot: 3 }, { dimension: "speed", slot: 4 }, { dimension: "safety", slot: 6 }], copiesPerSet: 1 },
  { id: "headlamp", label: "Headlamp", step: "D", footprint: { w: 2, h: 3 }, slots: [{ dimension: "design", slot: 3 }, { dimension: "safety", slot: 5 }], copiesPerSet: 1 },
  { id: "windowPane", label: "Window pane", step: "D", footprint: { w: 4, h: 2 }, slots: [{ dimension: "safety", slot: 2 }], copiesPerSet: 2 },
  { id: "horn", label: "Horn", step: "D", footprint: { w: 2, h: 2 }, slots: [{ dimension: "speed", slot: 2 }], copiesPerSet: 2 },
];

export function station(id: StationId): StationSpec {
  const s = STATIONS.find((st) => st.id === id);
  if (!s) throw new Error(`unknown station ${id}`);
  return s;
}

// ---------------------------------------------------------------------------------------------
// Research tracks (M5, M6): derived by inverting the station badges, then asserted.
// ---------------------------------------------------------------------------------------------
export const TRACK_SLOTS = 6;
export const TRACK_PUNCH_CLOCK_SLOTS: readonly number[] = [4, 6]; // M6, every track

export function trackSlotStation(d: Dimension, slot: number): StationId {
  const matches = STATIONS.filter((s) => s.slots.some((sl) => sl.dimension === d && sl.slot === slot));
  if (matches.length !== 1) throw new Error(`track ${d} slot ${slot} has ${matches.length} stations`);
  return matches[0].id;
}

// The printed order, for the load-time cross-check against the tracks scan (M5).
const PRINTED_TRACKS: Record<Dimension, StationId[]> = {
  speed: ["engine", "horn", "hub", "tire", "fuelTank", "dashboard"],
  reliability: ["battery", "chassis", "carBody", "bumper", "engine", "chassis"],
  design: ["paint", "windscreen", "headlamp", "dashboard", "carBody", "steeringWheel"],
  range: ["engine", "radiator", "tire", "fuelTank", "radiator", "hub"],
  safety: ["brake", "windowPane", "steeringWheel", "bumper", "headlamp", "tire"],
};

// ---------------------------------------------------------------------------------------------
// Mainlines (M13), dealerships (M14), departments (M15), indicators (M16)
// ---------------------------------------------------------------------------------------------
export interface MainlineSpec {
  type: CarType;
  footprint: Footprint;
  copiesPerSet: number;
}
export const MAINLINES: readonly MainlineSpec[] = [
  { type: "car", footprint: { w: 4, h: 3 }, copiesPerSet: 2 },
  { type: "sports", footprint: { w: 5, h: 3 }, copiesPerSet: 2 },
  { type: "truck", footprint: { w: 6, h: 3 }, copiesPerSet: 2 },
];
export function mainline(type: CarType): MainlineSpec {
  return MAINLINES.find((m) => m.type === type)!;
}

// A mainline's four sectors each own one edge of the tile as printed (M13).
export type Edge = "top" | "right" | "bottom" | "left";
export const MAINLINE_SECTOR_EDGE: Record<Step, Edge> = { A: "bottom", B: "right", C: "left", D: "top" };

export const departmentTypes = ["research", "planning", "marketing"] as const;
export type DepartmentType = (typeof departmentTypes)[number];
export interface DepartmentSpec {
  type: DepartmentType;
  footprint: Footprint;
  label: string;
}
export const DEPARTMENTS: readonly DepartmentSpec[] = [
  { type: "research", footprint: { w: 3, h: 3 }, label: "Research" },
  { type: "planning", footprint: { w: 2, h: 3 }, label: "Planning" },
  { type: "marketing", footprint: { w: 4, h: 3 }, label: "Marketing" },
];
export function department(type: DepartmentType): DepartmentSpec {
  return DEPARTMENTS.find((d) => d.type === type)!;
}
export const RESEARCH_DEPARTMENTS_PER_SET = 5; // Q6: TTS mod stack 25 = 5 colours × 5 (Vassal agrees)
export const PLANNING_DEPARTMENTS_PER_SET = 6; // Q6: TTS mod stack 30 = 5 colours × 6 (Vassal agrees)
export const MARKETING_DEPARTMENTS_PER_PLAYER = 4; // C26
export const DEALERSHIPS_PER_PLAYER = 3; // C25

// Each player's three dealerships, in the three printed sizes (M14). Names are read off the
// Tabletop Simulator mod's tiles (raw scans/tts/078–092), whose image sizes give the printed
// footprint: 320×240 is 4×3, 320×320 is 4×4, 400×320 is 5×4.
export interface DealershipSpec {
  index: 0 | 1 | 2;
  footprint: Footprint;
}
export const DEALERSHIPS: readonly DealershipSpec[] = [
  { index: 0, footprint: { w: 4, h: 3 } },
  { index: 1, footprint: { w: 4, h: 4 } },
  { index: 2, footprint: { w: 5, h: 4 } },
];
export const DEALERSHIP_NAMES: Record<PlayerColor, [string, string, string]> = {
  green: ["Luton", "Dunstable", "Ellesmere Port"],
  blue: ["Detroit", "Dearborn", "Kansas City"],
  red: ["Torino", "Grugliasco", "Pomigliano d'Arco"],
  purple: ["Sochaux", "Fives-Lille", "Audincourt"],
  yellow: ["Mannheim", "Stuttgart", "Ladenburg"],
};

export const INDICATOR_FOOTPRINT: Footprint = { w: 1, h: 1 }; // M16


// ---------------------------------------------------------------------------------------------
// Factory floors (M9, M10). Coordinates: x to the right, y downward, in squares.
// ---------------------------------------------------------------------------------------------
export interface FloorSpec {
  kind: "main" | "expansion";
  w: number;
  h: number;
  bay: { x: number; y: number; w: number; h: number }; // top-left of the bay in tile coords
  keepClearEdge: Edge; // the one outer edge of the bay carrying the light line
}
export const MAIN_FLOOR: FloorSpec = { kind: "main", w: 12, h: 12, bay: { x: 7, y: 0, w: 5, h: 5 }, keepClearEdge: "top" };
export const EXPANSION_FLOOR: FloorSpec = { kind: "expansion", w: 6, h: 8, bay: { x: 0, y: 6, w: 2, h: 2 }, keepClearEdge: "bottom" };
export const EXPANSIONS_PER_PLAYER = 6; // S11

// ---------------------------------------------------------------------------------------------
// Planning office and tracks (M22–M25, C37)
// ---------------------------------------------------------------------------------------------
export const GANTT_MAX = 20;
export const GANTT_PUNCH_CLOCK = 10;
export const CAPACITY_MIN = 1;
export const CAPACITY_MAX = 5;
export const CAPACITY_PUNCH_CLOCK = 5;
export const FOCUS_SLOTS = 5;
export const PUNCH_CLOCK_TOP = 40;
export const PUNCH_CLOCK_START: Record<number, number> = { 3: 24, 4: 32, 5: 40 }; // M25

// ---------------------------------------------------------------------------------------------
// Market board (M1–M4, C31, P8.7, P8.10)
// ---------------------------------------------------------------------------------------------
// The slab serif the components are printed in (step letters, track names, "Rng").
export const PRINT_FONT = "'Roboto Slab', Rockwell, Georgia, serif";

export const BOARD_SIZE = 8;
// The printed board is a little larger than its 8×8 grid: half its width and height in world
// units, measured from the board photo (the grid's frame is 16 units across).
// (the crop is the 8×8 frame, its thick line and a sliver of paper: 2422 px, frame 2362 px)
export const MARKET_EDGE = (2422 / (2362 / 16)) / 2;
export type Quadrant = 1 | 2 | 3 | 4;
export interface QuadrantSpec {
  quadrant: Quadrant;
  row0: number; // 1-based board row of the quadrant's top row
  col0: number; // 1-based board col of the quadrant's left column
}
// M1: I bottom-left, II bottom-right, III top-left, IV top-right.
export const QUADRANTS: readonly QuadrantSpec[] = [
  { quadrant: 1, row0: 5, col0: 1 },
  { quadrant: 2, row0: 5, col0: 5 },
  { quadrant: 3, row0: 1, col0: 1 },
  { quadrant: 4, row0: 1, col0: 5 },
];
export function quadrantOf(row: number, col: number): Quadrant {
  const q = QUADRANTS.find((s) => row >= s.row0 && row < s.row0 + 4 && col >= s.col0 && col < s.col0 + 4);
  if (!q) throw new Error(`no quadrant for ${row},${col}`);
  return q.quadrant;
}

// M2: price segments by anti-diagonal distance from the bottom-left niche.
export type Segment = 1 | 2 | 3 | 4;
export function segmentOf(row: number, col: number): Segment {
  const d = BOARD_SIZE - row + (col - 1);
  if (d <= 3) return 1;
  if (d <= 7) return 2;
  if (d <= 11) return 3;
  return 4;
}
export const PRICE_MARKERS: readonly number[] = [6, 4, 3, 2]; // M3, highest first
// The niche each price marker sits in when assigned to a segment (p.3 picture).
export const PRICE_MARKER_HOME: Record<Segment, { row: number; col: number }> = {
  1: { row: 6, col: 1 },
  2: { row: 2, col: 1 },
  3: { row: 3, col: 5 },
  4: { row: 1, col: 7 },
};

export const windowSizes = ["S", "M", "L"] as const;
export type WindowSize = (typeof windowSizes)[number];
export const WINDOW_DIMENSIONS: Record<WindowSize, Footprint> = { S: { w: 2, h: 1 }, M: { w: 2, h: 2 }, L: { w: 3, h: 3 } }; // C31
// P4.8: marketing departments adjacent → window size (3+ → L, Q13).
export function windowSizeFor(marketing: number): WindowSize {
  return marketing <= 0 ? "S" : marketing === 1 ? "M" : "L";
}

export const SPARK_BUYER_CAP = 2; // P8.7 — max buyers per spark of a type on a niche

// ---------------------------------------------------------------------------------------------
// Cards (M19, M20). Cells are (row, col) within the 4×4, row 1 at the top, col 1 at the left,
// and map unrotated onto the quadrant (M21).
// ---------------------------------------------------------------------------------------------
export interface SparkSpec {
  type: CarType;
  row: number;
  col: number;
  count: number; // 2 for the double icon
}
export interface CardSpec {
  id: string;
  year: number; // 0 for neutral cards
  clocks: number;
  sparks: SparkSpec[];
  neutral: boolean;
}

const sp = (type: CarType, row: number, col: number, count = 1): SparkSpec => ({ type, row, col, count });

export const PLAYER_DECK: readonly CardSpec[] = [
  { id: "P1", year: 3, clocks: 3, neutral: false, sparks: [sp("car", 2, 2), sp("car", 4, 2), sp("car", 4, 3)] },
  { id: "P2", year: 2, clocks: 2, neutral: false, sparks: [sp("car", 2, 3), sp("car", 3, 2)] },
  { id: "P3", year: 1, clocks: 1, neutral: false, sparks: [sp("car", 4, 2)] },
  { id: "P4", year: 3, clocks: 0, neutral: false, sparks: [sp("car", 2, 4), sp("car", 3, 4), sp("car", 4, 1)] },
  { id: "P5", year: 4, clocks: 1, neutral: false, sparks: [sp("car", 1, 3), sp("car", 1, 4, 2), sp("car", 2, 3)] },
  { id: "P6", year: 1, clocks: 0, neutral: false, sparks: [sp("car", 4, 3)] },
  { id: "P7", year: 2, clocks: 1, neutral: false, sparks: [sp("truck", 3, 2)] },
  { id: "P8", year: 1, clocks: 0, neutral: false, sparks: [sp("truck", 4, 3)] },
  { id: "P9", year: 1, clocks: 0, neutral: false, sparks: [sp("sports", 3, 4)] },
  { id: "P10", year: 3, clocks: 1, neutral: false, sparks: [sp("sports", 1, 4), sp("sports", 2, 3), sp("car", 3, 1)] },
  { id: "P11", year: 3, clocks: 3, neutral: false, sparks: [sp("truck", 2, 1), sp("truck", 2, 2), sp("truck", 4, 1)] },
  { id: "P12", year: 2, clocks: 4, neutral: false, sparks: [] },
  { id: "P13", year: 2, clocks: 0, neutral: false, sparks: [sp("car", 3, 1), sp("car", 3, 2)] },
  { id: "P14", year: 2, clocks: 2, neutral: false, sparks: [sp("truck", 1, 1), sp("truck", 3, 1)] },
  { id: "P15", year: 2, clocks: 2, neutral: false, sparks: [sp("sports", 1, 2)] },
  { id: "P16", year: 3, clocks: 3, neutral: false, sparks: [sp("sports", 1, 3), sp("sports", 2, 4), sp("car", 3, 2)] },
  { id: "P17", year: 3, clocks: 1, neutral: false, sparks: [sp("truck", 3, 3), sp("truck", 4, 2), sp("truck", 4, 4)] },
];

export const NEUTRAL_DECK: readonly CardSpec[] = [
  { id: "N1", year: 0, clocks: 0, neutral: true, sparks: [sp("car", 4, 1)] },
  { id: "N2", year: 0, clocks: 0, neutral: true, sparks: [sp("car", 3, 1)] },
  { id: "N3", year: 0, clocks: 0, neutral: true, sparks: [sp("car", 3, 2)] },
  { id: "N4", year: 0, clocks: 0, neutral: true, sparks: [sp("car", 2, 1)] },
  { id: "N5", year: 0, clocks: 0, neutral: true, sparks: [sp("car", 4, 3)] },
  { id: "N6", year: 0, clocks: 0, neutral: true, sparks: [sp("car", 4, 2)] },
  { id: "N7", year: 0, clocks: 0, neutral: true, sparks: [sp("truck", 4, 1)] },
];

export function cardHasSpecials(c: CardSpec): boolean {
  return c.sparks.some((s) => s.type !== "car");
}

export const MAX_YEARS = 7; // P6.3

// ---------------------------------------------------------------------------------------------
// Load-time assertions — a wrong table should fail the build, not produce a different game.
// ---------------------------------------------------------------------------------------------
(function assertData() {
  if (STATIONS.length !== 17) throw new Error("C27: 17 technology stations");
  const badges = STATIONS.reduce((n, s) => n + s.slots.length, 0);
  if (badges !== 30) throw new Error(`M12: 30 badges expected, got ${badges}`);
  const copies = STATIONS.reduce((n, s) => n + s.copiesPerSet, 0);
  if (copies !== 25) throw new Error(`M12: 25 station tiles per set expected, got ${copies}`);
  for (const d of dimensions) {
    for (let slot = 1; slot <= TRACK_SLOTS; slot++) {
      const got = trackSlotStation(d, slot);
      if (got !== PRINTED_TRACKS[d][slot - 1]) throw new Error(`M5: ${d} slot ${slot} is ${got}, scan shows ${PRINTED_TRACKS[d][slot - 1]}`);
    }
  }
  // M8: the dashboard is design 4 and speed 6.
  const dash = station("dashboard").slots;
  if (!dash.some((s) => s.dimension === "design" && s.slot === 4) || !dash.some((s) => s.dimension === "speed" && s.slot === 6)) throw new Error("M8");
  if (PLAYER_DECK.length !== 17) throw new Error("C33: 17 cards per deck");
  if (PLAYER_DECK.filter((c) => !cardHasSpecials(c)).length !== 8) throw new Error("V1: 8 cards survive the intro variant");
  if (NEUTRAL_DECK.length !== 7 || NEUTRAL_DECK.filter(cardHasSpecials).length !== 1) throw new Error("M20/V1: 7 neutral cards, one with a truck");
  for (const c of [...PLAYER_DECK, ...NEUTRAL_DECK]) {
    for (const s of c.sparks) if (s.row < 1 || s.row > 4 || s.col < 1 || s.col > 4) throw new Error(`card ${c.id} cell out of range`);
  }
  // M30: every neutral buyer lands in segment 1 of quadrant I.
  for (const c of NEUTRAL_DECK) {
    for (const s of c.sparks) if (segmentOf(4 + s.row, s.col) !== 1) throw new Error(`M30: ${c.id} not in segment 1`);
  }
  const counts = [0, 0, 0, 0, 0];
  for (let r = 1; r <= 8; r++) for (let c = 1; c <= 8; c++) counts[segmentOf(r, c)]++;
  if (counts[1] !== 10 || counts[2] !== 26 || counts[3] !== 22 || counts[4] !== 6) throw new Error("M2 segment sizes");
  if (PRICE_MARKERS.length !== 4) throw new Error("C5: four price markers");
  if (MAIN_FLOOR.bay.x + MAIN_FLOOR.bay.w !== MAIN_FLOOR.w || EXPANSION_FLOOR.bay.y + EXPANSION_FLOOR.bay.h !== EXPANSION_FLOOR.h) throw new Error("M9/M10: bays sit in a corner");
})();
