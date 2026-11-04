// What makes a good run of each stretch of the Horseless Carriage tutorial (scripts/tutorial search).
import type { RunResult } from "./harness";
import type { Pins } from "../../src/tutorial/script";

export type Objective = {
  describe: string;
  prepare?: (pins: Pins, random: () => number) => Pins;
  score: (r: RunResult) => number;
};

export const objectives: { [name: string]: Objective } = {
  any: { describe: "any run that completes", score: () => 1 },
};
