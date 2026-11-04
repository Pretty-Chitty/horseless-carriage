import React from "react";
import { Color, Image, Layered, Pad } from "@pretty-chitty/core/ReactCanvas";
import { ParameterizedCanvas } from "@pretty-chitty/core";
import { CarType } from "../consts";
import { SPARK_COLORS } from "../generated";
import { carIconArt } from "../art";

// What is printed on a spark counter (C32) and on a card's spark cell (M19), as the mod's
// counters print it (raw scans/tts/057–062): the type's ink with the white car drawn on it —
// one car centred, or for a double spark two cars on a diagonal, the second lower and to
// the right. `size` is the square's side in pixels.
export function SparkPrint({ type, count, size }: { type: CarType; count: 1 | 2; size: number }) {
  const icon = carIconArt(type);
  return (
    <Layered>
      <Color hex={SPARK_COLORS[type]} />
      {count === 1 ? (
        <Pad left={size * 0.16} right={size * 0.16} top={size * 0.22} bottom={size * 0.22}>
          <Image image={icon} />
        </Pad>
      ) : (
        <Layered>
          <Pad left={size * 0.12} right={size * 0.26} top={size * 0.1} bottom={size * 0.46}>
            <Image image={icon} />
          </Pad>
          <Pad left={size * 0.28} right={size * 0.1} top={size * 0.44} bottom={size * 0.12}>
            <Image image={icon} />
          </Pad>
        </Layered>
      )}
    </Layered>
  );
}

// A spark counter's face: drawn from its type and count, never a shipped crop.
export class SparkFace extends ParameterizedCanvas {
  type: CarType = "car";
  count: 1 | 2 = 1;
  width = 192;
  height = 192;

  render() {
    return <SparkPrint type={this.type} count={this.count} size={this.width} />;
  }
}
