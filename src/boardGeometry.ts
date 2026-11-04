// Where each printed space sits on the board, in world units, from the pixel geometry
// measured on the mod's flat board scan (src/generated.ts, by scripts/extract-tts.py). The
// planning office and the punch clock are each a section of the board, a chit centred on its
// crop; their spaces are placed relative to that centre.
// Everything is at the market's physical scale: the scan's 8×8 frame is 16 world units.
import { CLOCK_PX, CLOCK_X, CLOCK_Y, FOCUS_X, FOCUS_Y, GANTT_X, GANTT_Y, MARKET_FRAME_SCAN, OFFICE_PX } from "./generated";
import { BOARD_SIZE, NICHE } from "./consts";

export type Placement = { x: number; y: number; w: number; h: number };

// Scan pixels per world unit: the 8×8 frame is BOARD_SIZE × NICHE units across.
export const PX_PER_UNIT = (MARKET_FRAME_SCAN[2] - MARKET_FRAME_SCAN[0]) / (BOARD_SIZE * NICHE);

export type SectionName = "office" | "clock";
type Px = { x0: number; y0: number; x1: number; y1: number };
const SECTIONS: Record<SectionName, Px> = { office: OFFICE_PX, clock: CLOCK_PX };

export function sectionSize(name: SectionName): { w: number; h: number } {
  const p = SECTIONS[name];
  return { w: (p.x1 - p.x0) / PX_PER_UNIT, h: (p.y1 - p.y0) / PX_PER_UNIT };
}

function place(name: SectionName, x0: number, y0: number, x1: number, y1: number): Placement {
  const p = SECTIONS[name];
  const cx = (p.x0 + p.x1) / 2;
  const cy = (p.y0 + p.y1) / 2;
  return {
    x: ((x0 + x1) / 2 - cx) / PX_PER_UNIT,
    y: -((y0 + y1) / 2 - cy) / PX_PER_UNIT,
    w: (x1 - x0) / PX_PER_UNIT,
    h: (y1 - y0) / PX_PER_UNIT,
  };
}

// A brand-piece or timecard space by track and printed number (M22–M25), in its section's
// frame. (Assembly capacity is a spark and its boxes are not shown; their placement is kept
// for the hidden spaces.)
export function spacePlacement(track: "gantt" | "focus" | "historical" | "capacity" | "clock", index: number): Placement {
  switch (track) {
    case "gantt":
      if (index === 0) return place("office", GANTT_X[0], GANTT_Y[0], GANTT_X[10], GANTT_Y[1]);
      {
        const k = (index - 1) % 10;
        const row = 1 + Math.floor((index - 1) / 10);
        return place("office", GANTT_X[k], GANTT_Y[row], GANTT_X[k + 1], GANTT_Y[row + 1]);
      }
    case "focus":
      return place("office", FOCUS_X[index - 1], FOCUS_Y[0], FOCUS_X[index], FOCUS_Y[1]);
    case "historical":
      return place("office", FOCUS_X[index - 1], FOCUS_Y[1], FOCUS_X[index], FOCUS_Y[2]);
    case "capacity":
      return { x: 0, y: 0, w: 0.01, h: 0.01 }; // not shown (a spark); kept clear of the camera's framing
    case "clock": {
      const k = 40 - index;
      const c = k % 10;
      const row = Math.floor(k / 10);
      return place("clock", CLOCK_X[c], CLOCK_Y[row], CLOCK_X[c + 1], CLOCK_Y[row + 1]);
    }
  }
}
// Where the `spot`-th of `count` pieces sharing one printed space stands, centred on the
// space: one in the middle, two side by side, three in a triangle, four in a square, a fifth
// stacked on the middle of the four. `step` is the distance between neighbours; `z` counts
// pieces stacked underneath.
export function crowdOffset(spot: number, count: number, step: number): { x: number; y: number; z: number } {
  const h = step / 2;
  const n = Math.max(1, Math.min(5, count));
  const layouts: [number, number, number][][] = [
    [[0, 0, 0]],
    [[-h, 0, 0], [h, 0, 0]],
    [[-h, h * 0.6, 0], [h, h * 0.6, 0], [0, -h * 0.9, 0]],
    [[-h, h, 0], [h, h, 0], [-h, -h, 0], [h, -h, 0]],
    [[-h, h, 0], [h, h, 0], [-h, -h, 0], [h, -h, 0], [0, 0, 1]],
  ];
  const [x, y, z] = layouts[n - 1][Math.max(0, Math.min(n - 1, spot))];
  return { x, y, z };
}
