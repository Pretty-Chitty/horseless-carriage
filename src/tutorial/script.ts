// WORKED EXAMPLE (a finished tutorial from a space-cruise port): copy to src/tutorial/script.ts, keep
// the plumbing, replace the selectors, checks and steps. See README.md in this folder.
import { checks, defineTutorial, ForcedDecision, splitSentences, TutorialSpec, TutorialStep } from "@pretty-chitty/core";
import type { AiOption, Checker, Chit, Cue as CueOf, Focus as FocusOf, TutorialContext } from "@pretty-chitty/core";
import type { Root } from "../chits/Root";
import type { Player } from "../chits/Player";
import pinsJson from "./pins.json";
import en from "./strings.en.json";
import { narration } from "./audio/index";
import { GANTT_PUNCH_CLOCK, MAIN_FLOOR, TRACK_PUNCH_CLOCK_SLOTS } from "../consts";

/**
 * The intro tutorial: a First Game for three (you, Robin and Sam), scripted from the deal through
 * your first cruise coming home. Every draw and every bot move is pinned (pins.json, recorded by
 * scripts/tutorial), so the table is the same for everyone and the narration can name cards.
 *
 * How the steps keep the bots in step with the narration: every bot move is recorded in the step
 * that narrates it, and the engine holds a bot until that step (`hold`), whatever the timing; their
 * Confirms go through at any time. In a simultaneous step (taking actions, advancing ships) you go
 * first and the bots after, one bot per step: until your own part is finished you cannot see the
 * others' moves at all.
 *
 * How the board keeps in step with the narration: it plays the game one moment at a time, and a
 * step can stop it on a moment (`timeline`) so what Zoë is talking about is on screen while she
 * says it: a bot's move, a ship's arrival, each guest's bonus. Steps that need your prompt or wait
 * on the bots let it play again.
 */

/**
 * A bot move recorded by the tutorial harness (scripts/tutorial), replayed as a forced move so the
 * bots do exactly what the narration says, whatever the timing. `chit` and `target` are paths
 * (`chitPath`), not ids: chits that exist before the first turn are numbered by walking the tree,
 * and that order differs between builds (the game's webpack/babel build and the harness's esbuild).
 */
export type PinnedMove = { key: string; chit?: string; target?: string; button?: string };

/**
 * Everything random the script relies on, recorded from one headless run and replayed:
 * `setup` — the draws before the first step (the seating shuffle first, then the deal);
 * `steps` — per step, the draws made while it is live; `ai` — per step and bot, every bot move.
 * Regenerate with scripts/tutorial (see its README); never edit by hand.
 */
export type Pins = {
  setup: (number | number[])[];
  steps: { [stepId: string]: (number | number[])[] };
  ai: { [stepId: string]: { [playerId: string]: PinnedMove[] } };
};

/** One locale's texts: step texts (markdown with :tokens:), hints, and how tokens are read aloud. */
type Strings = typeof en;

type Step = TutorialStep<Player, Root>;
type Ctx = TutorialContext<Player, Root>;
type Focus = FocusOf<Player, Root>;
type Cue = CueOf<Player, Root>;

/**
 * Where a chit is, from the root: outlet names, with the index in ordered outlets
 * (`players[1].mat.smallShip`, `players[2].hand.cards[3]`). The same in every build of the game.
 */
export function chitPath(chit: Chit): string {
  const parts: string[] = [];
  for (let c: Chit | undefined = chit; c?.parent; c = c.parent) {
    const outlet = c.parentOutlet;
    if (!outlet) throw new Error(`chit ${c.id} has no outlet: it cannot be pinned by path`);
    const holder = (c.parent as unknown as Record<string, unknown>)[outlet] as { copy?: () => Chit[] } | undefined;
    const index = holder?.copy ? holder.copy().indexOf(c) : -1;
    parts.unshift(index >= 0 ? `${outlet}[${index}]` : outlet);
  }
  return parts.join(".");
}

/** The chit at a `chitPath`, or undefined. */
export function chitAt(root: Root, path: string): Chit | undefined {
  let c: unknown = root;
  for (const part of path.split(".")) {
    const m = /^([^[]+)(?:\[(\d+)\])?$/.exec(part);
    if (!m || !c) return undefined;
    const value = (c as Record<string, unknown>)[m[1]] as { get?: (i: number) => unknown } | undefined;
    c = m[2] !== undefined ? value?.get?.(Number(m[2])) : value;
  }
  return c as Chit | undefined;
}

function forced(moves: PinnedMove[]): ForcedDecision<Player, Root>[] {
  return moves.map((m) => ({
    key: m.key || undefined,
    chit: m.chit ? (root: Root) => chitAt(root, m.chit!) : undefined,
    target: m.target ? (root: Root) => chitAt(root, m.target!) : undefined,
    button: m.button,
  }));
}

// ---------------------------------------------------------------------------------- selectors ---
const me_ = (_root: Root, me: Player) => me;
const robin = (root: Root) => root.players.get(1)!;
const sam = (root: Root) => root.players.get(2)!;
const market = (root: Root) => root.market;
const office = (root: Root) => root.office;
const factory = (_root: Root, me: Player) => me.factory;
const officeSpaces = (track: string) => (root: Root) => root.office.spaces.filter((s) => s.track === track);
const officeSpace = (track: string, index: number) => (root: Root) => root.office.spaces.find((s) => s.track === track && s.index === index)!;
const spark = (pick: (me: Player) => { id?: string }) => ({ ui: (_root: Root, me: Player) => `spark:${pick(me).id}` });
const reachOf = (who: (root: Root, me: Player) => Player) => (root: Root, me: Player) => root.market.reach.filter((z) => z.playerId === who(root, me).playerId && z.cols > 0);
const clockSpaces = (root: Root) => root.clock.spaces.copy();
const timecard = (root: Root) => root.clock.timecard.get(0)!;
const nichesWithBuyers = (root: Root) => root.market.niches.filter((n) => n.buyers.length > 0);
// Buyers a car with no specs could serve: niches that ask for nothing on either axis.
const specFreeBuyers = (root: Root) => nichesWithBuyers(root).filter((n) => Object.values(root.market.requirement(n.row, n.col)).every((v) => v === 0));
const quadrant = (q: number) => (root: Root) => root.market.niches.filter((n) => n.quadrant() === q);
const segment = (seg: number) => (root: Root) => root.market.niches.filter((n) => n.segment() === seg);
const priced = (root: Root) => root.market.niches.filter((n) => n.price > 0);
const activeTracks = (root: Root) => [root.market.bottomTrack!, root.market.leftTrack!];
// One of an axis strip's four marks (0 = the low end): a quarter of the strip, along its length
const axisMark = (side: "bottom" | "left", i: number) => ({
  chit: (root: Root) => (side === "bottom" ? root.market.bottomAxis : root.market.leftAxis),
  offset: { x: (2 * i - 3) / 8 },
  scale: { x: 0.25 },
});
const offBoard = (root: Root) => root.research.offBoard.copy();
const myMarkers = (root: Root, me: Player) => root.allTracks().map((t) => t.markerOf(me.playerId)!).filter(Boolean);
const mySlot = (dim: string) => (root: Root, me: Player) => {
  const t = root.allTracks().find((x) => x.dimension === dim)!;
  return t.slot(t.positionOf(me.playerId));
};
const myDepartments = (type: string) => (_root: Root, me: Player) => me.factory.placedTiles().filter((t) => t.kind === "department" && t.departmentType === type);
const clockSlots = (root: Root) => root.allTracks().flatMap((t) => TRACK_PUNCH_CLOCK_SLOTS.map((p) => t.slot(p)));
const myTiles = (kind: string) => (_root: Root, me: Player) => me.factory.placedTiles().filter((t) => t.kind === kind);
const entry = (sig: string) => (_root: Root, me: Player) => me.factory.benchTiles().find((e) => e.signature() === sig)!;
const tile = (sig: string) => (_root: Root, me: Player) => me.factory.placedTiles().find((t) => t.signature() === sig && !t.committed);
const dropAt = (x: number, y: number, w: number, h: number) => (_root: Root, me: Player) => me.factory.targets.find((d) => d.x === x && d.y === y && d.w === w && d.h === h);
// The ring for a drop spot: a drop target draws nothing (so the factory's framing skips it), and a ring needs a
// box, so ring that rectangle of the main floor (12×12 at the factory's origin, unturned) instead
const floorSpot = (x: number, y: number, w: number, h: number) => ({
  chit: (_root: Root, me: Player) => me.factory.floors.find((f) => f.kind === "main")!,
  offset: { x: (x + w / 2) / MAIN_FLOOR.w - 0.5, y: 0.5 - (y + h / 2) / MAIN_FLOOR.h },
  scale: { x: w / MAIN_FLOOR.w, y: h / MAIN_FLOOR.h },
});
const at_ = (sig: string, x: number, y: number) => (_root: Root, me: Player) => me.factory.placedTiles().some((t) => t.signature() === sig && t.x === x && t.y === y);
const myIndicators = (_root: Root, me: Player) => me.factory.indicators.copy();
const hand = (_root: Root, me: Player) => me.hand;
// The supply area is only a container (nothing drawn, so no ring): its stacks
const supply = (root: Root) => root.supply.stacks.copy();
/** The niches a window laid at (row, col) covers: where the ring for its drop spot goes (one box) */
const windowArea = (row: number, col: number, w: number, h: number) => (root: Root) => root.market.niches.filter((n) => n.row >= row && n.row < row + h && n.col >= col && n.col < col + w);
const windowSpot = (row: number, col: number, w: number, h: number) => (root: Root) => root.market.windowTargets.find((t) => t.row === row && t.col === col && t.w === w && t.h === h);
const inHand = (id: string) => (_root: Root, me: Player) => me.hand.cards.find((c) => c.cardId === id);
/** Parts of a market card's printed face (CardFace), as a box on the card: the spark grid, the year badge, the clock box */
const CARD_SPARKS = { offset: { y: 0.14 }, scale: { x: 0.9, y: 0.64 } };
const CARD_YEAR = { offset: { x: -0.34, y: -0.38 }, scale: { x: 0.24, y: 0.17 } };
const CARD_CLOCKS = { offset: { x: 0.12, y: -0.38 }, scale: { x: 0.68, y: 0.17 } };
const onCard = (id: string, part: { offset: { x?: number; y?: number }; scale: { x: number; y: number } }) => ({ chit: inHand(id), ...part });
const quadrantSpot = (q: number) => (root: Root) => root.market.quadrantTargets.find((t) => t.quadrant === q)!;
const sparksOnBoard = (root: Root) => root.market.niches.filter((n) => n.sparks.length > 0);
const markersOf = (who: (root: Root) => Player) => (root: Root) => root.allTracks().map((t) => t.markerOf(who(root).playerId)!).filter(Boolean);
const mainFloor = (_root: Root, me: Player) => me.factory.floors.get(0)!;
const pendingExpansion = (_root: Root, me: Player) => me.factory.pendingExpansion()!;
/** The loading bay printed on the main floor, top-right (M9): a box over that part of the tile. */
const mainBay = { chit: mainFloor, offset: { x: 0.29, y: 0.29 }, scale: { x: 0.42, y: 0.42 } };
/** Another player's spark (a counter in the player bar). */
const sparkOf = (who: (root: Root) => Player, pick: (p: Player) => { id?: string }) => ({ ui: (root: Root) => `spark:${pick(who(root)).id}` });
/** One side of your uncommitted car mainline, by manufacturing step (rotation 0: A bottom, B right, C left, D top). */
/** Your first mainline (unturned, so its sides are where they are printed) */
const firstMainline = (_root: Root, me: Player) => me.factory.placedTiles().find((t) => t.kind === "mainline")!;
/** Year 2's second mainline, out on the expansion, turned twice: A top, B left, C right (against the paint), D bottom */
const secondMainline = (_root: Root, me: Player) => me.factory.placedTiles().find((t) => t.kind === "mainline" && !t.committed)!;
const secondSide = (step: "A" | "B" | "C" | "D") => {
  const edge = { A: { y: 0.4, sy: 0.25 }, B: { x: -0.4, sx: 0.25 }, C: { x: 0.4, sx: 0.25 }, D: { y: -0.4, sy: 0.25 } }[step];
  return { chit: secondMainline, offset: { x: edge.x ?? 0, y: edge.y ?? 0 }, scale: { x: edge.sx ?? 1, y: edge.sy ?? 1 } };
};
/** The newest of this year's pieces of a kind (a second brake, say), and the newest indicator of a dimension */
const newest = (sig: string) => (_root: Root, me: Player) => me.factory.placedTiles().filter((t) => t.signature() === sig && !t.committed).at(-1);
const newestIndicator = (dimension: string) => (_root: Root, me: Player) => me.factory.indicators.filter((i) => i.dimension === dimension && !i.committed).at(-1)!;
const indicatorAt = (dimension: string, x: number, y: number) => (_root: Root, me: Player) => me.factory.indicators.some((i) => i.dimension === dimension && i.x === x && i.y === y);
/** The ring for a drop spot on last year's expansion (6×8, unturned, its top-left at (-6, 0)): as floorSpot */
const expansionSpot = (x: number, y: number, w: number, h: number) => ({
  chit: (_root: Root, me: Player) => me.factory.floors.find((f) => f.kind === "expansion" && f.committed)!,
  offset: { x: (x + 6 + w / 2) / 6 - 0.5, y: 0.5 - (y + h / 2) / 8 },
  scale: { x: w / 6, y: h / 8 },
});
const myDealer = (_root: Root, me: Player) => me.factory.placedTiles().find((t) => t.kind === "dealership")!;
/** Year 1's paint and its design indicator, on side C of the first mainline (and of the second, once it stands) */
const myPaint = (_root: Root, me: Player) => me.factory.placedTiles().find((t) => t.stationId === "paint")!;
const paintSpec = (_root: Root, me: Player) => me.factory.indicators.find((i) => i.dimension === "design")!;
/** Your dealer's cubes, or the dealer itself while it has none */
const dealerCubes = (root: Root, me: Player) => { const d = myDealer(root, me); return d.cubes.length ? d.cubes.copy() : [d]; };
const mainlineSide = (step: "A" | "B" | "C" | "D") => {
  const edge = { A: { y: -0.4, sy: 0.25 }, B: { x: 0.4, sx: 0.25 }, C: { x: -0.4, sx: 0.25 }, D: { y: 0.4, sy: 0.25 } }[step];
  return { chit: firstMainline, offset: { x: edge.x ?? 0, y: edge.y ?? 0 }, scale: { x: edge.sx ?? 1, y: edge.sy ?? 1 } };
};
/** A player's windows lying on the market (a staged one still waits above it). */
/** The players' cards played this year (the neutral cards lie beside them, face down, from the phase's start) */
const playersCards = (root: Root) => root.market.played.filter((c) => !!c.ownerId);
/** What a player has placed this year (not yet fixed): one box round it, so the camera can frame it */
const newTilesOf = (who: (root: Root) => Player) => (root: Root) => who(root).factory.placedTiles().filter((t) => !t.committed);
const neutralCards = (root: Root) => root.market.played.filter((c) => !c.ownerId);
const windowsOf = (who: (root: Root) => Player) => (root: Root) => root.market.windows.filter((w) => w.playerId === who(root).playerId && !w.staged);
const windowDown = (who: (root: Root) => Player) => checks.state<Player, Root>((root) => windowsOf(who)(root).length > 0);
/** Your spec indicator of a dimension (and slot), placed this year */
const indicatorOf = (dimension: string, slot?: number) => (_root: Root, me: Player) => me.factory.indicators.find((i) => i.dimension === dimension && (slot === undefined || i.slot === slot) && !i.committed)!;

// ------------------------------------------------------------------------------------- checks ---
const hasButton = (ctx: Ctx, label: string) => !!ctx.prompt?.buttons.some((b) => b.label.toLowerCase() === label.toLowerCase());

/** The player pressed the engine's Confirm: one was showing during this step and is gone now. */
function confirmed(hint: string): Checker<Player, Root> {
  let seen: string | undefined;
  const check = ((ctx: Ctx) => {
    if (hasButton(ctx, "Confirm")) {
      seen = ctx.prompt!.id;
      return hint;
    }
    return seen !== undefined && ctx.prompt?.id !== seen ? true : hint;
  }) as Checker<Player, Root>;
  // A Confirm already showing when the step starts counts as seen: it can be answered before the
  // check is next read
  check.reset = (ctx) => {
    seen = hasButton(ctx as Ctx, "Confirm") ? ctx.prompt!.id : undefined;
  };
  return check;
}

/** Done once `done` holds, or once the engine stops to ask for a Confirm on the way there (a draw
 *  after a choice): the next step is the Confirm. */
const awaitingConfirm = (done: (root: Root, me: Player) => boolean): Checker<Player, Root> =>
  ((ctx: Ctx) => done(ctx.root, ctx.me) || hasButton(ctx, "Confirm")) as Checker<Player, Root>;

/**
 * What the gallery buttons a step asks the player to tap would open, for headless runs (the
 * harness taps them; in the browser the player does).
 */
export const uiGalleries: { [ui: string]: { of: (root: Root, me: Player) => Chit } } = {
  "button:Hand": { of: (_root, me) => me.hand.cards as unknown as Chit },
};

/**
 * The bots that may move in a step, for recording a run (scripts/tutorial): any other bot waits,
 * Confirms aside. Replays need no list: a bot waits for the step of its next scripted move.
 */
export const stepActors: Record<string, string[]> = {};
/**
 * While a run is recorded (scripts/tutorial), each bot's free choice is steered: the result is added to the
 * option's score, and -Infinity vetoes it. Use it for what the lesson needs the bots not to do (end the period
 * early, take the card you will need); replays follow the pins, so it only shapes what gets recorded.
 */
export type Steer = (c: { step: string; bot: string; option: AiOption; view: Root; me: Player }) => number;
export const steer: Steer = ({ step, bot, option, me }) => {
  // Sam researches design, an off-board track, so the innovation rule has something to show in phase 7.
  if (step === "others-research-sam" && bot === "p2" && option.key === "research.space") {
    const track = (option as { chit?: { parent?: { dimension?: string } } }).chit?.parent;
    return track?.dimension === "design" ? 1000 : 0;
  }
  // Year 2: each bot moves only its own markers (the lesson names them); Robin bets on range, Sam on design.
  if (/^y2-others-research-/.test(step) && option.key === "research.marker") {
    return (option as { chit?: { playerId?: string } }).chit?.playerId === me.playerId ? 0 : -Infinity;
  }
  if (/^y2-others-research-/.test(step) && option.key === "research.space") {
    const space = (option as { chit?: { parent?: { dimension?: string }; markers?: { copy(): { playerId: string }[] } } }).chit;
    if (!space?.markers?.copy().some((m) => m.playerId === me.playerId)) return -Infinity;
    const want = bot === "p1" ? "range" : "design";
    return space.parent?.dimension === want ? 1000 : 0;
  }
  // Year 2: Sam, choosing first, takes slot 1 (the patents); Robin takes what is left
  if (step === "y2-others-focus-sam" && bot === "p2" && option.key === "focus.slot") {
    return (option as { chit?: { index?: number } }).chit?.index === 1 ? 1000 : 0;
  }
  if (step === "y2-others-focus-robin" && bot === "p1") return option.key === "focus.slot" ? 10 : 0;
  return 0;
};

/** Cue phrases that no sentence contains (see `beats`). */
export const cueProblems: string[] = [];
/** Steps with no narration recording (see `say`). */
export const narrationProblems: string[] = [];

// -------------------------------------------------------------------------------------- script ---
function intro(t: Strings, pins: Pins): TutorialSpec<Player, Root> {
  const text = (id: string) => (t.steps as Record<string, string>)[id] ?? `(missing text: ${id})`;
  const hint = (id: string) => (t.hints as Record<string, string>)[id];
  // Narration rendered by scripts/tutorial/audio.mjs (MP3 + exact sentence times). A step without a
  // recording stays silent and is reported by `narrationProblems` (scripts/tutorial `check` fails on it).
  // Until the developer approves the tutorial there is no recording at all: the narrator's provider
  // is "none", each step runs on the engine's reading clock, and nothing is reported missing.
  // Record (system TTS, then ElevenLabs) only once they have signed off on the script.
  const silent = (t as { narrator?: { provider?: string } }).narrator?.provider === "none";
  const say = (id: string): Pick<Step, "id" | "text" | "audio" | "sentenceTimes"> => {
    const n = silent ? undefined : narration[t.locale]?.[id];
    if (!n && !silent) narrationProblems.push(`step "${id}" (${t.locale}) has no recording: run scripts/tutorial/audio.mjs`);
    return n ? { id, text: text(id), audio: n.url, sentenceTimes: n.sentenceTimes } : { id, text: text(id) };
  };
  /** A step that waits for the bots: they play, you watch. */
  const othersStep = (id: string, waitFor: Checker<Player, Root>, extra: Partial<Step> = {}): Step => ({
    ...say(id),
    allow: [],
    waitFor,
    hint: { after: 12, text: hint(id) ?? "Robin and Sam are still taking their turns." },
    timeline: "play", // what it waits for only shows once the board has caught up
    ...extra,
  });
  /** A step that asks you to do one thing. */
  const doIt = (id: string, allow: Step["allow"], waitFor: Checker<Player, Root>, extra: Partial<Step> = {}): Step => ({
    ...say(id),
    allow,
    waitFor,
    hint: { after: 8, text: hint(id) ?? "" },
    timeline: "play", // your prompt only shows once the board has caught up
    ...extra,
  });
  /**
   * Highlights that follow the narration, one beat per sentence: each beat starts at the sentence
   * that contains its phrase (the first beat, with phrase "", at the start). Phrases rather than
   * sentence numbers, so editing a text cannot silently shift its highlights; a phrase that is no
   * longer in the text is reported by `cueProblems` (scripts/tutorial `check` fails on it).
   */
  /** The sentence of step `id` that contains `phrase` (see `beats`). */
  const at = (id: string, phrase: string): { sentence: number } => {
    const i = splitSentences(text(id)).findIndex((x) => x.includes(phrase));
    if (i < 0) cueProblems.push(`step "${id}": no sentence contains "${phrase}"`);
    return { sentence: Math.max(0, i) };
  };
  /**
   * When `word` is spoken in step `id` (its `nth` occurrence, 0-based): the second it starts, from
   * the recording's word times, or else on the engine's reading clock (3 words a second, spread over
   * the sentences by length, as it times sentence cues). For cues inside a sentence ("Launch, Advertise…").
   */
  const onWord = (id: string, word: string, nth = 0): number | { sentence: number } => {
    const norm = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
    const hits = ((silent ? undefined : narration[t.locale]?.[id]?.words) ?? []).filter(([w]) => norm(w) === norm(word));
    if (hits[nth]) return hits[nth][1];
    const sentences = splitSentences(text(id));
    const joined = sentences.join("");
    const re = new RegExp(`(?<![\\p{L}\\p{N}-])${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}-])`, "giu");
    const found = [...joined.matchAll(re)][nth];
    if (!found) {
      cueProblems.push(`step "${id}": no word "${word}" (occurrence ${nth})`);
      return { sentence: 0 };
    }
    // A recording without word times (a `say` draft): spread the word over its sentence's real span
    const n = silent ? undefined : narration[t.locale]?.[id];
    if (n?.sentenceTimes?.length) {
      let s = 0;
      let start = 0;
      while (s < sentences.length - 1 && start + sentences[s].length <= found.index!) start += sentences[s++].length;
      const from = n.sentenceTimes[s] ?? 0;
      const to = n.sentenceTimes[s + 1] ?? (n as { duration?: number }).duration ?? from + sentences[s].split(/\s+/).length / 3;
      return from + ((found.index! - start) / sentences[s].length) * Math.max(0, to - from);
    }
    const words = text(id).split(/\s+/).filter((w) => w).length;
    return (found.index! / joined.length) * Math.max(1, words / 3);
  };
  const beats = (id: string, list: [string, Focus[], Partial<Cue>?][]): Pick<Step, "focus" | "cues"> & Partial<Step> => {
    const sentences = splitSentences(text(id));
    const cues: Cue[] = [];
    let focus: Focus[] | undefined;
    // The first beat's extras (a hold) apply from the step's start, so they go on the step
    let first: Partial<Cue> | undefined;
    for (const [phrase, f, extra] of list) {
      if (phrase === "") {
        focus = f;
        first = extra;
        continue;
      }
      const at = sentences.findIndex((x) => x.includes(phrase));
      if (at < 0) cueProblems.push(`step "${id}": no sentence contains "${phrase}"`);
      // two beats on one sentence: the second replaces the first at once, so the first is never seen
      else if (cues.some((c) => (c.at as { sentence: number }).sentence === at) || (at === 0 && focus))
        cueProblems.push(`step "${id}": "${phrase}" is in the same sentence as another beat (merge them, or use onWord)`);
      else if (at === 0 && !focus && !extra) focus = f;
      else cues.push({ at: { sentence: at }, focus: f, ...extra });
    }
    return { ...(first as Partial<Step>), focus: focus ?? [], cues };
  };
  /** When cue time `a` falls in step `id`: seconds, from the recording or the reading clock (as `onWord`). */
  const seconds = (id: string, a: number | { sentence: number }): number => {
    if (typeof a === "number") return a;
    const recorded = silent ? undefined : narration[t.locale]?.[id]?.sentenceTimes?.[a.sentence];
    if (recorded !== undefined) return recorded;
    const sentences = splitSentences(text(id));
    const before = sentences.slice(0, a.sentence).join("").length;
    return (before / sentences.join("").length) * Math.max(1, text(id).split(/\s+/).filter((w) => w).length / 3);
  };
  /**
   * `beats` plus highlights on spoken words (`onWord`), for a sentence that walks through several
   * things. The cues stay in time order, so a jump to the end (or Back) lands on the last one.
   */
  const beatsAndWords = (id: string, list: Parameters<typeof beats>[1], words: [number | { sentence: number }, Focus[]][]): Pick<Step, "focus" | "cues"> & Partial<Step> => {
    const b = beats(id, list);
    const cues = [...(b.cues ?? []), ...words.map(([a, focus]): Cue => ({ at: a, focus }))];
    return { ...b, cues: cues.map((c, i) => ({ c, i })).sort((x, y) => seconds(id, x.c.at) - seconds(id, y.c.at) || x.i - y.i).map((x) => x.c) };
  };
  // No step pauses the bots: each waits for the step that scripts its next move (pins), and their
  // Confirms go through whenever they come, so a turn can end behind any step.
  const narrate = (id: string, extra: Partial<Step> = {}): Step => ({ ...say(id), ...extra });
  // ---- the board's timeline: show each thing while it is said ------------------------------------
  // The board plays the game one moment at a time; a step or a beat can play it up to a moment and
  // hold it there (`timeline`), so a bot's move, a ship's arrival or a guest's bonus is on screen,
  // and ringed, while Zoë explains it. Checks read the board as shown.
  /**
   * A log line the board has shown since the step (or the timeline command) began. Not for a bot's
   * last move before another player's part: a moment shows the latest line written before it, so
   * that line is replaced by the next part's first one and never shows (use `since`).
   */
  const logged = (re: RegExp) => checks.logged<Player, Root>(re);
  /** `done(before, now)` holds for a value read on the board, `before` read when the step (or the
   *  timeline command) began */
  const since = <T,>(read: (root: Root, me: Player) => T, done: (before: T, now: T) => boolean): Checker<Player, Root> => {
    let before: T | undefined;
    const check = ((ctx: Ctx) => before !== undefined && done(before, read(ctx.root, ctx.me))) as Checker<Player, Root>;
    check.reset = (ctx) => {
      before = read(ctx.root, ctx.me);
    };
    return check;
  };
  const grew = (read: (root: Root, me: Player) => number) => since(read, (b, n) => n > b);
  /** Your prompt matching `re` was showing during the step and is gone now (you answered it). */
  const promptGone = (re: RegExp, hintText: string): Checker<Player, Root> => {
    let seen = false;
    const check = ((ctx: Ctx) => {
      const m = ctx.prompt?.message ?? "";
      if (re.test(m)) { seen = true; return hintText; }
      return seen ? true : hintText;
    }) as Checker<Player, Root>;
    check.reset = (ctx) => { seen = re.test((ctx as Ctx).prompt?.message ?? ""); };
    return check;
  };
  // Exact moments the narration holds the board on (absolute, so every timing lands on the same one).
  const soldMine = checks.state<Player, Root>((root, me) => me.wealth.value >= 6 && root.year === 1);
  const newTrackIn = checks.state<Player, Root>((root) => root.year === 1 && root.market.bottomTrack?.dimension === "design");
  const oldTrackOut = checks.state<Player, Root>((root) => root.year === 1 && root.market.minSpec("safety") === 1);
  // Every card turned (the black ones last, after every spark has flown): the moment before the buyers
  const allTurned = (root: Root) => root.market.played.length > 0 && root.market.played.every((c) => c.revealed);
  const buyersOnBoard = (root: Root) => root.market.niches.copy().reduce((n, x) => n + x.buyers.length, 0);
  // The neutral cards dealt face down at the start of the phase, before anyone plays
  const neutralDealt = checks.state<Player, Root>((root) => root.year === 1 && neutralCards(root).length >= 3);
  const sparksDown = checks.state<Player, Root>((root) => root.year === 1 && allTurned(root) && root.market.niches.some((n) => n.sparks.length > 0));
  // The black cards' buyers (one left after the sales, three from sparks, three from the neutral cards)
  const neutralBuyers = checks.state<Player, Root>((root) => root.year === 1 && allTurned(root) && buyersOnBoard(root) >= 7);
  const sparkBuyers = logged(/Sparks bring/);
  // The bots' year-1 research and focus, on state like year 2's (a log check held the board a moment early in one
  // timing and not the other once the narration's pauses lengthened the clips). Active tracks start on slot 1.
  const robinResearched1 = checks.state<Player, Root>((root) => root.year === 1 && root.track("safety").positionOf(robin(root).playerId) === 2);
  const samResearched1 = checks.state<Player, Root>((root) => root.year === 1 && root.track("design").positionOf(sam(root).playerId) === 1);
  const robinFocus1 = checks.state<Player, Root>((root) => root.year === 1 && root.office.focusSlot(robin(root).playerId) === 3);
  // Sales are held on wealth (state), not on the log line: see samDesign2 below
  const robinSold = checks.state<Player, Root>((root) => root.year === 1 && robin(root).wealth.value >= 6);
  const samSold = checks.state<Player, Root>((root) => root.year === 1 && sam(root).wealth.value >= 6);
  // Year 2's moments
  const brochuresOf = (year: number) => checks.state<Player, Root>((root) => root.year === year && root.playerAid.phase >= 5);
  const soldMine2 = checks.state<Player, Root>((root, me) => me.wealth.value >= 18 && root.year === 2); // two cars at $6
  const robinSold2 = checks.state<Player, Root>((root) => root.year === 2 && robin(root).wealth.value >= 14); // two cars at $4
  const samSold2 = checks.state<Player, Root>((root) => root.year === 2 && sam(root).wealth.value >= 12); // one at $6
  // State, not log lines: a log check can pass on the game before the board shows the move, and then the
  // hold lands on different moments in different timings (the check's replays caught it)
  const samDesign2 = checks.state<Player, Root>((root) => root.year === 2 && root.track("design").positionOf(sam(root).playerId) === 2);
  const samResearched2 = checks.state<Player, Root>((root) => root.year === 2 && root.track("design").positionOf(sam(root).playerId) === 2 && sam(root).capacity.value === 2);
  const robinRange1 = checks.state<Player, Root>((root) => root.year === 2 && root.track("range").positionOf(robin(root).playerId) === 1);
  const robinResearched2 = checks.state<Player, Root>((root) => root.year === 2 && root.track("range").positionOf(robin(root).playerId) === 1 && robin(root).capacity.value === 2);
  const samFocus2 = checks.state<Player, Root>((root) => root.year === 2 && root.office.focusSlot(sam(root).playerId) === 1);
  // Robin's second-round sale ($4) is the last sale of the year: the board holds there until the public changes its mind
  const sellingOver2 = checks.state<Player, Root>((root) => root.year === 2 && robin(root).wealth.value >= 18);
  const oldTrackOut2 = checks.state<Player, Root>((root) => root.year === 2 && root.market.minSpec("reliability") === 1);
  const newTrackIn2 = checks.state<Player, Root>((root) => root.year === 2 && root.market.leftTrack?.dimension === "range");
  const cardsPlayed2 = (n: number) => checks.state<Player, Root>((root) => root.year === 2 && playersCards(root).length >= n);
  const cardsDown2 = checks.state<Player, Root>((root) => root.year === 2 && playersCards(root).length >= 3);
  const sparksDown2 = checks.state<Player, Root>((root) => root.year === 2 && allTurned(root) && root.market.niches.copy().reduce((n, x) => n + x.sparks.length, 0) >= 5);
  // Nine buyers come from the sparks (one was on the board): true from that moment on
  const sparkBuyers2 = checks.state<Player, Root>((root) => root.year === 2 && root.market.niches.copy().reduce((n, x) => n + x.buyers.length, 0) >= 10);
  // Then the black cards' three
  const neutralBuyers2 = checks.state<Player, Root>((root) => root.year === 2 && allTurned(root) && buyersOnBoard(root) >= 13);
  const nextYear2 = checks.state<Player, Root>((root) => root.year >= 3);
  const nextYear = checks.state<Player, Root>((root) => root.year >= 2);
  const cardsDown = checks.state<Player, Root>((root) => root.year === 1 && playersCards(root).length >= 3);
  /** Play the board on to the first moment that passes `check`, and hold it there */
  const upTo = (check: Checker<Player, Root>) => ({ timeline: { until: check } });
  /**
   * A bot's part of the turn, watched as it happens: the board plays its moves and holds on the last
   * one (`last`) while the narration explains them. Only that bot moves meanwhile (`stepActors`:
   * recorded, its moves are pinned to this step, and a replay holds the others until their own).
   */
  const watch = (id: string, bot: string, last: Checker<Player, Root>, extra: Partial<Step> = {}): Step => {
    stepActors[id] = [bot];
    const step = othersStep(id, last, { ...upTo(last), ...extra });
    // Whatever order the beats fire in, the board must end up on the moment the step waits for
    const commands = [step.timeline, ...(step.cues ?? []).map((c) => c.timeline)].filter(Boolean);
    const final = commands[commands.length - 1] as { until?: unknown } | undefined;
    if (final?.until !== last) cueProblems.push(`step "${id}": its last timeline command must play the board up to the moment it waits for`);
    return step;
  };
  const confirm = (id: string, extra: Partial<Step> = {}): Step =>
    doIt(id, { button: "Confirm" }, confirmed(hint(id) ?? "Tap Confirm."), { focus: [{ arrow: { ui: "button:Confirm" } }], box: { anchor: "top-right" }, ...extra });

  const steps: Step[] = [
    // ------------------------------------------------------------------ the table
    narrate("welcome", { box: { anchor: "center" }, focus: [] }),
    // One thing per sentence: a beat lands at its sentence's start, so "beside our name" and "the clock" in one
    // sentence had the clock ringed while the narrator pointed at the money (developer, 2026-11-13)
    narrate(
      "goal",
      beats("goal", [
        ["", [{ arrow: spark((me) => me.wealth) }]],
        ["When the clock runs out", [{ ring: clockSpaces, zoom: false }, { ring: timecard, arrow: true }]],
      ]),
    ),
    narrate(
      "chain",
      beats("chain", [
        ["Buyers want", [{ ring: nichesWithBuyers, separate: true, arrow: true, reveal: true }]],
        ["stations in our factory", [{ ring: factory, arrow: true, reveal: true, zoom: false }]],
        ["Stations come from research", [{ ring: activeTracks, separate: true, arrow: true, reveal: true }]],
      ]),
    ),
    narrate(
      "market",
      beats("market", [
        ["", [{ ring: market, reveal: true, zoom: false }]],
        ["niche", [{ ring: (root) => root.market.niches.copy(), zoom: false }]],
        ["buyers", [{ ring: nichesWithBuyers, separate: true, arrow: true }]],
      ]),
    ),
    narrate("market-types", { focus: [{ ring: nichesWithBuyers, separate: true, arrow: true, reveal: true }] }),
    narrate(
      "axes",
      beatsAndWords(
        "axes",
        [
          ["", [{ ring: nichesWithBuyers, separate: true }]],
          ["Read the axes", [{ ring: (root) => [root.market.bottomAxis, root.market.leftAxis], separate: true, arrow: true }]],
          ["further", [{ ring: (root) => root.market.niche(8, 1), arrow: true }, { ring: (root) => root.market.niche(1, 8), arrow: true }]],
        ],
        [
          [onWord("axes", "safety"), [{ ring: (root) => root.market.bottomTrack!, arrow: true }, { ring: (root) => root.market.bottomAxis }]],
          [onWord("axes", "reliability"), [{ ring: (root) => root.market.leftTrack!, arrow: true }, { ring: (root) => root.market.leftAxis }]],
        ],
      ),
    ),
    narrate(
      "axes-why",
      beatsAndWords(
        "axes-why",
        [
          ["", [{ ring: nichesWithBuyers, separate: true, arrow: true }]],
          ["Three of them", [{ ring: (root) => [root.market.niche(7, 1), root.market.niche(7, 2), root.market.niche(8, 1)], separate: true, arrow: true }, { ring: axisMark("bottom", 0) }, { ring: axisMark("left", 0) }]],
          ["This one wants", [{ ring: (root) => root.market.niche(6, 1), arrow: true }, { ring: axisMark("left", 1), arrow: true }]],
          ["That is why", [{ ring: nichesWithBuyers, separate: true }]],
          ["top-right", [{ ring: (root) => root.market.niche(1, 8), arrow: true }]],
        ],
        [[onWord("axes-why", "three", 1), [{ ring: (root) => root.market.niche(1, 8) }, { ring: axisMark("bottom", 3), arrow: true }, { ring: axisMark("left", 3), arrow: true }]]],
      ),
    ),
    narrate(
      "tracks",
      beats("tracks", [
        ["", [{ ring: activeTracks, separate: true, reveal: true }, { ring: offBoard, separate: true, reveal: true }]],
        ["Only two", [{ ring: activeTracks, separate: true, arrow: true }]],
        ["other three", [{ ring: offBoard, separate: true, arrow: true }]],
      ]),
    ),
    narrate(
      "tracks-slots",
      beats("tracks-slots", [
        ["", [{ ring: (root) => root.track("reliability").slots.filter((s) => s.position > 0), separate: true }]],
        ["reaches a slot", [{ ring: (root) => root.track("reliability").slot(2), arrow: true }]],
      ]),
    ),
    narrate(
      "tracks-markers",
      beatsAndWords(
        "tracks-markers",
        [
          ["", [{ ring: myMarkers, separate: true, arrow: true }]],
          ["first slot", [{ ring: (root) => activeTracks(root).map((t) => t.slot(1)), separate: true, arrow: true }]],
          ["start spot", [{ ring: (root) => offBoard(root).map((t) => t.slot(0)), separate: true, arrow: true }]],
        ],
        [
          [onWord("tracks-markers", "blue"), [{ ring: markersOf(robin), separate: true, arrow: true }]],
          [onWord("tracks-markers", "purple"), [{ ring: markersOf(sam), separate: true, arrow: true }]],
        ],
      ),
    ),
    narrate(
      "office",
      beats("office", [
        ["", [{ ring: office, reveal: true, zoom: false }]],
        ["first to build", [{ ring: officeSpace("focus", 1), arrow: true }, { ring: supply, zoom: false }]],
        ["first to sell", [{ ring: officeSpace("focus", 3), arrow: true }, { ring: nichesWithBuyers, separate: true }]],
      ]),
    ),
    narrate(
      "factory",
      beats("factory", [
        ["", [{ ring: factory, reveal: true, zoom: false }]],
        ["black", [{ ring: mainFloor, zoom: false }]],
        ["loading bay", [{ ring: mainBay, arrow: true }]],
      ]),
    ),
    narrate(
      "departments",
      beats("departments", [
        ["", [{ ring: myTiles("department"), separate: true, arrow: true }]],
        ["research department", [{ ring: myDepartments("research"), arrow: true }]],
        ["planning department", [{ ring: myDepartments("planning"), arrow: true }, { ring: officeSpaces("gantt"), zoom: false }]],
        ["touch the bay", [{ ring: myTiles("department"), separate: true }, { ring: mainBay, arrow: true }]],
      ]),
    ),
    narrate(
      "supply",
      beats("supply", [
        ["", [{ ring: supply, arrow: true, reveal: true, zoom: false }]],
        ["radiators are gone", [{ ring: (root) => root.supply.stacks.find((s) => s.key === "station:radiator"), arrow: true }]],
      ]),
    ),
    narrate("cards", { focus: [{ ring: hand, arrow: true, reveal: true }] }),
    // ------------------------------------------------------------------ setup
    doIt("place-departments", [{ key: "build.done" }], promptGone(/starting departments/, hint("place-departments") ?? ""), {
      ...beats("place-departments", [
        ["", [{ ring: myTiles("department"), separate: true, arrow: true }, { ring: mainBay }]],
        ["Tap Done", [{ ring: myTiles("department"), separate: true }, { arrow: { ui: "button:Done" } }]],
      ]),
    }),
    confirm("confirm-setup"),
    othersStep("others-setup", checks.state((root) => root.year >= 1), { focus: [{ ring: (root) => robin(root).factory.placedTiles(), arrow: true, reveal: true }] }),
    // ------------------------------------------------------------------ year 1: research
    narrate(
      "research",
      beats("research", [
        ["", [{ ring: activeTracks, separate: true, reveal: true }, { ring: offBoard, separate: true }]],
        ["research department", [{ ring: myDepartments("research"), arrow: true, reveal: true }]],
      ]),
    ),
    narrate(
      "research-rules",
      beats("research-rules", [
        ["", [{ ring: myMarkers, separate: true, arrow: true, reveal: true }]],
        ["any marker on any track", [{ ring: (root) => root.allTracks().flatMap((t) => t.markers()), separate: true }]],
        ["first engineering slot", [{ ring: officeSpace("focus", 1), arrow: true, reveal: true }]],
        ["More research departments", [{ ring: myDepartments("research"), arrow: true, reveal: true }]],
      ]),
    ),
    narrate("research-capacity", { focus: [{ arrow: spark((me) => me.capacity) }, { arrow: { ui: "button:Capacity" } }] }),
    narrate(
      "research-clock",
      beats("research-clock", [
        ["", [{ ring: clockSlots, separate: true, reveal: true }]],
        ["timecard", [{ ring: timecard, arrow: true, reveal: true }]],
      ]),
    ),
    doIt("research-space", [{ key: "research.space", chit: mySlot("reliability") }], checks.promptMessage(/whose marker/), {
      ...beats("research-space", [
        ["", [{ ring: (root) => root.track("reliability"), arrow: true, dim: true }]],
        ["next slot is the chassis", [{ ring: (root) => root.track("reliability").slot(2), arrow: true, dim: true }]],
        ["Tap the battery", [{ ring: mySlot("reliability"), arrow: true, dim: true }]],
      ]),
    }),
    doIt("research-marker", [{ key: "research.marker", chit: (root, me) => root.track("reliability").markerOf(me.playerId)! }], checks.state((root, me) => root.track("reliability").positionOf(me.playerId) === 2), {
      focus: [{ ring: (root, me) => root.track("reliability").markerOf(me.playerId)!, arrow: true, dim: true }],
    }),
    confirm("confirm-research"),
    narrate("research-done", {
      ...beats("research-done", [
        ["", [{ ring: (root, me) => root.track("reliability").markerOf(me.playerId)!, arrow: true }]],
        ["build a chassis", [{ ring: (root) => root.track("reliability").slot(2), arrow: true }]],
      ]),
    }),
    watch("others-research-robin", "p1", robinResearched1, {
      ...beats("others-research-robin", [
        ["", [{ ring: (root) => root.track("safety").slot(1), arrow: true, reveal: true }]],
        ["other track", [{ ring: (root) => root.track("safety"), arrow: true }]],
      ]),
    }),
    watch("others-research-sam", "p2", samResearched1, {
      ...beats("others-research-sam", [
        ["", [{ ring: (root) => root.track("design").slot(1), arrow: true, reveal: true }]],
        ["one track leaves", [{ ring: (root) => root.market.obsolescenceMarker, arrow: true, reveal: true }]],
        ["betting on design", [{ ring: (root) => root.track("design"), arrow: true, reveal: true }]],
      ]),
    }),
    // ------------------------------------------------------------------ year 1: focus
    narrate(
      "focus",
      beats("focus", [
        ["", [{ ring: officeSpaces("focus"), reveal: true, zoom: false }]],
        ["engineering on the left", [{ ring: officeSpaces("focus"), separate: true }]],
        ["Slot 1", [{ ring: officeSpace("focus", 1), arrow: true }]],
        ["last open slot", [{ ring: officeSpace("focus", 3), arrow: true }]],
        ["slots 4 and 5", [{ ring: (root) => [officeSpace("focus", 4)(root), officeSpace("focus", 5)(root)], separate: true }]],
      ]),
    ),
    narrate(
      "focus-patents",
      beats("focus-patents", [
        ["", [{ ring: officeSpaces("focus"), separate: true, reveal: true, zoom: false }]],
        ["Slot 1 can build", [{ ring: officeSpace("focus", 1), arrow: true }, { ring: activeTracks, separate: true }]],
        ["Slot 2 can build", [{ ring: officeSpace("focus", 2), arrow: true }, { ring: activeTracks, separate: true }]],
        ["Slot 3 can build", [{ ring: officeSpace("focus", 3), arrow: true }]],
        ["supply runs short", [{ ring: supply, arrow: true, reveal: true, zoom: false }]],
      ]),
    ),
    narrate(
      "focus-gantt",
      beats("focus-gantt", [
        ["", [{ ring: officeSpaces("gantt"), zoom: false }]],
        ["most Gantt charts", [{ ring: officeSpaces("gantt"), zoom: false }, { arrow: spark((me) => me.gantt) }]],
        ["back to zero", [{ ring: officeSpace("gantt", 0), arrow: true }]],
        ["If you pass", [{ ring: officeSpaces("gantt"), zoom: false }]],
      ]),
    ),
    doIt("focus-do", [{ key: "focus.slot", chit: officeSpace("focus", 1) }], checks.state((root, me) => root.office.focusSlot(me.playerId) === 1), {
      ...beats("focus-do", [
        ["", [{ arrow: spark((me) => me.gantt) }, { ring: officeSpaces("gantt"), dim: true, zoom: false }]],
        ["Take slot 1", [{ ring: officeSpace("focus", 1), arrow: true, dim: true }]],
      ]),
    }),
    confirm("confirm-focus"),
    watch("others-focus-robin", "p1", robinFocus1, { focus: [{ ring: officeSpace("focus", 3), arrow: true }] }),
    watch("others-focus-sam", "p2", checks.promptMessage(/build their factory/), {
      ...beats("others-focus-sam", [
        ["", [{ ring: officeSpaces("gantt"), zoom: false }, { arrow: sparkOf(sam, (p) => p.gantt) }]],
        ["slot 2", [{ ring: officeSpace("focus", 2), arrow: true }]],
      ]),
    }),
    // ------------------------------------------------------------------ year 1: build
    narrate(
      "build",
      beats("build", [
        ["", [{ ring: factory, reveal: true, zoom: false }, { arrow: { ui: "players" } }]],
        ["Add gallery", [{ ring: { ui: "gallery:inline" } }, { arrow: { ui: "button:Add" } }]],
      ]),
    ),
    narrate(
      "build-rules",
      beats("build-rules", [
        ["", [{ ring: mainFloor, zoom: false }]],
        ["not on the loading bay", [{ ring: mainFloor, zoom: false }, { ring: mainBay, arrow: true }]],
        ["must touch the bay", [{ ring: myTiles("department"), separate: true }, { ring: mainBay, arrow: true }]],
      ]),
    ),
    doIt("add-mainline", [{ key: "build.add", chit: entry("mainline:car") }], checks.state((root, me) => !!tile("mainline:car")(root, me)), {
      focus: [{ arrow: { ui: "button:Add" } }, { ring: entry("mainline:car"), arrow: true }],
    }),
    doIt("place-mainline", [{ key: "build.move", chit: tile("mainline:car"), target: dropAt(3, 3, 4, 3) }], checks.state(at_("mainline:car", 3, 3)), {
      focus: [{ ring: tile("mainline:car"), arrow: true }, { ring: floorSpot(3, 3, 4, 3) }],
    }),
    narrate(
      "mainline",
      beats("mainline", [
        ["", [{ ring: tile("mainline:car"), arrow: true, dim: true }]],
        ["A is", [{ ring: mainlineSide("A"), arrow: true, dim: true }]],
        ["B is", [{ ring: mainlineSide("B"), arrow: true, dim: true }]],
        ["C is", [{ ring: mainlineSide("C"), arrow: true, dim: true }]],
        ["D is", [{ ring: mainlineSide("D"), arrow: true, dim: true }]],
        ["Each station", [{ ring: tile("mainline:car"), arrow: true, dim: true }]],
      ]),
    ),
    doIt("add-dealer", [{ key: "build.add", chit: entry("dealership:0") }], checks.state((root, me) => !!tile("dealership:0")(root, me)), {
      focus: [{ arrow: { ui: "button:Add" } }, { ring: entry("dealership:0"), arrow: true }],
    }),
    doIt("rotate-dealer", [{ button: "Rotate" }], checks.state((root, me) => tile("dealership:0")(root, me)?.rotation === 1), {
      focus: [{ ring: tile("dealership:0") }, { arrow: { ui: "button:Rotate" } }],
    }),
    doIt("place-dealer", [{ key: "build.move", chit: tile("dealership:0"), target: dropAt(0, 3, 3, 4) }], checks.state(at_("dealership:0", 0, 3)), {
      focus: [{ ring: tile("dealership:0"), arrow: true }, { ring: floorSpot(0, 3, 3, 4) }],
    }),
    narrate(
      "dealer-done",
      beats("dealer-done", [
        ["", [{ ring: (root, me) => [tile("mainline:car")(root, me)!, tile("dealership:0")(root, me)!], separate: true, arrow: true, dim: true }]],
        ["bottom-left buyers", [{ ring: specFreeBuyers, separate: true, arrow: true, reveal: true }]],
      ]),
    ),
    narrate(
      "zones",
      beats("zones", [
        ["", [{ ring: (root) => root.track("reliability").slot(2), arrow: true, reveal: true }]],
        ["A side", [{ ring: mainlineSide("A"), arrow: true, reveal: true, dim: true }]],
        ["hatching", [{ ring: tile("mainline:car"), arrow: true, dim: true }]],
      ]),
    ),
    narrate("zones-rule", { focus: [{ ring: tile("mainline:car"), arrow: true, dim: true }] }),
    doIt("add-chassis", [{ key: "build.add", chit: entry("station:chassis") }], checks.state((root, me) => !!tile("station:chassis")(root, me)), {
      focus: [{ arrow: { ui: "button:Add" } }, { ring: entry("station:chassis"), arrow: true }],
    }),
    doIt("place-chassis", [{ key: "build.move", chit: tile("station:chassis"), target: dropAt(4, 6, 3, 4) }], checks.state(at_("station:chassis", 4, 6)), {
      focus: [{ ring: tile("station:chassis"), arrow: true }, { ring: floorSpot(4, 6, 3, 4) }],
    }),
    doIt("add-spec", [{ button: "Add spec" }], checks.state((_root, me) => me.factory.indicators.length > 0), {
      ...beats("add-spec", [
        ["", [{ ring: tile("station:chassis"), arrow: true, dim: true }]],
        ["reliability research", [{ ring: (root, me) => root.track("reliability").markerOf(me.playerId)!, arrow: true, reveal: true }]],
        ["Tap Add spec", [{ ring: tile("station:chassis"), reveal: true }, { arrow: { ui: "button:Add spec" } }]],
      ]),
    }),
    doIt("place-spec", [{ key: "build.move", chit: (_root, me) => me.factory.indicators.get(0)!, target: dropAt(3, 6, 1, 1) }], checks.state((_root, me) => me.factory.indicators.some((i) => i.x === 3 && i.y === 6)), {
      focus: [{ ring: (_root, me) => me.factory.indicators.get(0)!, arrow: true }, { ring: floorSpot(3, 6, 1, 1) }],
    }),
    narrate(
      "spec-done",
      beats("spec-done", [
        ["", [{ ring: myIndicators, separate: true, arrow: true, dim: true }]],
        ["Every car", [{ ring: tile("mainline:car"), arrow: true, dim: true }, { ring: myIndicators, separate: true, dim: true }]],
      ]),
    ),
    // ---- year 1: paint, through slot 1's patents (Sam's design research), on side C where the dealer stood
    narrate(
      "paint-why",
      beats("paint-why", [
        ["", [{ ring: officeSpace("focus", 1), arrow: true, reveal: true, zoom: false }]],
        ["Sam's marker", [{ ring: (root) => root.track("design").markerOf(sam(root).playerId)!, arrow: true, reveal: true }]],
        ["not on the market", [{ ring: activeTracks, separate: true, reveal: true }]],
        ["next year", [{ ring: officeSpace("focus", 1), arrow: true, reveal: true, zoom: false }]],
      ]),
    ),
    doIt("move-dealer", [{ key: "build.move", chit: tile("dealership:0"), target: dropAt(0, 5, 3, 4) }], checks.state(at_("dealership:0", 0, 5)), {
      ...beats("move-dealer", [
        ["", [{ ring: mainlineSide("C"), arrow: true, reveal: true, dim: true }, { ring: tile("dealership:0") }]],
        ["drag the dealer down", [{ ring: tile("dealership:0"), arrow: true }, { ring: floorSpot(0, 5, 3, 4) }]],
      ]),
    }),
    doIt("add-paint", [{ key: "build.add", chit: entry("station:paint") }], checks.state((root, me) => !!tile("station:paint")(root, me)), {
      focus: [{ arrow: { ui: "button:Add" } }, { ring: entry("station:paint"), arrow: true }],
    }),
    doIt("rotate-paint", [{ button: "Rotate" }], checks.state((root, me) => tile("station:paint")(root, me)?.rotation === 1), {
      focus: [{ ring: tile("station:paint") }, { arrow: { ui: "button:Rotate" } }],
    }),
    doIt("place-paint", [{ key: "build.move", chit: tile("station:paint"), target: dropAt(0, 3, 3, 2) }], checks.state(at_("station:paint", 0, 3)), {
      focus: [{ ring: tile("station:paint"), arrow: true }, { ring: floorSpot(0, 3, 3, 2) }],
    }),
    doIt("paint-spec", [{ button: "Add spec" }], checks.state((_root, me) => me.factory.indicators.some((i) => i.dimension === "design")), {
      ...beats("paint-spec", [
        ["", [{ ring: tile("station:paint"), arrow: true, dim: true }]],
        ["Sam's research", [{ ring: (root) => root.track("design").slot(1), arrow: true, reveal: true }]],
        ["Tap Add spec", [{ ring: tile("station:paint"), reveal: true }, { arrow: { ui: "button:Add spec" } }]],
      ]),
    }),
    doIt("place-paint-spec", [{ key: "build.move", chit: indicatorOf("design"), target: dropAt(1, 2, 1, 1) }], checks.state(indicatorAt("design", 1, 2)), {
      focus: [{ ring: indicatorOf("design"), arrow: true }, { ring: floorSpot(1, 2, 1, 1) }],
    }),
    narrate(
      "paint-done",
      beats("paint-done", [
        ["", [{ ring: indicatorOf("design"), arrow: true, dim: true }, { ring: tile("mainline:car"), dim: true }]],
        ["worth nothing", [{ ring: activeTracks, separate: true, reveal: true }]],
      ]),
    ),
    narrate(
      "marketing-why",
      beats("marketing-why", [
        ["", [{ ring: tile("dealership:0"), arrow: true, dim: true }]],
        ["market window", [{ ring: market, reveal: true, zoom: false }]],
        ["small dealer", [{ ring: tile("dealership:0"), arrow: true, reveal: true, dim: true }]],
        ["marketing department", [{ ring: floorSpot(0, 9, 4, 3), dim: true }]],
      ]),
    ),
    doIt("add-marketing", [{ key: "build.add", chit: entry("dept:marketing") }], checks.state((root, me) => !!tile("dept:marketing")(root, me)), {
      focus: [{ arrow: { ui: "button:Add" } }, { ring: entry("dept:marketing"), arrow: true }],
    }),
    doIt("place-marketing", [{ key: "build.move", chit: tile("dept:marketing"), target: dropAt(0, 9, 4, 3) }], checks.state(at_("dept:marketing", 0, 9)), {
      focus: [{ ring: tile("dept:marketing"), arrow: true }, { ring: floorSpot(0, 9, 4, 3) }],
    }),
    narrate(
      "expansion",
      beats("expansion", [
        ["", [{ ring: pendingExpansion, arrow: true }]],
        ["own loading bay", [{ ring: pendingExpansion, arrow: true }]],
        ["until next year", [{ ring: pendingExpansion, arrow: true }]],
      ]),
    ),
    doIt("done-build", [{ key: "build.done" }], promptGone(/build their factory/, hint("done-build") ?? ""), {
      focus: [{ ring: factory, zoom: false }, { arrow: { ui: "button:Done" } }],
    }),
    confirm("confirm-build", upTo(checks.state((root) => root.playerAid.phase >= 5))), // the same hold as "brochures"
    othersStep("others-build", checks.state((root) => root.playerAid.phase >= 4), {
      ...beats("others-build", [
        ["", [{ ring: newTilesOf(robin), arrow: true, reveal: true }]],
        ["engineering order", [{ ring: officeSpaces("focus"), separate: true, reveal: true }]],
      ]),
    }),
    narrate("others-build-look", {
      ...upTo(checks.state((root) => root.playerAid.phase >= 5)),
      ...beats("others-build-look", [
        ["", [{ ring: (root) => robin(root).factory.floors.copy(), separate: true, reveal: true }]],
        ["three new stations", [{ ring: (root) => robin(root).factory.placedTiles().filter((t) => t.kind === "station"), separate: true, arrow: true, reveal: true }]],
      ]),
    }),
    narrate("others-build-robin-specs", {
      ...upTo(checks.state((root) => root.playerAid.phase >= 5)),
      ...beats("others-build-robin-specs", [
        ["", [{ ring: (root) => robin(root).factory.indicators.copy(), separate: true, arrow: true, reveal: true }]],
        ["further along the safety axis", [{ ring: (root) => root.market.bottomAxis, arrow: true, reveal: true }]],
      ]),
    }),
    narrate("others-build-sam", {
      ...upTo(checks.state((root) => root.playerAid.phase >= 5)),
      ...beats("others-build-sam", [
        ["", [{ ring: (root) => sam(root).factory.placedTiles().filter((t) => t.kind === "station"), separate: true, arrow: true, reveal: true }]],
        ["second research department", [{ ring: (root) => sam(root).factory.placedTiles().filter((t) => t.kind === "department" && t.departmentType === "research" && !t.committed), arrow: true, reveal: true }]],
      ]),
    }),
    narrate("others-build-research", {
      ...upTo(checks.state((root) => root.playerAid.phase >= 5)),
      ...beats("others-build-research", [
        ["", [{ ring: (root) => robin(root).factory.placedTiles().filter((t) => t.kind === "department" && t.departmentType === "research" && !t.committed), arrow: true, reveal: true }]],
        ["you still get one", [{ ring: myDepartments("research"), arrow: true, reveal: true }]],
      ]),
    }),
    // ------------------------------------------------------------------ year 1: brochures and sales
    narrate("brochures", {
      ...upTo(checks.state((root) => root.playerAid.phase >= 5)),
      ...beats("brochures", [
        ["", [{ ring: factory, zoom: false, reveal: true }]],
        ["planning department adds", [{ ring: myDepartments("planning"), arrow: true }, { ring: officeSpaces("gantt"), zoom: false }]],
        ["Reaching ten", [{ ring: officeSpace("gantt", GANTT_PUNCH_CLOCK), arrow: true }, { ring: timecard, arrow: true }]],
      ]),
    }),
    narrate("brochures-specs", {
      ...upTo(checks.state((root) => root.playerAid.phase >= 5)),
      ...beats("brochures-specs", [
        ["", [{ ring: myTiles("dealership"), arrow: true, reveal: true, dim: true }]],
        ["Its specs", [{ ring: myIndicators, separate: true, arrow: true, dim: true }, { ring: myTiles("dealership"), dim: true }]],
        ["Its window", [{ ring: myDepartments("marketing"), arrow: true, dim: true }, { ring: myTiles("dealership"), dim: true }]],
      ]),
    }),
    narrate("brochures-reach", {
      ...upTo(checks.state((root) => root.playerAid.phase >= 5)),
      ...beats("brochures-reach", [
        ["", [{ ring: reachOf(me_), arrow: true, reveal: true }, { ring: (root) => [root.market.bottomAxis, root.market.leftAxis], separate: true }]],
      ]),
    }),
    narrate(
      "sell",
      beatsAndWords(
        "sell",
        [
          ["", [{ ring: officeSpaces("focus"), separate: true, reveal: true }]],
          ["one dealer", [{ ring: myTiles("dealership"), arrow: true, reveal: true }, { ring: nichesWithBuyers, separate: true, reveal: true }]],
        ],
        [
          [onWord("sell", "3"), [{ ring: officeSpace("focus", 3), arrow: true }]],
          [onWord("sell", "2"), [{ ring: officeSpace("focus", 2), arrow: true }]],
          [onWord("sell", "1"), [{ ring: officeSpace("focus", 1), arrow: true }]],
        ],
      ),
    ),
    narrate(
      "sell-price",
      beatsAndWords(
        "sell-price",
        [
          ["", [{ ring: nichesWithBuyers, separate: true, arrow: true, reveal: true }]],
          ["price segments", [{ ring: market, zoom: false }]],
          ["price marker", [{ ring: priced, separate: true, arrow: true }]],
        ],
        (["cheapest", "second", "third", "expensive"] as const).map((w, i) => [onWord("sell-price", w), [{ ring: segment(i + 1), separate: true, dim: true, zoom: false }]]),
      ),
    ),
    narrate(
      "sell-price-why",
      beats("sell-price-why", [
        ["", [{ ring: priced, separate: true, arrow: true }, { ring: nichesWithBuyers, separate: true }]],
        ["higher up", [{ ring: segment(2), separate: true, dim: true, zoom: false }]],
        ["easy buyers", [{ ring: nichesWithBuyers, separate: true, arrow: true }]],
      ]),
    ),
    narrate(
      "sell-window-rule",
      beats("sell-window-rule", [
        ["", [{ ring: reachOf(me_), arrow: true, reveal: true }]],
        ["hang off the edge", [{ ring: market, zoom: false }]],
      ]),
    ),
    watch("others-sell-robin", "p1", robinSold, {
      ...beats("others-sell-robin", [
        ["", [{ ring: officeSpace("focus", 3), arrow: true, reveal: true }], upTo(windowDown(robin))],
        ["window goes down", [{ ring: windowsOf(robin), separate: true, arrow: true, reveal: true }], upTo(robinSold)],
      ]),
    }),
    watch("others-sell-sam", "p2", samSold, {
      ...beats("others-sell-sam", [
        ["", [{ ring: windowsOf(sam), separate: true, arrow: true, reveal: true }], upTo(samSold)],
        ["That leaves two", [{ ring: nichesWithBuyers, separate: true, arrow: true }]],
      ]),
    }),
    doIt("sell-window", [{ key: "sell.window", target: windowSpot(7, 1, 2, 2) }, { button: "Confirm" }], checks.promptMessage(/inside the new window/), {
      ...beats("sell-window", [
        ["", [{ ring: (root) => root.market.windows.filter((w) => w.staged), arrow: true }, { ring: windowArea(7, 1, 2, 2) }]],
        ["last two buyers", [{ ring: nichesWithBuyers, separate: true, arrow: true }, { ring: windowArea(7, 1, 2, 2) }]],
        ["Then confirm", [{ ring: (root) => root.market.windows.filter((w) => w.staged), arrow: true }, { ring: windowArea(7, 1, 2, 2) }]],
      ]),
    }),
    doIt("sell-niche", [{ key: "sell.niche" }], grew((_root, me) => me.wealth.value), {
      ...beats("sell-niche", [
        ["", [{ ring: (root) => root.market.niches.filter((n) => n.highlighted), separate: true, arrow: true }]],
        ["one car a year", [{ arrow: spark((me) => me.capacity) }, { ring: (root) => root.market.niches.filter((n) => n.highlighted), separate: true }]],
        ["Pick either", [{ ring: (root) => root.market.niches.filter((n) => n.highlighted), separate: true, arrow: true }]],
      ]),
    }),
    confirm("confirm-sell", upTo(soldMine)), // hold before phases 6–8 can run past the sale
    narrate("sold", {
      ...upTo(soldMine),
      ...beats("sold", [
        ["", [{ arrow: spark((me) => me.wealth) }]],
        ["capacity", [{ arrow: spark((me) => me.capacity) }, { ring: myTiles("mainline"), arrow: true, reveal: true }]],
        ["rounds", [{ arrow: { ui: "players" } }]],
        ["out of cars", [{ ring: (root) => [...robin(root).factory.placedTiles(), ...sam(root).factory.placedTiles()].filter((t) => t.kind === "mainline"), separate: true, arrow: true, zoom: false }]],
      ]),
    }),
    // ------------------------------------------------------------------ year 1: the end of the year
    narrate("finish", {
      ...upTo(soldMine),
      ...beats("finish", [
        ["", [{ ring: timecard, arrow: true, reveal: true }]],
        ["flips over", [{ ring: clockSpaces, zoom: false }, { ring: timecard, arrow: true }]],
        ["seventh year", [{ ring: (_root, me) => me.factory.floors.copy(), zoom: false, reveal: true }]],
      ]),
    }),
    narrate("expectations", {
      ...upTo(soldMine),
      ...beats("expectations", [
        ["", [{ ring: activeTracks, separate: true, reveal: true }]],
        ["black arrow", [{ ring: (root) => root.market.obsolescenceMarker, arrow: true }, { ring: (root) => root.market.bottomTrack! }]],
        ["under the off-board tracks", [{ ring: (root) => root.research.offBoard.get(root.research.offBoard.length - 1)!, arrow: true }], upTo(oldTrackOut)],
      ]),
    }),
    narrate("expectations-min", {
      ...upTo(oldTrackOut),
      ...beats("expectations-min", [
        ["", [{ ring: (root) => root.research.offBoard.get(root.research.offBoard.length - 1)!, arrow: true }]],
        ["minimum specification", [{ ring: (root) => root.market.minSpecs.copy(), arrow: true }]],
        ["built brakes", [{ ring: (root) => [...robin(root).factory.placedTiles(), ...sam(root).factory.placedTiles()].filter((t) => t.stationId === "brake"), separate: true, arrow: true, reveal: true, zoom: false }]],
        ["Your dealer", [{ ring: myTiles("dealership"), arrow: true, reveal: true }]],
      ]),
    }),
    narrate("expectations-new", {
      ...upTo(oldTrackOut),
      ...beats("expectations-new", [
        ["", [{ ring: (root) => root.market.bottomAxis, arrow: true, reveal: true }]],
        ["innovation marker", [{ ring: (root) => root.allTracks().map((t) => t.innovation.get(0)!), separate: true }]],
        ["Sam's design step", [{ ring: (root) => root.track("design").markerOf(sam(root).playerId)!, arrow: true }, { ring: (root) => root.track("design") }], upTo(newTrackIn)],
      ]),
    }),
    narrate("expectations-arrow", {
      ...upTo(newTrackIn),
      focus: [{ ring: (root) => root.market.obsolescenceMarker, arrow: true }, { ring: (root) => root.track("reliability") }],
    }),
    // ------------------------------------------------------------------ year 1: grow demand
    narrate(
      "grow",
      beatsAndWords(
        "grow",
        [
          ["", [{ ring: hand, arrow: true, reveal: true }]],
          ["beside a quadrant", [{ ring: hand, arrow: true }, { ring: (root) => root.market.quadrantTargets.copy(), separate: true, reveal: true }]],
          ["four quadrants", [{ ring: market, reveal: true, zoom: false }]],
        ],
        (["one", "two", "three", "four"] as const).map((w, i) => [onWord("grow", w, w === "four" ? 1 : 0), [{ ring: quadrant(i + 1), arrow: true, zoom: false }, { ring: quadrantSpot(i + 1) }]]),
      ),
    ),
    narrate("grow-neutral", {
      ...upTo(neutralDealt),
      ...beats("grow-neutral", [
        ["", [{ ring: neutralCards, separate: true, arrow: true, reveal: true }]],
      ]),
    }),
    // Your hand, full screen, one card ringed at a time (a carousel chases several rings)
    narrate(
      "grow-cards",
      beats("grow-cards", [
        ["", [], { gallery: { of: hand, mode: "fullscreen" } }],
        ["Every card is a map", [{ ring: inHand("P1"), arrow: true, zoom: false }]],
        ["Each car on it", [{ ring: onCard("P1", CARD_SPARKS), arrow: true, zoom: false }]],
      ]),
    ),
    narrate(
      "grow-sparks",
      beats("grow-sparks", [
        ["", [{ ring: nichesWithBuyers, separate: true, reveal: true }], { gallery: "close" }],
        ["dealer can reach", [{ ring: reachOf(me_), arrow: true, reveal: true }]],
      ]),
    ),
    narrate(
      "grow-clocks",
      beats("grow-clocks", [
        ["", [{ ring: onCard("P1", CARD_CLOCKS), arrow: true, zoom: false }], { gallery: { of: hand, mode: "fullscreen" } }],
        ["Each clock", [{ ring: timecard, arrow: true, reveal: true }], { gallery: "close" }],
      ]),
    ),
    narrate(
      "grow-year",
      beats("grow-year", [
        ["", [{ ring: onCard("P1", CARD_YEAR), arrow: true, zoom: false }], { gallery: { of: hand, mode: "fullscreen" } }],
        ["only your year one cards", [{ ring: onCard("P3", CARD_YEAR), arrow: true, zoom: false }]],
        ["Bigger factories", [{ ring: (_root, me) => me.factory.floors.copy(), separate: true, reveal: true, zoom: false }], { gallery: "close" }],
      ]),
    ),
    doIt("play-card", [{ key: "grow.card", chit: inHand("P3") }], checks.promptMessage(/choose a quadrant/), {
      focus: [{ ring: inHand("P3"), arrow: true }],
    }),
    doIt("play-quadrant", [{ key: "grow.quadrant", chit: quadrantSpot(1) }], checks.state((root) => playersCards(root).length > 0), {
      focus: [{ ring: quadrantSpot(1), arrow: true }, { ring: quadrant(1) }, { ring: reachOf(me_) }],
    }),
    confirm("confirm-card"),
    othersStep("others-cards", cardsDown, { ...upTo(cardsDown), focus: [{ ring: playersCards, separate: true, arrow: true }] }),
    narrate("reveal-sparks", {
      timeline: "hold",
      ...beats("reveal-sparks", [
        ["", [{ ring: (root) => root.market.played.copy(), separate: true, arrow: true }]],
        ["Each spark flies", [{ ring: sparksOnBoard, separate: true, arrow: true }, { ring: timecard, arrow: true }], upTo(sparksDown)],
      ]),
    }),
    narrate("reveal-buyers", {
      ...upTo(sparksDown),
      ...beats("reveal-buyers", [
        ["", [{ ring: sparksOnBoard, separate: true, arrow: true }]],
        ["There they are", [{ ring: nichesWithBuyers, separate: true, arrow: true }], upTo(sparkBuyers)],
      ]),
    }),
    narrate("reveal-neutral", {
      ...upTo(sparkBuyers),
      ...beats("reveal-neutral", [["", [{ ring: neutralCards, separate: true, arrow: true }, { ring: nichesWithBuyers, separate: true }], upTo(neutralBuyers)]]),
    }),
    narrate("reveal-prices", {
      ...upTo(nextYear),
      ...beats("reveal-prices", [
        ["", [{ ring: priced, separate: true, arrow: true }, { ring: nichesWithBuyers, separate: true }]],
      ]),
    }),
    // ------------------------------------------------------------------ year 2
    narrate("year-two", {
      ...upTo(nextYear), // whatever the reveal's cues reached, the board lands on the new year here
      ...beats("year-two", [
        ["", []],
        ["Look at your dealer", [{ ring: myTiles("dealership"), arrow: true, reveal: true }, { ring: (root) => root.market.minSpecs.copy(), arrow: true }]],
        ["build a brake", [{ ring: (root) => root.track("safety").slot(1), arrow: true, reveal: true }]],
      ]),
    }),
    narrate("year-two-why", {
      ...upTo(nextYear),
      ...beats("year-two-why", [
        ["", [{ ring: (root) => root.track("safety").slot(1), arrow: true, reveal: true }, { ring: (root, me) => root.track("safety").markerOf(me.playerId)!, arrow: true }]],
        ["chassis and the paint instead", [{ ring: myTiles("station"), arrow: true, reveal: true }]],
      ]),
    }),
    doIt("y2-research", [{ key: "research.space", chit: mySlot("reliability") }], checks.state((root, me) => root.track("reliability").positionOf(me.playerId) === 3), {
      ...beats("y2-research", [
        ["", [{ ring: (root) => root.track("reliability"), arrow: true, reveal: true }]],
        ["one more step", [{ ring: (root) => root.track("reliability").slot(3), arrow: true, dim: true }]],
        ["Look at the market", [{ ring: segment(2), separate: true, dim: true, zoom: false, reveal: true }, { ring: priced, separate: true }]],
        ["Two buyers", [{ ring: (root) => root.market.niche(4, 2), arrow: true, reveal: true }, { ring: (root) => [root.market.bottomAxis, root.market.leftAxis], separate: true }]],
        ["Nobody else", [{ ring: (root) => [...robin(root).factory.placedTiles(), ...sam(root).factory.placedTiles()].filter((t) => t.kind === "dealership"), separate: true, arrow: true, reveal: true, zoom: false }]],
        ["Tap the chassis", [{ ring: mySlot("reliability"), arrow: true, dim: true, reveal: true }]],
      ]),
    }),
    confirm("y2-confirm-research"),
    narrate("y2-research-done", {
      ...beats("y2-research-done", [
        ["", [{ ring: (root, me) => root.track("reliability").markerOf(me.playerId)!, arrow: true, reveal: true }]],
        ["punch clocks", [{ ring: (root) => [root.track("reliability").slot(4), root.track("reliability").slot(6)], separate: true, arrow: true }]],
      ]),
    }),
    watch("y2-others-research-sam", "p2", samResearched2, {
      ...beats("y2-others-research-sam", [
        ["", [{ ring: officeSpaces("historical"), separate: true, reveal: true }]],
        ["two research departments", [{ ring: (root) => sam(root).factory.placedTiles().filter((t) => t.kind === "department" && t.departmentType === "research"), separate: true, arrow: true, reveal: true, zoom: false }]],
        ["design again", [{ ring: (root) => root.track("design").markerOf(sam(root).playerId)!, arrow: true, reveal: true }], upTo(samDesign2)],
        ["assembly capacity", [{ arrow: sparkOf(sam, (p) => p.capacity) }], upTo(samResearched2)],
      ]),
    }),
    watch("y2-others-research-robin", "p1", robinResearched2, {
      ...beats("y2-others-research-robin", [
        ["", [{ ring: (root) => robin(root).factory.placedTiles().filter((t) => t.kind === "department" && t.departmentType === "research"), separate: true, arrow: true, reveal: true, zoom: false }]],
        ["off the board", [{ ring: (root) => root.track("range").markerOf(robin(root).playerId)!, arrow: true, reveal: true }], upTo(robinRange1)],
        ["capacity to two", [{ arrow: sparkOf(robin, (p) => p.capacity) }], upTo(robinResearched2)],
        ["nobody can move", [{ ring: markersOf(robin), separate: true }]],
      ]),
    }),
    // ------------------------------------------------------------------ year 2: focus
    narrate(
      "y2-focus",
      beats("y2-focus", [
        ["", [{ ring: officeSpaces("gantt"), reveal: true, zoom: false }]],
        ["Sam kept", [{ ring: officeSpaces("gantt"), zoom: false }, { arrow: sparkOf(sam, (p) => p.gantt) }]],
        ["one each", [{ arrow: spark((me) => me.gantt) }, { arrow: sparkOf(robin, (p) => p.gantt) }]],
        ["Sam picks first", [{ ring: officeSpaces("focus"), separate: true }, { arrow: sparkOf(sam, (p) => p.gantt) }]],
      ]),
    ),
    watch("y2-others-focus-sam", "p2", samFocus2, {
      ...beats("y2-others-focus-sam", [
        ["", [{ ring: officeSpace("focus", 1), arrow: true, reveal: true }]],
        ["your chassis", [{ ring: myTiles("station"), arrow: true, reveal: true }, { ring: (root) => robin(root).factory.placedTiles().filter((t) => t.stationId === "windowPane"), arrow: true, reveal: true }]],
        ["copy everyone", [{ ring: officeSpace("focus", 1), arrow: true, reveal: true }]],
      ]),
    }),
    doIt("y2-focus-do", [{ key: "focus.slot", chit: officeSpace("focus", 3) }], checks.state((root, me) => root.office.focusSlot(me.playerId) === 3), {
      ...beats("y2-focus-do", [
        ["", [{ arrow: spark((me) => me.gantt) }, { arrow: sparkOf(robin, (p) => p.gantt) }]],
        ["better engineering slot", [{ ring: officeSpaces("historical"), separate: true }]],
        ["Take slot 3", [{ ring: officeSpace("focus", 3), arrow: true, dim: true }]],
      ]),
    }),
    confirm("y2-confirm-focus"),
    watch("y2-others-focus-robin", "p1", checks.promptMessage(/build their factory/), { focus: [{ ring: officeSpace("focus", 2), arrow: true }] }),
    // ------------------------------------------------------------------ year 2: build
    narrate(
      "y2-build",
      beats("y2-build", [
        ["", [{ ring: factory, reveal: true, zoom: false }]],
        ["expansion you placed", [{ ring: (_root, me) => me.factory.floors.get(1)!, arrow: true }]],
        ["fixed in place", [{ ring: myTiles("station"), separate: true }, { ring: myTiles("mainline") }, { ring: myTiles("dealership") }]],
        ["Two stations", [{ ring: (root) => [root.track("safety").slot(1), root.track("reliability").slot(3)], separate: true, arrow: true, reveal: true }]],
      ]),
    ),
    doIt("y2-add-brake", [{ key: "build.add", chit: entry("station:brake") }], checks.state((root, me) => !!tile("station:brake")(root, me)), {
      ...beats("y2-add-brake", [
        ["", [{ ring: mainlineSide("B"), arrow: true, reveal: true, dim: true }]],
        ["Add the brake", [{ arrow: { ui: "button:Add" } }, { ring: entry("station:brake"), arrow: true }]],
      ]),
    }),
    doIt("y2-place-brake", [{ key: "build.move", chit: tile("station:brake"), target: dropAt(7, 5, 2, 2) }], checks.state(at_("station:brake", 7, 5)), {
      focus: [{ ring: tile("station:brake"), arrow: true }, { ring: floorSpot(7, 5, 2, 2) }],
    }),
    doIt("y2-brake-spec", [{ button: "Add spec" }], checks.state((_root, me) => me.factory.indicators.some((i) => i.dimension === "safety")), {
      ...beats("y2-brake-spec", [
        ["", [{ ring: tile("station:brake"), arrow: true, dim: true }]],
        ["safety marker", [{ ring: (root, me) => root.track("safety").markerOf(me.playerId)!, arrow: true, reveal: true }]],
        ["Tap Add spec", [{ ring: tile("station:brake"), reveal: true }, { arrow: { ui: "button:Add spec" } }]],
      ]),
    }),
    doIt("y2-place-brake-spec", [{ key: "build.move", chit: indicatorOf("safety"), target: dropAt(9, 5, 1, 1) }], checks.state((_root, me) => me.factory.indicators.some((i) => i.dimension === "safety" && i.x === 9 && i.y === 5)), {
      ...beats("y2-place-brake-spec", [
        ["", [{ ring: indicatorOf("safety"), arrow: true }, { ring: floorSpot(9, 5, 1, 1) }]],
        ["B indicator", [{ ring: indicatorOf("safety"), arrow: true }, { ring: floorSpot(9, 5, 1, 1) }, { ring: mainlineSide("B") }]],
      ]),
    }),
    doIt("y2-add-carbody", [{ key: "build.add", chit: entry("station:carBody") }], checks.state((root, me) => !!tile("station:carBody")(root, me)), {
      ...beats("y2-add-carbody", [
        ["", [{ ring: (root) => root.track("reliability").slot(3), arrow: true, reveal: true }]],
        ["doesn't need to touch", [{ ring: tile("station:chassis"), arrow: true, reveal: true, dim: true }, { ring: mainlineSide("A"), dim: true }]],
        ["Add the car body", [{ arrow: { ui: "button:Add" } }, { ring: entry("station:carBody"), arrow: true }]],
      ]),
    }),
    doIt("y2-place-carbody", [{ key: "build.move", chit: tile("station:carBody"), target: dropAt(7, 7, 3, 3) }], checks.state(at_("station:carBody", 7, 7)), {
      focus: [{ ring: tile("station:carBody"), arrow: true }, { ring: floorSpot(7, 7, 3, 3) }],
    }),
    doIt("y2-carbody-spec", [{ button: "Add spec" }], checks.state((_root, me) => me.factory.indicators.filter((i) => i.dimension === "reliability").length >= 2), {
      ...beats("y2-carbody-spec", [
        ["", [{ ring: tile("station:carBody"), arrow: true, dim: true }, { ring: (root) => root.track("reliability").slot(3), arrow: true, reveal: true }]],
        ["Tap Add spec", [{ ring: tile("station:carBody"), reveal: true }, { arrow: { ui: "button:Add spec" } }]],
      ]),
    }),
    doIt("y2-place-carbody-spec", [{ key: "build.move", chit: indicatorOf("reliability", 3), target: dropAt(10, 7, 1, 1) }], checks.state((_root, me) => me.factory.indicators.some((i) => i.dimension === "reliability" && i.x === 10 && i.y === 7)), {
      focus: [{ ring: indicatorOf("reliability", 3), arrow: true }, { ring: floorSpot(10, 7, 1, 1) }],
    }),
    narrate(
      "y2-spec-done",
      beats("y2-spec-done", [
        ["", [{ ring: myIndicators, separate: true, arrow: true, dim: true }, { ring: myTiles("mainline"), dim: true }]],
        ["Every car", [{ ring: myTiles("mainline"), arrow: true, dim: true }]],
        ["Your dealer", [{ ring: myTiles("dealership"), arrow: true, dim: true }, { ring: (root) => root.market.minSpecs.copy(), arrow: true }]],
      ]),
    ),
    // ---- year 2: a second mainline on last year's expansion, sharing your dealer
    narrate(
      "y2-second-why",
      beats("y2-second-why", [
        ["", [{ ring: (root) => root.market.niche(4, 2), arrow: true, reveal: true }]],
        ["your mainline builds one", [{ ring: firstMainline, arrow: true, reveal: true }, { arrow: spark((me) => me.capacity) }]],
        ["A second mainline", [{ ring: myDealer, arrow: true, reveal: true }, { ring: (_root, me) => me.factory.floors.find((f) => f.kind === "expansion" && f.committed)! }]],
      ]),
    ),
    doIt("y2-add-mainline", [{ key: "build.add", chit: entry("mainline:car") }], checks.state((root, me) => !!secondMainline(root, me)), {
      focus: [{ arrow: { ui: "button:Add" } }, { ring: entry("mainline:car"), arrow: true }],
    }),
    doIt("y2-rotate-mainline", [{ button: "Rotate" }], checks.state((root, me) => secondMainline(root, me)?.rotation === 2), {
      focus: [{ ring: secondMainline }, { arrow: { ui: "button:Rotate" } }],
    }),
    doIt("y2-place-mainline", [{ key: "build.move", chit: secondMainline, target: dropAt(-4, 3, 4, 3) }], checks.state(at_("mainline:car", -4, 3)), {
      focus: [{ ring: secondMainline, arrow: true }, { ring: expansionSpot(-4, 3, 4, 3) }],
    }),
    narrate(
      "y2-shared-dealer",
      beats("y2-shared-dealer", [
        ["", [{ ring: myDealer, arrow: true, reveal: true }, { ring: (_root, me) => me.factory.placedTiles().filter((t) => t.kind === "mainline"), separate: true }]],
        ["the lower of its two mainlines", [{ ring: secondMainline, arrow: true }, { ring: firstMainline }]],
        ["drags the dealer down", [{ ring: dealerCubes, separate: true, arrow: true }]],
      ]),
    ),
    narrate(
      "y2-shared-zones",
      beats("y2-shared-zones", [
        ["", [{ ring: dealerCubes, separate: true, arrow: true, reveal: true }]],
        ["paint sits between them", [{ ring: myPaint, arrow: true }, { ring: secondSide("C") }, { ring: mainlineSide("C") }]],
        ["from slot 3", [{ ring: officeSpace("focus", 3), arrow: true, reveal: true, zoom: false }]],
      ]),
    ),
    doIt("y2-add-chassis", [{ key: "build.add", chit: entry("station:chassis") }], checks.state((root, me) => !!newest("station:chassis")(root, me)), {
      ...beats("y2-add-chassis", [
        ["", [{ ring: secondSide("A"), arrow: true, reveal: true, dim: true }]],
        ["different zone", [{ ring: tile("station:chassis") }, { ring: (_root, me) => me.factory.placedTiles().find((t) => t.stationId === "chassis" && t.committed)!, arrow: true }]],
        ["Add the chassis", [{ arrow: { ui: "button:Add" } }, { ring: entry("station:chassis"), arrow: true }]],
      ]),
    }),
    doIt("y2-rotate-chassis", [{ button: "Rotate" }], checks.state((root, me) => newest("station:chassis")(root, me)?.rotation === 1), {
      focus: [{ ring: newest("station:chassis") }, { arrow: { ui: "button:Rotate" } }],
    }),
    doIt("y2-place-chassis", [{ key: "build.move", chit: newest("station:chassis"), target: dropAt(-4, 0, 4, 3) }], checks.state(at_("station:chassis", -4, 0)), {
      focus: [{ ring: newest("station:chassis"), arrow: true }, { ring: expansionSpot(-4, 0, 4, 3) }],
    }),
    doIt("y2-chassis-spec", [{ button: "Add spec" }], checks.state((_root, me) => me.factory.indicators.filter((i) => i.dimension === "reliability" && !i.committed).length >= 2), {
      focus: [{ ring: newest("station:chassis"), dim: true }, { arrow: { ui: "button:Add spec" } }],
    }),
    doIt("y2-place-chassis-spec", [{ key: "build.move", chit: newestIndicator("reliability"), target: dropAt(-5, 1, 1, 1) }], checks.state(indicatorAt("reliability", -5, 1)), {
      focus: [{ ring: newestIndicator("reliability"), arrow: true }, { ring: expansionSpot(-5, 1, 1, 1) }],
    }),
    doIt("y2-add-brake2", [{ key: "build.add", chit: entry("station:brake") }], checks.state((_root, me) => me.factory.placedTiles().filter((t) => t.stationId === "brake").length >= 2), {
      ...beats("y2-add-brake2", [
        ["", [{ ring: secondSide("B"), arrow: true, reveal: true, dim: true }]],
        ["Add the brake", [{ arrow: { ui: "button:Add" } }, { ring: entry("station:brake"), arrow: true }]],
      ]),
    }),
    doIt("y2-place-brake2", [{ key: "build.move", chit: newest("station:brake"), target: dropAt(-6, 3, 2, 2) }], checks.state(at_("station:brake", -6, 3)), {
      focus: [{ ring: newest("station:brake"), arrow: true }, { ring: expansionSpot(-6, 3, 2, 2) }],
    }),
    doIt("y2-brake2-spec", [{ button: "Add spec" }], checks.state((_root, me) => me.factory.indicators.filter((i) => i.dimension === "safety" && !i.committed).length >= 2), {
      focus: [{ ring: newest("station:brake"), dim: true }, { arrow: { ui: "button:Add spec" } }],
    }),
    doIt("y2-place-brake2-spec", [{ key: "build.move", chit: newestIndicator("safety"), target: dropAt(-5, 5, 1, 1) }], checks.state(indicatorAt("safety", -5, 5)), {
      focus: [{ ring: newestIndicator("safety"), arrow: true }, { ring: expansionSpot(-5, 5, 1, 1) }],
    }),
    narrate(
      "y2-battery-why",
      beats("y2-battery-why", [
        ["", [{ ring: myPaint, arrow: true, reveal: true, dim: true }, { ring: secondSide("C"), dim: true }, { ring: mainlineSide("C"), dim: true }]],
        ["further back", [{ ring: floorSpot(0, 0, 2, 2), arrow: true, dim: true }]],
        ["paint's indicator", [{ ring: paintSpec, arrow: true, dim: true }, { ring: floorSpot(0, 0, 2, 2), dim: true }]],
      ]),
    ),
    doIt("y2-add-battery", [{ key: "build.add", chit: entry("station:battery") }], checks.state((root, me) => !!newest("station:battery")(root, me)), {
      focus: [{ arrow: { ui: "button:Add" } }, { ring: entry("station:battery"), arrow: true }],
    }),
    doIt("y2-place-battery", [{ key: "build.move", chit: newest("station:battery"), target: dropAt(0, 0, 2, 2) }], checks.state(at_("station:battery", 0, 0)), {
      focus: [{ ring: newest("station:battery"), arrow: true }, { ring: floorSpot(0, 0, 2, 2) }],
    }),
    doIt("y2-battery-spec", [{ button: "Add spec" }], checks.state((_root, me) => me.factory.indicators.filter((i) => i.dimension === "reliability" && !i.committed).length >= 3), {
      focus: [{ ring: newest("station:battery"), dim: true }, { arrow: { ui: "button:Add spec" } }],
    }),
    doIt("y2-place-battery-spec", [{ key: "build.move", chit: newestIndicator("reliability"), target: dropAt(0, 2, 1, 1) }], checks.state(indicatorAt("reliability", 0, 2)), {
      focus: [{ ring: newestIndicator("reliability"), arrow: true }, { ring: floorSpot(0, 2, 1, 1) }],
    }),
    narrate(
      "y2-second-done",
      beats("y2-second-done", [
        ["", [{ ring: (_root, me) => me.factory.indicators.filter((i) => !i.committed && (i.x < 0 || i.y <= 2)), separate: true, arrow: true, reveal: true }, { ring: paintSpec }, { ring: secondMainline }]],
        ["first line too", [{ ring: firstMainline, arrow: true }]],
        ["cubes are back", [{ ring: dealerCubes, separate: true, arrow: true }]],
      ]),
    ),
    doIt("y2-done-build", [{ key: "build.done" }, { key: "build.expansion" }], promptGone(/build their factory/, hint("y2-done-build") ?? ""), {
      ...beats("y2-done-build", [
        ["", [{ ring: pendingExpansion, arrow: true }]],
        ["Tap Done", [{ ring: factory, zoom: false }, { arrow: { ui: "button:Done" } }]],
      ]),
    }),
    confirm("y2-confirm-build", upTo(brochuresOf(2))),
    othersStep("y2-others-build", checks.state((root) => root.year === 2 && root.playerAid.phase >= 4), {
      ...beats("y2-others-build", [
        ["", [{ ring: newTilesOf(sam), arrow: true, reveal: true }]],
        ["Sam builds first", [{ ring: officeSpaces("focus"), separate: true, reveal: true }, { ring: supply, zoom: false }]],
      ]),
    }),
    narrate("y2-others-build-look", {
      ...upTo(brochuresOf(2)),
      ...beats("y2-others-build-look", [
        ["", [{ ring: newTilesOf(robin), reveal: true }]],
        ["a second mainline", [{ ring: (root) => newTilesOf(robin)(root).filter((t) => t.kind === "mainline"), arrow: true, reveal: true }, { ring: (root) => newTilesOf(robin)(root).filter((t) => t.kind === "dealership") }]],
        ["Two mainlines", [{ ring: (root) => robin(root).factory.placedTiles().filter((t) => t.kind === "mainline"), separate: true, arrow: true, reveal: true }]],
      ]),
    }),
    narrate("y2-others-build-sam", {
      ...upTo(brochuresOf(2)),
      ...beats("y2-others-build-sam", [
        ["", [{ ring: newTilesOf(sam), arrow: true, reveal: true }]],
        ["a windscreen and a paint shop", [{ ring: (root) => sam(root).factory.placedTiles().filter((t) => t.stationId === "paint" || t.stationId === "windscreen"), separate: true, arrow: true, reveal: true }]],
      ]),
    }),
    narrate("y2-others-build-yours", {
      ...upTo(brochuresOf(2)),
      focus: [{ ring: (root) => root.market.niche(4, 2), arrow: true, reveal: true }],
    }),
    // ------------------------------------------------------------------ year 2: brochures and sales
    narrate("y2-brochures", {
      ...upTo(brochuresOf(2)),
      ...beats("y2-brochures", [
        ["", [{ ring: myDepartments("planning"), arrow: true, reveal: true }, { ring: officeSpaces("gantt"), zoom: false }]],
        ["Your dealer", [{ ring: myTiles("dealership"), arrow: true, reveal: true, dim: true }, { ring: myIndicators, separate: true, dim: true }]],
        ["Robin's first dealer", [{ ring: (root) => robin(root).factory.placedTiles().filter((t) => t.kind === "dealership" && t.dealerIndex === 0), arrow: true, reveal: true }, { ring: (root) => robin(root).factory.placedTiles().filter((t) => t.kind === "mainline"), separate: true }]],
        ["you can reach", [{ ring: reachOf(me_), arrow: true, reveal: true }]],
      ]),
    }),
    doIt("y2-sell-window", [{ key: "sell.window", target: windowSpot(4, 1, 2, 2) }, { button: "Confirm" }], grew((_root, me) => me.wealth.value), {
      ...beats("y2-sell-window", [
        ["", [{ ring: officeSpace("focus", 3), arrow: true, reveal: true }]],
        ["Drag the window", [{ ring: (root) => root.market.windows.filter((w) => w.staged), arrow: true, reveal: true }, { ring: windowArea(4, 1, 2, 2) }]],
        ["two buyers", [{ ring: (root) => root.market.niche(4, 2), arrow: true }, { ring: windowArea(4, 1, 2, 2) }]],
        ["you confirm", [{ ring: (root) => root.market.windows.filter((w) => w.staged), arrow: true }, { ring: windowArea(4, 1, 2, 2) }]],
      ]),
    }),
    confirm("y2-confirm-sell", upTo(soldMine2)),
    narrate("y2-sold", {
      ...upTo(soldMine2),
      ...beats("y2-sold", [
        ["", [{ arrow: spark((me) => me.wealth) }, { ring: priced, separate: true }]],
        ["what a second mainline is for", [{ ring: myTiles("mainline"), separate: true, arrow: true, reveal: true }, { ring: myDealer }]],
        ["capacity track", [{ arrow: spark((me) => me.capacity) }, { arrow: { ui: "button:Capacity" } }]],
      ]),
    }),
    watch("y2-others-sell-robin", "p1", robinSold2, {
      ...beats("y2-others-sell-robin", [
        ["", [{ ring: windowsOf(robin), separate: true, arrow: true, reveal: true }, { ring: (root) => root.market.niche(8, 2) }], upTo(robinSold2)],
        ["corner's price fell", [{ ring: priced, separate: true, arrow: true }]],
      ]),
    }),
    watch("y2-others-sell-sam", "p2", samSold2, {
      ...beats("y2-others-sell-sam", [["", [{ ring: windowsOf(sam), separate: true, arrow: true, reveal: true }, { ring: (root) => root.market.bottomAxis }], upTo(samSold2)]]),
    }),
    // The second round of selling, if anyone has a car left: both bots may move here
    othersStep("y2-sell-rounds", sellingOver2, {
      ...upTo(sellingOver2),
      ...beats("y2-sell-rounds", [
        ["", [{ arrow: { ui: "players" } }, { ring: nichesWithBuyers, separate: true, reveal: true }]],
        ["Robin's dealer sells again", [{ ring: windowsOf(robin), separate: true, arrow: true }, { ring: (root) => root.market.niche(8, 1) }], upTo(sellingOver2)],
        ["Sam's second dealer", [{ ring: (root) => sam(root).factory.placedTiles().filter((t) => t.kind === "dealership" && t.dealerIndex === 1), arrow: true, reveal: true, zoom: false }]],
        ["two dealers of your own", [{ ring: myTiles("dealership"), arrow: true, reveal: true }]],
      ]),
    }),
    // ------------------------------------------------------------------ year 2: the end of the year
    narrate("y2-finish", { ...upTo(sellingOver2), focus: [{ ring: timecard, arrow: true, reveal: true }, { ring: clockSpaces, zoom: false }] }),
    narrate("y2-expectations", {
      ...upTo(sellingOver2),
      ...beats("y2-expectations", [
        ["", [{ ring: (root) => root.market.obsolescenceMarker, arrow: true, reveal: true }, { ring: (root) => root.track("reliability") }]],
        ["minimum becomes one", [{ ring: (root) => root.market.minSpecs.copy(), separate: true, arrow: true }], upTo(oldTrackOut2)],
        ["You have two", [{ ring: myTiles("dealership"), arrow: true, reveal: true }, { ring: (root) => [...robin(root).factory.placedTiles(), ...sam(root).factory.placedTiles()].filter((t) => t.kind === "dealership"), separate: true, arrow: true, zoom: false }]],
      ]),
    }),
    narrate("y2-expectations-tie", {
      ...upTo(oldTrackOut2),
      ...beats("y2-expectations-tie", [
        ["", [{ ring: (root) => [root.track("range"), root.track("safety")], separate: true, arrow: true, reveal: true }, { ring: (root) => [root.track("range").innovation.get(0)!, root.track("safety").innovation.get(0)!], separate: true }]],
        ["off-board stack", [{ ring: offBoard, separate: true, reveal: true }, { ring: (root) => root.track("range"), arrow: true }]],
      ]),
    }),
    narrate("y2-expectations-new", {
      ...upTo(newTrackIn2), // the hold from the step's start: a mid-step hold landed on different moments per timing
      ...beats("y2-expectations-new", [
        ["", [{ ring: (root) => root.track("range"), arrow: true, reveal: true }, { ring: (root) => root.track("range").markerOf(robin(root).playerId)!, arrow: true }]],
        ["arrow turns", [{ ring: (root) => root.market.obsolescenceMarker, arrow: true }, { ring: (root) => root.track("design") }]],
        ["Only Sam and you", [{ ring: (root) => root.track("design").markers(), separate: true, arrow: true }, { ring: paintSpec }]],
      ]),
    }),
    // ------------------------------------------------------------------ year 2: grow demand
    othersStep("y2-others-cards", cardsPlayed2(2), {
      ...upTo(cardsPlayed2(2)),
      ...beats("y2-others-cards", [
        ["", [{ ring: officeSpaces("focus"), separate: true, reveal: true }]],
        ["face down", [{ ring: playersCards, separate: true, arrow: true, reveal: true }]],
      ]),
    }),
    doIt("y2-grow", [{ key: "grow.card", chit: inHand("P2") }], checks.promptMessage(/choose a quadrant/), {
      ...beats("y2-grow", [
        ["", [{ ring: hand, arrow: true, reveal: true }]],
        ["two floor expansions", [{ ring: (_root, me) => me.factory.floors.copy(), separate: true, reveal: true, zoom: false }]],
        ["Play this one", [{ ring: inHand("P2"), arrow: true, reveal: true }]],
        ["Two sparks is", [{ ring: inHand("P2"), arrow: true }, { ring: reachOf(me_), reveal: true }]],
      ]),
    }),
    doIt("y2-play-quadrant", [{ key: "grow.quadrant", chit: quadrantSpot(1) }], cardsDown2, {
      focus: [{ ring: quadrantSpot(1), arrow: true }, { ring: quadrant(1) }, { ring: reachOf(me_) }],
    }),
    confirm("y2-confirm-card", upTo(cardsDown2)),
    // One step per moment, each holding from its start (a mid-step hold lands on different moments per timing)
    narrate("y2-reveal", {
      ...upTo(sparksDown2),
      ...beats("y2-reveal", [
        ["", [{ ring: sparksOnBoard, separate: true, arrow: true }]],
        ["clock punches", [{ ring: timecard, arrow: true }]],
      ]),
    }),
    narrate("y2-reveal-buyers", { ...upTo(sparkBuyers2), focus: [{ ring: nichesWithBuyers, separate: true, arrow: true }] }),
    narrate("y2-reveal-neutral", { ...upTo(neutralBuyers2), focus: [{ ring: neutralCards, separate: true, arrow: true }, { ring: nichesWithBuyers, separate: true }] }),
    narrate("y2-reveal-prices", { ...upTo(nextYear2), focus: [{ ring: priced, separate: true, arrow: true }, { ring: nichesWithBuyers, separate: true }] }),
    // ------------------------------------------------------------------ the rest of the game
    narrate("year-three", {
      ...upTo(nextYear2),
      ...beats("year-three", [
        ["", [{ arrow: spark((me) => me.wealth) }]],
        ["Research what", [{ ring: activeTracks, separate: true, reveal: true }, { ring: offBoard, separate: true }]],
        ["second mainline", [{ ring: myTiles("mainline"), arrow: true, reveal: true }, { arrow: spark((me) => me.capacity) }]],
        ["Take slot 1", [{ ring: officeSpaces("focus"), separate: true, reveal: true }]],
        ["Gantt chart", [{ ring: officeSpaces("gantt"), zoom: false }]],
      ]),
    }),
    narrate("game-end", {
      ...beats("game-end", [
        ["", [{ ring: timecard, arrow: true, reveal: true }]],
        ["richest", [{ arrow: { ui: "players" } }]],
        ["sales focus", [{ ring: officeSpaces("historical"), reveal: true }]],
      ]),
    }),
    narrate("full-game", { focus: [{ ring: (root) => root.supply.stacks.filter((st) => st.key.startsWith("mainline:")), separate: true, reveal: true }] }),
    narrate("finish-tutorial", { box: { anchor: "center" }, timeline: "play", focus: [], end: "continue" }),
  ];
  for (const s of steps) {
    if (pins.steps[s.id]) s.rng = pins.steps[s.id];
    const ai = pins.ai[s.id];
    if (ai) s.ai = Object.fromEntries(Object.entries(ai).map(([id, moves]) => [id, forced(moves)]));
  }
  return defineTutorial<Player, Root>({
    id: "tutorial",
    locale: t.locale,
    title: t.title,
    intro: t.intro,
    match: {
      players: [{ name: t.you }, { name: "Robin", ai: {} }, { name: "Sam", ai: {} }],
      options: { variant: "intro" },
      // The seating shuffle (zeros keep the order), then the deal
      rng: pins.setup.length ? pins.setup : [[0, 0, 0, 0, 0, 0]],
      ai: { seed: 7, thinkMs: 700 },
    },
    steps,
  });
}

export function buildTutorial(locale: string, pins: Pins): TutorialSpec<Player, Root> {
  void locale; // one locale so far
  return intro(en, pins);
}

export const tutorials: TutorialSpec<Player, Root>[] = [buildTutorial("en", pinsJson as Pins)];
