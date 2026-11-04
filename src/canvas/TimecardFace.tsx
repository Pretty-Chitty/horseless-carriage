import React from "react";
import { Image, Layered, Pad } from "@pretty-chitty/core/ReactCanvas";
import { ParameterizedCanvas } from "@pretty-chitty/core";
import { clockIconArt, finishIconArt, paperArt } from "../art";

// The timecard marker's two faces (C35): the punch-clock symbol on the board's paper, and the
// chequered FINISH flag on the other side.
export class TimecardFace extends ParameterizedCanvas {
  side: "clock" | "finish" = "clock";
  width = 256;
  height = 256;

  render() {
    return (
      <Layered>
        <Image image={paperArt} fill />
        <Pad amount={this.width * 0.12}>
          <Image image={this.side === "clock" ? clockIconArt : finishIconArt} />
        </Pad>
      </Layered>
    );
  }
}
