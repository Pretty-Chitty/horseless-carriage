import React from "react";
import { Color, Layered, Text } from "@pretty-chitty/core/ReactCanvas";
import { ParameterizedCanvas } from "@pretty-chitty/core";
import { PRINT_FONT } from "../consts";

// A flat colour with a centred label in the print font: only for small game-aid tags (a
// supply count, the money counter), never for a component that has real art.
export class LabelFace extends ParameterizedCanvas {
  label = "";
  hex = "#888888";
  textHex = "#ffffff";
  width = 256;
  height = 256;
  fontPx = 36;

  render() {
    return (
      <Layered>
        <Color hex={this.hex} />
        <Text fill={this.textHex} fontSize={this.fontPx} fontWeight="bold" fontFamily={PRINT_FONT}>
          {this.label}
        </Text>
      </Layered>
    );
  }
}
