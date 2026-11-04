import React from "react";
import { Horizontal, Image, Layered, Pad, Raw, Spacer, Text, Vertical } from "@pretty-chitty/core/ReactCanvas";
import { ImageSpec, ParameterizedCanvas } from "@pretty-chitty/core";
import { stationArt, departmentArt, marketingArt, stepPattern, dotPaperArt } from "../art";
import { DepartmentType, dimensionHex, Step, StationId, station, dimensionAbbrev, playerHex, PlayerColor, DEALERSHIP_NAMES, PRINT_FONT, Dimension } from "../consts";
import { BRAND_OUTLINES } from "../outlines";
import { CHEVRON } from "../generated";

// Faces for the factory components (M12, M14, M15, M16), drawn from the real components'
// ingredients: the step patterns, the station illustrations, the dealership's dotted paper,
// the traced brand and chevron outlines and the print's slab serif. Props are printed data
// only — never live state — so few textures exist.

const DARK_STEPS: readonly Step[] = ["C", "D"];

// A printed pattern, one seamless tile per factory square: tiles are laid at their own
// (square) aspect in a cols × rows grid, so nothing is stretched.
export function PatternGrid({ image, cols, rows }: { image: ImageSpec; cols: number; rows: number }) {
  return (
    <Vertical>
      {Array.from({ length: rows }, (_, r) => (
        <Horizontal key={r}>
          {Array.from({ length: cols }, (_, c) => (
            <Image key={c} image={image} fill />
          ))}
        </Horizontal>
      ))}
    </Vertical>
  );
}

// The thin dark cut edge of a cardboard tile.
export function Edge({ px = 4, radius = 10 }: { px?: number; radius?: number }) {
  return (
    <Raw
      cb={(ctx, x, y, w, h) => {
        ctx.strokeStyle = "#1c1c1c";
        ctx.lineWidth = px;
        ctx.beginPath();
        ctx.roundRect(x + px / 2, y + px / 2, w - px, h - px, radius);
        ctx.stroke();
      }}
    />
  );
}

// A research badge as printed on the stations: the slot number in white on a square of the
// dimension's colour, the dimension's abbreviation in small print above it.
function Badge({ dimension, slot, unit }: { dimension: Dimension; slot: number; unit: number }) {
  return (
    <Raw
      cb={(ctx, x, y, w, h) => {
        const side = Math.min(w, h * 0.72);
        const top = y + h - side;
        ctx.fillStyle = dimensionHex(dimension);
        ctx.strokeStyle = "#151515";
        ctx.lineWidth = Math.max(2, unit * 0.025);
        ctx.beginPath();
        ctx.roundRect(x, top, side, side, side * 0.1);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#fff";
        ctx.font = `bold ${Math.round(side * 0.72)}px ${PRINT_FONT}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(String(slot), x + side / 2, top + side / 2 + side * 0.04);
        ctx.fillStyle = "#151515";
        ctx.font = `bold ${Math.round(h * 0.22)}px ${PRINT_FONT}`;
        ctx.textBaseline = "alphabetic";
        ctx.fillText(dimensionAbbrev(dimension), x + side / 2, top - h * 0.06);
      }}
    />
  );
}

export class StationFace extends ParameterizedCanvas {
  stationId: StationId = "engine";
  width = 512;
  height = 512;

  render() {
    const spec = station(this.stationId);
    const ink = DARK_STEPS.includes(spec.step) ? "#f2f2f2" : "#151515";
    const unit = this.width / spec.footprint.w; // pixels per factory square
    const badgeW = unit * 0.5;
    return (
      <Layered>
        <PatternGrid image={stepPattern[spec.step]} cols={spec.footprint.w} rows={spec.footprint.h} />
        <Pad amount={unit * 0.35}>
          <Image image={stationArt[this.stationId]} />
        </Pad>
        <Pad amount={unit * 0.12}>
          <Vertical>
            <Horizontal size={unit * 0.55}>
              <Spacer />
              <Text size={unit * 0.6} fill={ink} fontSize={unit * 0.5} fontWeight="bold" fontFamily={PRINT_FONT} align="right">
                {spec.step}
              </Text>
            </Horizontal>
            <Spacer />
            <Horizontal size={unit * 0.62}>
              {spec.slots.map((sl, i) => (
                <Pad key={i} size={badgeW + unit * 0.08} right={unit * 0.08}>
                  <Badge dimension={sl.dimension} slot={sl.slot} unit={unit} />
                </Pad>
              ))}
              <Spacer />
            </Horizontal>
          </Vertical>
        </Pad>
        <Edge />
      </Layered>
    );
  }
}

// The real department tile, as a crop. Research and planning departments are identical for
// everyone; marketing departments are printed in their owner's colour.
export class DepartmentFace extends ParameterizedCanvas {
  departmentType: DepartmentType = "research";
  playerColor: PlayerColor = "green";
  width = 512;
  height = 512;

  render() {
    const art = this.departmentType === "marketing" ? marketingArt[this.playerColor] : departmentArt[this.departmentType];
    return <Image image={art} fill />;
  }
}

// Draws a player's brand piece outline (traced from the real piece) into a box.
export function drawBrand(ctx: CanvasRenderingContext2D, color: PlayerColor, x: number, y: number, size: number, fill: string) {
  const o = BRAND_OUTLINES[color];
  const s = size / 100;
  ctx.save();
  ctx.translate(x + (size - o.w * s) / 2, y + (size - o.h * s) / 2);
  ctx.scale(s, s);
  const p = new Path2D(o.path);
  ctx.fillStyle = fill;
  ctx.fill(p);
  ctx.restore();
}

// A lighter tint of a player's colour: the dealership bands are printed paler than the pieces.
function tint(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (255 - v) * amount));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

// A dealership (M14), drawn as the real tiles are printed (mod tiles 078–092): the dotted
// white paper, a band across the top in a tint of the player's colour carrying the city's
// name in the slab serif, and the brand logo in a white roundel at the band's right end. The
// band runs from 0.2 to 0.82 squares below the top edge on every size.
export class DealershipFace extends ParameterizedCanvas {
  playerColor: PlayerColor = "green";
  index: 0 | 1 | 2 = 0;
  cols = 4;
  rows = 3;
  width = 512;
  height = 384;

  render() {
    const name = DEALERSHIP_NAMES[this.playerColor][this.index];
    const unit = this.width / this.cols;
    const bandTop = unit * 0.2;
    const bandH = unit * 0.62;
    const hex = playerHex(this.playerColor);
    return (
      <Layered>
        <PatternGrid image={dotPaperArt} cols={this.cols} rows={this.rows} />
        <Vertical>
          <Spacer size={bandTop} />
          <Layered size={bandH}>
            <Raw
              cb={(ctx, x, y, w, h) => {
                ctx.fillStyle = tint(hex, 0.3);
                ctx.fillRect(x, y, w, h);
                ctx.strokeStyle = "#1c1c1c";
                ctx.lineWidth = Math.max(2, unit * 0.025);
                ctx.strokeRect(x - 4, y, w + 8, h);
                // The roundel at the right end, a little taller than the band.
                const r = h * 0.62;
                const cx = x + w - r - h * 0.3;
                const cy = y + h / 2;
                ctx.fillStyle = "#f6f5f0";
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                drawBrand(ctx, this.playerColor, cx - r * 0.72, cy - r * 0.72, r * 1.44, hex);
              }}
            />
            <Pad left={bandH * 0.3} right={bandH * 1.7}>
              <Text fill="#151515" fontSize={bandH * 0.56} fontWeight="bold" fontFamily={PRINT_FONT} align="left">
                {name}
              </Text>
            </Pad>
          </Layered>
          <Spacer />
        </Vertical>
        <Edge px={3} radius={6} />
      </Layered>
    );
  }
}

// The spec indicator's chevron, traced from the real counter (src/generated.ts), drawn
// pointing up with its heavy black edge inside the traced outline, into a box of `size`.
export function drawChevron(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, fill: string) {
  const o = CHEVRON;
  const s = size / Math.max(o.w, o.h);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-Math.PI / 2); // traced pointing right; the art points up
  ctx.scale(s, s);
  ctx.translate(-o.w / 2, -o.h / 2);
  const p = new Path2D(o.path);
  ctx.fillStyle = fill;
  ctx.fill(p);
  ctx.clip(p);
  ctx.strokeStyle = "#141414";
  ctx.lineJoin = "round";
  ctx.lineWidth = (2 * o.edge * o.w) / 100; // half of it falls inside the clip
  ctx.stroke(p);
  ctx.restore();
}

// Spec indicator (M16, C29), as on the real counters: the step's printed pattern, the
// chevron in the dimension's colour, and the abbreviation in the slab serif below it with a
// pale halo. Drawn pointing +Y (up); the chit rotates it toward its station.
export class IndicatorFace extends ParameterizedCanvas {
  dimension: "speed" | "reliability" | "design" | "range" | "safety" = "range";
  step: Step = "B";
  width = 256;
  height = 256;

  render() {
    const light = !DARK_STEPS.includes(this.step);
    return (
      <Layered>
        <Image image={stepPattern[this.step]} fill />
        <Raw
          cb={(ctx, x, y, w, h) => {
            drawChevron(ctx, x + w / 2, y + h * 0.4, w * 0.66, dimensionHex(this.dimension));
            ctx.font = `bold ${Math.round(h * 0.26)}px ${PRINT_FONT}`;
            ctx.textAlign = "center";
            ctx.textBaseline = "alphabetic";
            ctx.lineJoin = "round";
            ctx.lineWidth = h * 0.06;
            ctx.strokeStyle = light ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.6)";
            ctx.strokeText(dimensionAbbrev(this.dimension), x + w / 2, y + h * 0.92);
            ctx.fillStyle = light ? "#141414" : "#f2f2f2";
            ctx.fillText(dimensionAbbrev(this.dimension), x + w / 2, y + h * 0.92);
          }}
        />
        <Edge px={3} radius={8} />
      </Layered>
    );
  }
}
