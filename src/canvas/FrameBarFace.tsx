import React from "react";
import { Color, Layered, Pad, Text } from "@pretty-chitty/core/ReactCanvas";
import { ParameterizedCanvas } from "@pretty-chitty/core";
import { PRINT_FONT } from "../consts";

// One side of a market window frame, as on the real frames (C30): the player's colour with
// the dealer's city printed in white near one end. Sized to the bar's own proportions.
export class FrameBarFace extends ParameterizedCanvas {
  hex = "#2c4f9e";
  name = "";
  width = 400;
  height = 24;

  render() {
    return (
      <Layered>
        <Color hex={this.hex} />
        <Pad left={this.height * 1.2} right={this.height}>
          <Text fill="#f4f2ec" fontSize={this.height * 0.72} fontWeight="bold" fontFamily={PRINT_FONT} align="left">
            {this.name}
          </Text>
        </Pad>
      </Layered>
    );
  }
}
