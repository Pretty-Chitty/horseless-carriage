import React from "react";
import { Image } from "@pretty-chitty/core/ReactCanvas";
import { ParameterizedCanvas } from "@pretty-chitty/core";
import { CarType } from "../consts";
import { mainlineArt, mainlineBackArt } from "../art";

// A mainline tile (M13): the real tile. The front has A bottom, B right, C left, D top; the
// back is its mirror image, so B and C change sides (developer note). The tile's footprint has
// the crop's own proportions, so `fill` never stretches it.
export class MainlineFace extends ParameterizedCanvas {
  carType: CarType = "car";
  back = false;
  width = 384;
  height = 288;

  render() {
    return <Image image={(this.back ? mainlineBackArt : mainlineArt)[this.carType]} fill />;
  }
}
