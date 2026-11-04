// Real outlines extruded into geometry (chits-and-rendering.md, `extrudeSVGToGeometry`). The
// brand pieces and the research tracks' die-cut shapes are traced from the scans by
// scripts/extract-art.py (src/outlines.ts); the car meeples from the mod's cut-outs by
// scripts/extract-tts.py (src/generated.ts). Depth is in SVG units because it is scaled along
// with the outline.
import { BufferGeometry, ExtrudeGeometry, Shape, Vector2 } from "three";
import { extrudeSVGToGeometry } from "@pretty-chitty/core";
import { BRAND_THICKNESS, CAR_THICKNESS, CarType, Dimension, PlayerColor } from "./consts";
import { BRAND_OUTLINES, TRACK_OUTLINES } from "./outlines";
import { CARS, SPARK_COLORS } from "./generated";

const wrap = (d: string, w: number, h: number) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><path fill="#000" d="${d}"/></svg>`;

// `width` is the piece's longer side in world units; thickness is BRAND_THICKNESS at any size.
const brandCache = new Map<string, BufferGeometry>();
export function brandGeometry(color: PlayerColor, width: number): BufferGeometry {
  const key = `${color}:${width}`;
  let g = brandCache.get(key);
  if (!g) {
    const scale = width / 100;
    g = extrudeSVGToGeometry(wrap(BRAND_OUTLINES[color].path, 100, 100), { depth: BRAND_THICKNESS / scale, scale, center: true, svgSimplifyTolerance: 0.5 });
    brandCache.set(key, g);
  }
  return g;
}

// The colour of each meeple: the type's printed ink from the spark counters (C18). The colours
// sampled from the mod's shaded cut-outs came out so dark that a truck read as a car on the
// board (developer report: an unsold truck looked like a car left behind).
export const carWoodHex: Record<CarType, string> = {
  car: SPARK_COLORS.car,
  sports: SPARK_COLORS.sports,
  truck: SPARK_COLORS.truck,
};

// A meeple's length in world units: three fit across a niche side by side.
export const CAR_LENGTH = 0.8;
const carCache = new Map<string, BufferGeometry>();
export function carGeometry(type: CarType): BufferGeometry {
  let g = carCache.get(type);
  if (!g) {
    const scale = CAR_LENGTH / 100;
    g = extrudeSVGToGeometry(wrap(CARS[type].path, 100, 100), { depth: CAR_THICKNESS / scale, scale, center: true, svgSimplifyTolerance: 0.5 });
    carCache.set(type, g);
  }
  return g;
}

// A research track: its own traced outline (each track lies a little differently on the
// scan), `length` world units long, 0.1 thick, with the centre of its body (not of the name
// tab) on the origin. Built with three's ExtrudeGeometry straight from the traced points, not
// through extrudeSVGToGeometry: the engine's SVG simplify pass produced degenerate triangles
// for this outline that, once the track was rotated, hid half the market board. Material
// groups: 0 the printed faces (top and the unseen underside), 1 the cut edge. UVs are planar
// over the outline's bounding box, which is exactly the crop the texture is.
export const TRACK_THICKNESS = 0.18; // thick die-cut cardboard

// A round cardboard marker: a circle extruded `depth`, planar UVs over its bounding box so a
// printed face lies on top reading upright. Material groups: 0 the faces, 1 the rim.
export function discGeometry(radius: number, depth: number): BufferGeometry {
  const shape = new Shape();
  shape.absarc(0, 0, radius, 0, Math.PI * 2, false);
  const geo = new ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 40 });
  const pos = geo.getAttribute("position");
  const uv = geo.getAttribute("uv");
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + radius) / (2 * radius), (pos.getY(i) + radius) / (2 * radius));
  uv.needsUpdate = true;
  return geo;
}
const trackCache = new Map<string, BufferGeometry>();
export function trackGeometry(dimension: Dimension, length: number): BufferGeometry {
  const key = `${dimension}:${length}`;
  let g = trackCache.get(key);
  if (!g) {
    const o = TRACK_OUTLINES[dimension];
    const scale = length / o.w;
    const pts = [...o.path.matchAll(/[ML]([\d. ]+)/g)].map((m) => m[1].trim().split(/\s+/).map(Number));
    // SVG is y-down; the shape is y-up, so flip and keep the crop's top at the top.
    const shape = new Shape(pts.map(([x, y]) => new Vector2(x * scale, (o.h - y) * scale)));
    const geo = new ExtrudeGeometry(shape, { depth: TRACK_THICKNESS, bevelEnabled: false, curveSegments: 1 });
    const pos = geo.getAttribute("position");
    const uv = geo.getAttribute("uv");
    const w = o.w * scale;
    const h = o.h * scale;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / w, pos.getY(i) / h);
    uv.needsUpdate = true;
    // Centre: x on the outline, y on the body's centre, z on the slab's middle.
    geo.translate(-w / 2, -(o.h - (o.bodyTop + o.bodyH / 2)) * scale, -TRACK_THICKNESS / 2);
    trackCache.set(key, geo);
    g = geo;
  }
  return g;
}
