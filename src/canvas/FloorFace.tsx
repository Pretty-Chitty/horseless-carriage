import React from "react";
import { Layered, Pad, Raw } from "@pretty-chitty/core/ReactCanvas";
import { ParameterizedCanvas } from "@pretty-chitty/core";
import { EXPANSION_FLOOR, MAIN_FLOOR, FloorSpec, Edge } from "../consts";
import { baySquareArt, floorSquareArt } from "../art";
import { PatternGrid } from "./TileFace";

const MIRROR: Record<Edge, Edge> = { top: "top", bottom: "bottom", left: "right", right: "left" };

// A factory floor tile (M9, M10) as printed, drawn square by square from the real floor's
// ingredients (mod file 071): the black floor with its corner crosses, the loading bay's
// diagonal hatching, and the pale keep-clear line along the bay's outer edge. Laid the other
// way up (flipped) the print mirrors left to right, since the underside is blank.
export class FloorFace extends ParameterizedCanvas {
  kind: "main" | "expansion" = "main";
  flipped = false;
  width = 960;
  height = 960;

  render() {
    const s: FloorSpec = this.kind === "main" ? MAIN_FLOOR : EXPANSION_FLOOR;
    const bay = this.flipped ? { ...s.bay, x: s.w - s.bay.x - s.bay.w } : s.bay;
    const edge = this.flipped ? MIRROR[s.keepClearEdge] : s.keepClearEdge;
    const sq = this.width / s.w;
    const t = sq * 0.14; // the keep-clear line's width
    return (
      <Layered>
        <PatternGrid image={floorSquareArt} cols={s.w} rows={s.h} />
        <Pad left={bay.x * sq} top={bay.y * sq} right={(s.w - bay.x - bay.w) * sq} bottom={(s.h - bay.y - bay.h) * sq}>
          <PatternGrid image={baySquareArt} cols={bay.w} rows={bay.h} />
        </Pad>
        <Raw
          cb={(ctx, x, y) => {
            ctx.fillStyle = "#c4c4c4";
            const bx = x + bay.x * sq;
            const by = y + bay.y * sq;
            const bw = bay.w * sq;
            const bh = bay.h * sq;
            if (edge === "top") ctx.fillRect(bx, by, bw, t);
            if (edge === "bottom") ctx.fillRect(bx, by + bh - t, bw, t);
            if (edge === "left") ctx.fillRect(bx, by, t, bh);
            if (edge === "right") ctx.fillRect(bx + bw - t, by, t, bh);
          }}
        />
      </Layered>
    );
  }
}
