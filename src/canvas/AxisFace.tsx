import React from "react";
import { Color, Layered, Raw } from "@pretty-chitty/core/ReactCanvas";
import { ParameterizedCanvas } from "@pretty-chitty/core";
import { Dimension, dimensionHex } from "../consts";

// A spec axis strip (C7–C9, S1, P7.10), drawn clean: cream card, four boxes (one per two
// niches), and in each the spec a buyer in that column or row asks for, min…min+3, as the print
// shows it: a dash for 0, then squares. Squares and a thin band are in the dimension's colour.
// (Developer: the scanned pips looked corrupted; drawn, they are clean.)
export class AxisFace extends ParameterizedCanvas {
  dimension: Dimension = "range";
  min = 0;
  width = 2048;
  height = 154;

  render() {
    return (
      <Layered>
        <Color hex="#f2ede1" />
        <Raw
          cb={(ctx, x, y, w, h) => {
            const box = w / 4;
            const band = Math.round(h * 0.12);
            ctx.fillStyle = dimensionHex(this.dimension);
            ctx.fillRect(x, y + h - band, w, band);
            ctx.strokeStyle = "#3a3a3a";
            ctx.lineWidth = Math.max(2, Math.round(h * 0.03));
            ctx.strokeRect(x + ctx.lineWidth / 2, y + ctx.lineWidth / 2, w - ctx.lineWidth, h - band - ctx.lineWidth / 2);
            for (let i = 1; i < 4; i++) {
              ctx.beginPath();
              ctx.moveTo(x + i * box, y);
              ctx.lineTo(x + i * box, y + h - band);
              ctx.stroke();
            }
            // The requirement as the print shows it: a dash for 0, else one square per point, in the
            // dimension's colour. Squares shrink only when a high minimum would overflow the box.
            ctx.fillStyle = dimensionHex(this.dimension);
            const cy = y + (h - band) / 2;
            for (let i = 0; i < 4; i++) {
              const n = this.min + i;
              const cx = x + i * box + box / 2;
              const pip = Math.min((h - band) * 0.34, (box * 0.8) / Math.max(1, n * 1.45));
              if (n === 0) {
                ctx.fillRect(cx - pip * 0.9, cy - pip * 0.2, pip * 1.8, pip * 0.4);
                continue;
              }
              const gap = pip * 0.45;
              const total = n * pip + (n - 1) * gap;
              for (let k = 0; k < n; k++) ctx.fillRect(cx - total / 2 + k * (pip + gap), cy - pip / 2, pip, pip);
            }
          }}
        />
      </Layered>
    );
  }
}
