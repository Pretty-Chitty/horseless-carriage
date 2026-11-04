// Every image the game uses is routed through here, keyed by game data, so a component
// without art fails loudly instead of rendering a grey slab. Only one-offs and ingredients
// ship as images: the flat board scan in sections and spaces (scripts/extract-tts.py), the
// scanned tracks, station illustrations, mainlines, departments and floors
// (scripts/extract-art.py), and the few textures and icons the drawn faces are assembled
// from. Everything that is a layout plus data — cards, sparks, indicators, dealerships, price
// markers, minimum-spec tiles, axis strips — is drawn on the client (src/canvas/).
import * as stations from "./assets/stations";
import * as pieces from "./assets/pieces";
import * as board from "./assets/board";
import * as boardCells from "./assets/boardCells";
import * as tracks from "./assets/tracks";
import * as trackSlots from "./assets/trackSlots";
import * as patterns from "./assets/patterns";
import * as ingredients from "./assets/ingredients";
import * as environment from "./assets/environment";
import { CarType, DepartmentType, Dimension, PlayerColor, Step, StationId } from "./consts";
import { ImageSpec } from "@pretty-chitty/core";

function lookup(set: Record<string, unknown>, key: string): ImageSpec {
  const img = set[key] as ImageSpec | undefined;
  if (!img) throw new Error(`no art "${key}" — rerun scripts/extract-art.py and scripts/extract-tts.py`);
  return img;
}

export const stationArt: Record<StationId, ImageSpec> = stations;

export const mainlineArt: Record<CarType, ImageSpec> = {
  car: pieces.mainlineCar,
  sports: pieces.mainlineSports,
  truck: pieces.mainlineTruck,
};
// The back is the mirror image (B and C swap sides) with its letters still reading right.
export const mainlineBackArt: Record<CarType, ImageSpec> = {
  car: pieces.mainlineCarBack,
  sports: pieces.mainlineSportsBack,
  truck: pieces.mainlineTruckBack,
};

// Marketing departments are printed in their owner's colour (the scan is green's; the rest
// are recoloured from it by scripts/extract-art.py).
export const marketingArt: Record<PlayerColor, ImageSpec> = {
  red: pieces.deptMarketing_red,
  blue: pieces.deptMarketing_blue,
  purple: pieces.deptMarketing_purple,
  green: pieces.deptMarketing_green,
  yellow: pieces.deptMarketing_yellow,
};

export const departmentArt: Record<DepartmentType, ImageSpec> = {
  research: pieces.deptResearch,
  planning: pieces.deptPlanning,
  marketing: pieces.deptMarketing,
};

export const stepPattern: Record<Step, ImageSpec> = { A: patterns.stepA, B: patterns.stepB, C: patterns.stepC, D: patterns.stepD };

export const boardArt = board;
export const nicheArt = (row: number, col: number) => lookup(boardCells, `niche_${row}_${col}`);
export const officeCellArt = (track: string, index: number) => lookup(boardCells, `${track}_${index}`);
export const cardCellArt = (row: number, col: number) => lookup(boardCells, `cardcell_${row}_${col}`);

export const trackArt = (d: Dimension) => lookup(tracks, `track_${d}`);
export const trackSlotArt = (d: Dimension, position: number) => lookup(trackSlots, `slot_${d}_${position}`);

// Ingredients of the drawn faces: one square of the dealership's dotted paper, the board's
// plain paper, the white car icon printed on each type's spark counter, the punch-clock
// symbol, and the card backs (one greyscale photograph tinted per player; the neutral black).
export const dotPaperArt = pieces.dotPaper;
export const paperArt = ingredients.paper;
export const cardPaperArt = ingredients.cardPaper; // the cards' own plain cream, cut from a card
export const clockIconArt = ingredients.clockIcon;
export const finishIconArt = ingredients.finishIcon;
export const arrowIconArt = ingredients.arrowIcon;
export const carIconArt = (type: CarType) => lookup(ingredients, `carIcon_${type}`);
// The same white car on its type's ink, as a chip: the log's and prompts' symbol for the type.
export const carTokenArt = (type: CarType) => lookup(ingredients, `carToken_${type}`);
export const cardBackArt = (color: PlayerColor | "neutral") => lookup(ingredients, `cardBack_${color}`);
// The factory floor's printed squares (mod file 071): one plain square, one of the bay's hatching.
export const floorSquareArt = ingredients.floorSquare;
export const baySquareArt = ingredients.baySquare;
export const feltArt = environment.felt;
