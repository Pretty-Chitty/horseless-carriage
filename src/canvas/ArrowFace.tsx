import React from "react";
import { Color, Image, Layered, Pad } from "@pretty-chitty/core/ReactCanvas";
import { ParameterizedCanvas } from "@pretty-chitty/core";
import { arrowIconArt } from "../art";

// The obsolescence marker's face (C17): a black disc with the white arrow, drawn pointing up.
export class ArrowFace extends ParameterizedCanvas {
  width = 256;
  height = 256;

  render() {
    return (
      <Layered>
        <Color hex="#161616" />
        <Pad amount={this.width * 0.04}>
          <Image image={arrowIconArt} />
        </Pad>
      </Layered>
    );
  }
}
