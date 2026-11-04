import React from "react";
import { Image, Layered, Raw } from "@pretty-chitty/core/ReactCanvas";
import { ParameterizedCanvas } from "@pretty-chitty/core";
import { nicheArt } from "../art";
import { PRINT_FONT } from "../consts";

// A market niche as printed on the real board (its own crop of the flat board scan), with the
// segment's price marker lying on it when this niche is the one that carries it (C5, M3): a
// small pale green card reading "$6." in the slab serif, as the real markers do (p.3 picture).
export class NicheFace extends ParameterizedCanvas {
  row = 1;
  col = 1;
  price = 0;
  width = 384;
  height = 384;

  render() {
    return (
      <Layered>
        <Image image={nicheArt(this.row, this.col)} fill />
        {this.price ? (
          <Raw
            cb={(ctx, x, y, w, h) => {
              const mw = w * 0.5;
              const mh = h * 0.26;
              const mx = x + (w - mw) / 2;
              const my = y + (h - mh) / 2;
              ctx.fillStyle = "rgba(0,0,0,0.25)";
              ctx.fillRect(mx + mw * 0.02, my + mh * 0.06, mw, mh);
              ctx.fillStyle = "#dfe6d6";
              ctx.fillRect(mx, my, mw, mh);
              ctx.fillStyle = "#1c1c1c";
              ctx.textBaseline = "alphabetic";
              ctx.textAlign = "left";
              const big = mh * 0.78;
              const small = mh * 0.4;
              ctx.font = `bold ${Math.round(big)}px ${PRINT_FONT}`;
              const digits = `${this.price}.`;
              const dw = ctx.measureText(digits).width;
              ctx.font = `bold ${Math.round(small)}px ${PRINT_FONT}`;
              const sw = ctx.measureText("$").width;
              const left = mx + (mw - dw - sw) / 2;
              const base = my + mh * 0.8;
              ctx.fillText("$", left, base - big * 0.42);
              ctx.font = `bold ${Math.round(big)}px ${PRINT_FONT}`;
              ctx.fillText(digits, left + sw, base);
            }}
          />
        ) : (
          <Layered>{[]}</Layered>
        )}
      </Layered>
    );
  }
}
