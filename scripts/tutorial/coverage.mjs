#!/usr/bin/env node
// Is every rule taught? Reads the rule ids from RULES.md (the first cell of each table row, or a bullet that starts
// with a bold id: "- **P2.14** …") and the coverage table
// in TUTORIAL.md (a "## Coverage" section: | rule ids | shown / explained / skip | step id or reason |), and fails
// on any rule the table doesn't mention, any row whose how isn't one of the three, and any shown/explained row that
// names no step. Ids in a row may be a list ("P3.1, P3.2") or a range within one prefix ("C1–C10", "P6P.1-P6P.4").
// Rulings (Q-…) are answers about rules, not rules, and are not counted.
// A "Close steps: a, b, c" line in TUTORIAL.md names the steps after the last played round. A rule explained only
// there fails unless its row says why in parentheses ("prices (a card power, read by press and hold)"): FCM's first
// tutorial passed with managers, drinks, gardens, new restaurants and prices listed in a closing inventory (the
// developer: "This is a great tutorial for the first 50% of the game… you have to teach it"). With several tutorials
// in one table, name each one's close after its id: "Close steps: sustenance routes finish; overtime night-more finish";
// a Where cell then reads "sustenance routes, lead-barista; overtime night-more".
//   node scripts/tutorial/coverage.mjs [RULES.md] [TUTORIAL.md]
import { readFileSync } from "node:fs";

const [rulesPath = "RULES.md", tutorialPath = "TUTORIAL.md"] = process.argv.slice(2);
// C1, P3S.1, P6P.10, G.ESHU, SP.RAIN: capitals and digits, with a digit or a dotted part
const ID = /^[A-Z][A-Z0-9]*(?:\.[A-Z0-9]+)?$/;
const isId = (id) => ID.test(id) && (/\d/.test(id) || id.includes("."));
// A table row's id is its first cell, or a bold id that starts it ("| **NM.5** First marketeer used | …")
const firstCell = (line) => {
  const cell = line.split("|")[1]?.trim() ?? "";
  return /^\*\*([A-Z][A-Z0-9.]*)\*\*/.exec(cell)?.[1] ?? cell;
};

const rules = [];
for (const line of readFileSync(rulesPath, "utf8").split("\n")) {
  const bullet = /^- \*\*([A-Z][A-Z0-9.]*)\*\*/.exec(line);
  const id = bullet ? bullet[1] : line.startsWith("|") ? firstCell(line) : "";
  if (isId(id) && !rules.includes(id)) rules.push(id);
}

/** "C1–C10" → C1…C10; "P6P.1-P6P.4" or "P6P.1–4" → P6P.1…P6P.4; anything else as written */
function expand(token) {
  const m = /^(.*?)(\d+)\s*[–-]\s*(.*?)(\d+)$/.exec(token);
  if (!m) return [token];
  const [, prefix, a, prefix2, b] = m;
  if (prefix2 && prefix2 !== prefix) return [token];
  const out = [];
  for (let n = Number(a); n <= Number(b); n++) out.push(`${prefix}${n}`);
  return out;
}

const text = readFileSync(tutorialPath, "utf8");
const at = text.search(/^## Coverage\b/m);
if (at < 0) {
  console.error(`${tutorialPath} has no "## Coverage" section: list how the lesson covers every rule in ${rulesPath}.`);
  process.exit(1);
}
const section = text.slice(at).split(/\n## /)[0];
// "a, b" → [a, b]; "tut a b, c; tut2 d" → ["tut a", "tut b", "tut c", "tut2 d"] once tut and tut2 are known tutorials
const tutorials = new Set();
const stepsIn = (cell) => {
  const out = [];
  let tut = "";
  for (const part of cell.split(/[;,]\s*/)) {
    const words = part.trim().split(/\s+/).filter(Boolean);
    if (words.length > 1 || tutorials.has(words[0])) tut = words.shift();
    for (const w of words) out.push(tut ? `${tut} ${w}` : w);
  }
  return out;
};
const closeLine = /^Close steps:\s*(.+)$/m.exec(text)?.[1] ?? "";
for (const group of closeLine.split(/;\s*/)) {
  const words = group.trim().split(/\s+/);
  if (words.length > 1 && !group.includes(",")) tutorials.add(words[0]);
}
const closeSteps = new Set(stepsIn(closeLine));
const covered = new Map();
const problems = [];
for (const line of section.split("\n")) {
  if (!line.startsWith("|") || /^\|\s*-/.test(line)) continue;
  const cells = line.split("|").slice(1, -1).map((c) => c.trim());
  const [ids, how, where] = cells;
  if (!ids || ids.toLowerCase() === "rule" || ids.toLowerCase() === "rules") continue;
  const kind = (how ?? "").toLowerCase().split(/[\s,(]/)[0];
  if (!["shown", "explained", "skip"].includes(kind)) problems.push(`${ids}: "${how}" is not shown, explained or skip`);
  if (kind !== "skip" && !where) problems.push(`${ids}: ${kind}, but in which step?`);
  if (kind === "skip" && !where) problems.push(`${ids}: skipped without a reason`);
  if (kind === "explained" && where && closeSteps.size && !where.includes("(")) {
    const steps = stepsIn(where);
    if (steps.every((st) => closeSteps.has(st)))
      problems.push(`${ids}: explained only in the close (${where}): play it in the lesson, or say in parentheses why a mention is enough`);
  }
  for (const token of ids.split(/,\s*/)) for (const id of expand(token)) covered.set(id, kind);
}
const missing = rules.filter((id) => !covered.has(id));
const unknown = [...covered.keys()].filter((id) => !rules.includes(id));
for (const id of unknown) problems.push(`${id} is in the coverage table but not in ${rulesPath}`);
const count = (k) => rules.filter((id) => covered.get(id) === k).length;
console.log(`${rules.length} rules: ${count("shown")} shown, ${count("explained")} explained, ${count("skip")} skipped, ${missing.length} not covered.`);
if (missing.length) console.log(`Not covered: ${missing.join(", ")}`);
for (const p of problems) console.log(p);
process.exit(missing.length || problems.length ? 1 : 0);
