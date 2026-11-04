import React from "react";
import { Color, Layered, Raw, Text, Vertical, Spacer } from "@pretty-chitty/core/ReactCanvas";
import { ParameterizedCanvas } from "@pretty-chitty/core";
import { Dimension, dimensionHex, dimensionLabel, PRINT_FONT } from "../consts";

// A minimum-spec indicator tile (C41, P7.3) as the real cardboard counters print it: a square
// in the dimension's colour, its print speckle, the minimum large in white and the dimension's
// name along the bottom. Drawn for any value (Q2, Q3).
export class MinSpecFace extends ParameterizedCanvas {
  dimension: Dimension = "speed";
  value = 1;
  width = 360;
  height = 360;

  render() {
    const H = this.height;
    return (
      <Layered>
        <Color hex={dimensionHex(this.dimension)} />
        <Raw
          cb={(ctx, x, y, w, h) => {
            // The printed speckle: a fixed scatter of faint light and dark flecks.
            let seed = 7;
            const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
            for (let i = 0; i < 900; i++) {
              ctx.fillStyle = rnd() < 0.5 ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.14)";
              ctx.fillRect(x + rnd() * w, y + rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2);
            }
            ctx.strokeStyle = "#1c1c1c";
            ctx.lineWidth = Math.max(2, w * 0.012);
            ctx.strokeRect(x + ctx.lineWidth / 2, y + ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
          }}
        />
        <Vertical>
          <Spacer size={H * 0.06} />
          <Text size={H * 0.58} fill="#f4f2ec" fontSize={H * 0.5} fontWeight="bold" fontFamily={PRINT_FONT}>
            {String(this.value)}
          </Text>
          <Spacer size={H * 0.02} />
          <Text size={H * 0.2} fill="#f4f2ec" fontSize={H * 0.13} fontWeight="bold" fontFamily={PRINT_FONT}>
            {dimensionLabel(this.dimension)}
          </Text>
          <Spacer />
        </Vertical>
      </Layered>
    );
  }
}
