// What makes a good run of each stretch of the Horseless Carriage tutorial (scripts/tutorial search).
import type { RunResult } from "./harness";
import type { Pins } from "../../src/tutorial/script";

/** Why the last run was rejected (search prints it for the first few) */
export let rejectReason = "";
const reject = (why: string) => {
  rejectReason = why;
  return -Infinity;
};

export type Objective = {
  describe: string;
  prepare?: (pins: Pins, random: () => number) => Pins;
  score: (r: RunResult) => number;
};

/** The buyers on the table at a step (as describeTable prints them): [row, col, count] */
function buyersAt(r: RunResult, step: string): [number, number, number][] {
  const m = /buyers ([^;]*);/.exec(r.tables[step] ?? "");
  if (!m || m[1].trim() === "-") return [];
  return m[1]
    .trim()
    .split(/\s+/)
    .map((tok) => {
      const [pos, n] = tok.split(":");
      const [row, col] = pos.split(",").map(Number);
      return [row, col, Number(/\d+/.exec(n)?.[0] ?? "0")];
    });
}
/** One player's lines in the table at a step */
function playerAt(r: RunResult, step: string, name: string): string {
  const t = r.tables[step] ?? "";
  const i = t.indexOf(`${name} (`);
  if (i < 0) return "";
  const rest = t.slice(i);
  const j = rest.indexOf("\n", rest.indexOf("  reach:"));
  return j < 0 ? rest : rest.slice(0, j);
}
const sells = (r: RunResult, bot: string) => r.log.filter((l) => l.includes(`:${bot}: sells`));

export const objectives: { [name: string]: Objective } = {
  any: { describe: "any run that completes", score: (r) => (r.outcome === "completed" ? 1 : -Infinity) },
  /**
   * Year 1 as the script tells it: Robin and Sam each build the smallest factory that sells (a mainline, a
   * dealer, a station with an indicator), each sells exactly one car for $6, the two buyers left stand where
   * your window goes (rows 7–8, columns 1–2), design enters the market, and next year's buyers wait in your reach.
   */
  year1: {
    describe: "year 1 plays as narrated",
    score: (r) => {
      if (r.outcome !== "completed") return -Infinity;
      let score = 0;
      for (const [bot, name] of [["p1", "Robin"], ["p2", "Sam"]] as const) {
        const s = sells(r, bot);
        if (s.length !== 1 || !/for \$6\b/.test(s[0])) return -Infinity;
        const p = playerAt(r, "brochures", name);
        if (!/mainline/i.test(p) || /dealers: -/.test(p)) return -Infinity;
        if (/indicators: -/.test(p)) return -Infinity;
        score += 5;
      }
      // Your sale: two buyers left on the table, both under your window
      const left = buyersAt(r, "sell-window");
      const total = left.reduce((a, b) => a + b[2], 0);
      if (total !== 2 || !left.every(([row, col, n]) => row >= 7 && col <= 2 && n === 1)) return -Infinity;
      // The change of expectations the script explains
      if (!/axes design0 \(bottom\) \/ reliability0 \(left\)/.test(r.tables["year-two"] ?? "")) return -Infinity;
      if (!/minimums safety1/.test(r.tables["year-two"] ?? "")) return -Infinity;
      // Next year: buyers your dealer could reach once it has safety (reliability ≤ 1: rows 5–8; design 0: columns 1–2)
      const next = buyersAt(r, "year-two").filter(([row, col]) => row >= 5 && col <= 2).reduce((a, b) => a + b[2], 0);
      score += Math.min(next, 3) * 3;
      return score;
    },
  },
  /**
   * Year 2 as the script tells it: Robin researches range and safety, Sam design and reliability (own markers
   * only; the steer sees to it), Sam takes slot 1, Robin slot 2; you sell the six-dollar buyer at (4,2) and Robin
   * and Sam each sell one car for $4 in the corner; no rival dealer reads reliability 2; range enters the market.
   */
  year2: {
    describe: "year 2 plays as narrated",
    score: (r) => {
      if (r.outcome !== "completed") return reject(`${r.outcome} ${r.stuckOn ?? ""} ${r.blocked.join(" ")}`);
      const y2 = r.log.slice(r.log.indexOf("Year 2"));
      if (y2.length === 0) return -Infinity;
      const has = (re: RegExp) => y2.some((l) => re.test(l));
      if (!has(/:p1: advances their own Range research/)) return reject("Robin did not research range");
      if (!has(/:p2: advances their own Design research/)) return reject("Sam did not research design");
      if (!has(/:p2: sets their focus to slot 1/)) return reject("Sam did not take slot 1");
      if (!has(/:p1: sets their focus to slot 2/)) return reject("Robin did not take slot 2");
      for (const bot of ["p1", "p2"]) if (!y2.some((l) => l.includes(`:${bot}: sells`))) return reject(`${bot} sold nothing`);
      const mine = y2.filter((l) => l.includes(":p0: sells"));
      if (mine.length !== 1 || !/in segment 2 for \$6\b/.test(mine[0])) return reject(`your sale: ${mine.join(" | ") || "none"}`);
      for (const name of ["Robin", "Sam"]) if (/rel2/.test(playerAt(r, "y2-brochures", name))) return reject(`${name} reads reliability 2`);
      if (!has(/^Range enters the market/)) return reject("range did not enter");
      let score = 10;
      // A capacity raise and a second mainline are lessons worth seeing in a rival's hands
      if (has(/raises their assembly capacity/)) score += 3;
      if (has(/:p[12]: built .*mainline/)) score += 3;
      // Bots that build something new (the look step names it) and keep their sparks out of your way
      for (const name of ["Robin", "Sam"]) if (/\*/.test(playerAt(r, "y2-others-build-look", name))) score += 2;
      return score;
    },
  },
};
