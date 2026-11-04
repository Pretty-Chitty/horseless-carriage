// The printed face of a factory component, by its shelf key ("station:engine", "mainline:car",
// "dept:research", "dealership:1"). Shared by the tiles themselves and the ghost spots on the
// build shelf, so a ghost shows exactly what belongs there.
import { Material } from "three";
import { IUpdatingCanvas } from "@pretty-chitty/core";
import { StationFace, DepartmentFace, DealershipFace } from "./canvas/TileFace";
import { MainlineFace } from "./canvas/MainlineFace";
import { CarType, DepartmentType, PlayerColor, StationId, TEXELS_PER_SQUARE } from "./consts";

export function componentFace(key: string, playerColor: PlayerColor, w: number, h: number, back = false): Material {
  return componentCanvas(key, playerColor, w, h, back).material;
}

// The canvas itself, for callers that need its live texture (a faded ghost, say). Copying the
// material instead does not work: the texture is filled in after the copy is taken.
export function componentCanvas(key: string, playerColor: PlayerColor, w: number, h: number, back = false): IUpdatingCanvas {
  const [kind, id] = key.split(":");
  const size = (f: { width: number; height: number }) => { f.width = w * TEXELS_PER_SQUARE; f.height = h * TEXELS_PER_SQUARE; };
  switch (kind) {
    case "station":
      return new StationFace().set((f) => { f.stationId = id as StationId; size(f); }).get();
    case "mainline":
      return new MainlineFace().set((f) => { f.carType = id as CarType; f.back = back; size(f); }).get();
    case "dept":
      // Only marketing departments differ by owner; keep one texture for the shared kinds.
      return new DepartmentFace().set((f) => { f.departmentType = id as DepartmentType; f.playerColor = id === "marketing" ? playerColor : "green"; size(f); }).get();
    default:
      return new DealershipFace().set((f) => { f.playerColor = playerColor; f.index = Number(id) as 0 | 1 | 2; f.cols = w; f.rows = h; size(f); }).get();
  }
}
