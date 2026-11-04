// WORKED EXAMPLE (a finished tutorial from a space-cruise port): copy to src/tutorial/script.ts, keep
// the plumbing, replace the selectors, checks and steps. See README.md in this folder.
import { checks, defineTutorial, ForcedDecision, splitSentences, TutorialSpec, TutorialStep } from "@pretty-chitty/core";
import type { AiOption, Checker, Chit, Cue as CueOf, Focus as FocusOf, TutorialContext } from "@pretty-chitty/core";
import type { Root } from "../chits/Root";
import type { Player } from "../chits/Player";
import pinsJson from "./pins.json";
import en from "./strings.en.json";
import { narration } from "./audio/index";

/**
 * The intro tutorial: a First Game for three (you, Nova and Orion), scripted from the deal through
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
const quadrant = (q: number) => (root: Root) => root.market.niches.filter((n) => n.quadrant() === q);
const segment = (seg: number) => (root: Root) => root.market.niches.filter((n) => n.segment() === seg);
const priced = (root: Root) => root.market.niches.filter((n) => n.price > 0);
const activeTracks = (root: Root) => [root.market.bottomTrack!, root.market.leftTrack!];
const offBoard = (root: Root) => root.research.offBoard.copy();
const myMarkers = (root: Root, me: Player) => root.allTracks().map((t) => t.markerOf(me.playerId)!).filter(Boolean);
const mySlot = (dim: string) => (root: Root, me: Player) => {
  const t = root.allTracks().find((x) => x.dimension === dim)!;
  return t.slot(t.positionOf(me.playerId));
};
const myTiles = (kind: string) => (_root: Root, me: Player) => me.factory.placedTiles().filter((t) => t.kind === kind);
const entry = (sig: string) => (_root: Root, me: Player) => me.factory.benchTiles().find((e) => e.signature() === sig)!;
const tile = (sig: string) => (_root: Root, me: Player) => me.factory.placedTiles().find((t) => t.signature() === sig && !t.committed);
const dropAt = (x: number, y: number, w: number, h: number) => (_root: Root, me: Player) => me.factory.targets.find((d) => d.x === x && d.y === y && d.w === w && d.h === h);
const at_ = (sig: string, x: number, y: number) => (_root: Root, me: Player) => me.factory.placedTiles().some((t) => t.signature() === sig && t.x === x && t.y === y);
const myIndicators = (_root: Root, me: Player) => me.factory.indicators.copy();
const hand = (_root: Root, me: Player) => me.hand;
const supply = (root: Root) => root.supply;
const windowSpot = (row: number, col: number, w: number, h: number) => (root: Root) => root.market.windowTargets.find((t) => t.row === row && t.col === col && t.w === w && t.h === h);
const inHand = (id: string) => (_root: Root, me: Player) => me.hand.cards.find((c) => c.cardId === id);
const quadrantSpot = (q: number) => (root: Root) => root.market.quadrantTargets.find((t) => t.quadrant === q)!;
const sparksOnBoard = (root: Root) => root.market.niches.filter((n) => n.sparks.length > 0);

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
export const steer: Steer = ({ step, bot, option }) => {
  // Sam researches design, an off-board track, so the innovation rule has something to show in phase 7.
  if (step === "others-research-sam" && bot === "p2" && option.key === "research.space") {
    const track = (option as { chit?: { parent?: { dimension?: string } } }).chit?.parent;
    return track?.dimension === "design" ? 1000 : 0;
  }
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
    hint: { after: 12, text: hint(id) ?? "Nova and Orion are still taking their turns." },
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
   * the recording's word times, or else its sentence. For cues inside a sentence ("Launch, Advertise…").
   */
  const onWord = (id: string, word: string, nth = 0): number | { sentence: number } => {
    const norm = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
    const hits = (narration[t.locale]?.[id]?.words ?? []).filter(([w]) => norm(w) === norm(word));
    if (hits[nth]) return hits[nth][1];
    return at(id, word);
  };
  const beats = (id: string, list: [string, Focus[], Partial<Cue>?][]): Pick<Step, "focus" | "cues"> => {
    const sentences = splitSentences(text(id));
    const cues: Cue[] = [];
    let focus: Focus[] | undefined;
    for (const [phrase, f, extra] of list) {
      if (phrase === "") {
        focus = f;
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
    return { focus: focus ?? [], cues };
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
  const sparksDown = checks.state<Player, Root>((root) => root.year === 1 && root.market.played.length === 0 && root.market.niches.some((n) => n.sparks.length > 0));
  const sparkBuyers = logged(/Sparks bring/);
  const nextYear = checks.state<Player, Root>((root) => root.year >= 2);
  const cardsDown = checks.state<Player, Root>((root) => root.year === 1 && root.market.played.length >= 3);
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
    narrate(
      "goal",
      beats("goal", [
        ["", [{ ring: (root) => root.office, reveal: true, zoom: false }]],
        ["dollar", [{ arrow: spark((me) => me.wealth) }]],
        ["punch clock", [{ ring: clockSpaces, zoom: false }, { ring: timecard, arrow: true }]],
      ]),
    ),
    narrate(
      "market",
      beats("market", [
        ["", [{ ring: market, reveal: true, zoom: false }]],
        ["sixty-four", [{ ring: (root) => root.market.niches.copy(), zoom: false }, { ring: nichesWithBuyers, separate: true, arrow: true }]],
        ["quadrants", [{ ring: quadrant(1) }, { ring: quadrant(2) }, { ring: quadrant(3) }, { ring: quadrant(4) }]],
        ["price segments", [{ ring: segment(1) }, { ring: segment(4) }]],
        ["price marker", [{ ring: priced, separate: true, arrow: true }]],
      ]),
    ),
    narrate(
      "axes",
      beats("axes", [
        ["", [{ ring: activeTracks, separate: true, reveal: true }]],
        ["axes", [{ ring: (root) => [root.market.bottomAxis, root.market.leftAxis], separate: true, arrow: true }]],
        ["bottom-left", [{ ring: (root) => root.market.niche(8, 1), arrow: true }]],
        ["top-right", [{ ring: (root) => root.market.niche(1, 8), arrow: true }]],
        ["black arrow", [{ ring: (root) => root.market.obsolescenceMarker, arrow: true }, { ring: (root) => root.market.bottomTrack! }]],
      ]),
    ),
    narrate(
      "tracks",
      beats("tracks", [
        ["", [{ ring: offBoard, separate: true, reveal: true }]],
        ["six slots", [{ ring: (root) => root.research.offBoard.get(0)!.slots.filter((s) => s.position > 0), separate: true }]],
        ["your marker", [{ ring: myMarkers, separate: true, arrow: true }]],
        ["innovation", [{ ring: (root) => root.allTracks().map((t) => t.innovation.get(0)!), separate: true }]],
      ]),
    ),
    narrate(
      "office",
      beats("office", [
        ["", [{ ring: office, reveal: true, zoom: false }]],
        ["Gantt", [{ ring: officeSpaces("gantt") }]],
        ["focus track", [{ ring: officeSpaces("focus") }]],
        ["last year", [{ ring: officeSpaces("historical"), arrow: true }]],
        ["Assembly", [{ arrow: spark((me) => me.capacity) }]],
        ["engineering order and sales", [{ arrow: spark((me) => me.engineering) }, { arrow: spark((me) => me.sales) }]],
      ]),
    ),
    narrate(
      "factory",
      beats("factory", [
        ["", [{ ring: factory, reveal: true, zoom: false }]],
        ["loading bay", [{ ring: { chit: (_root: Root, me: Player) => me.factory.floors.get(0)!, offset: { x: 0.29, y: 0.29 }, scale: { x: 0.42, y: 0.42 } }, arrow: true }]],
        ["two departments", [{ ring: myTiles("department"), separate: true, arrow: true }]],
      ]),
    ),
    narrate(
      "supply-cards",
      beats("supply-cards", [
        ["", [{ ring: supply, reveal: true, zoom: false }]],
        ["market cards", [{ ring: hand, arrow: true, reveal: true }]],
      ]),
    ),
    // ------------------------------------------------------------------ setup
    doIt("place-departments", [{ key: "build.done" }], promptGone(/starting departments/, hint("place-departments") ?? ""), {
      focus: [{ ring: myTiles("department"), separate: true }, { arrow: { ui: "button:Done" } }],
    }),
    confirm("confirm-setup"),
    othersStep("others-setup", checks.state((root) => root.year >= 1), { focus: [{ ring: (root) => [...robin(root).factory.floors.copy(), ...sam(root).factory.floors.copy()], separate: true, zoom: false }] }),
    // ------------------------------------------------------------------ year 1: research
    narrate(
      "research",
      beats("research", [
        ["", [{ ring: myTiles("department"), separate: true, arrow: true }]],
        ["any marker", [{ ring: (root) => root.allTracks().flatMap((t) => t.markers()), separate: true }]],
        ["assembly capacity", [{ arrow: { ui: "button:Capacity" } }, { arrow: spark((me) => me.capacity) }]],
        ["punch clock", [{ ring: timecard, arrow: true }]],
      ]),
    ),
    doIt("research-space", [{ key: "research.space", chit: mySlot("reliability") }], checks.promptMessage(/whose marker/), {
      focus: [{ ring: mySlot("reliability"), arrow: true, dim: true }],
    }),
    doIt("research-marker", [{ key: "research.marker", chit: (root, me) => root.track("reliability").markerOf(me.playerId)! }], checks.state((root, me) => root.track("reliability").positionOf(me.playerId) === 2), {
      focus: [{ ring: (root, me) => root.track("reliability").markerOf(me.playerId)!, arrow: true, dim: true }],
    }),
    confirm("confirm-research"),
    narrate("research-done", {
      focus: [{ ring: (root) => root.track("reliability").slot(2), arrow: true }],
    }),
    watch("others-research-robin", "p1", logged(/:p1: (advances|raises)/), { focus: [{ ring: (root) => root.allTracks().map((t) => t.markerOf(robin(root).playerId)!).filter(Boolean), separate: true, zoom: false }] }),
    watch("others-research-sam", "p2", logged(/:p2: (advances|raises)/), { focus: [{ ring: (root) => root.track("design"), arrow: true, reveal: true }] }),
    // ------------------------------------------------------------------ year 1: focus
    narrate(
      "focus",
      beats("focus", [
        ["", [{ ring: officeSpaces("gantt"), zoom: false }]],
        ["focus track", [{ ring: officeSpaces("focus"), separate: true }]],
        ["Slot 1", [{ ring: officeSpace("focus", 1), arrow: true }]],
        ["highest open slot", [{ ring: officeSpace("focus", 3), arrow: true }]],
        ["Gantt charts back", [{ ring: officeSpace("gantt", 0), arrow: true }]],
      ]),
    ),
    doIt("focus-do", [{ key: "focus.slot", chit: officeSpace("focus", 1) }], checks.state((root, me) => root.office.focusSlot(me.playerId) === 1), {
      focus: [{ ring: officeSpace("focus", 1), arrow: true, dim: true }],
    }),
    confirm("confirm-focus"),
    watch("others-focus-robin", "p1", logged(/:p1: (sets their focus|passes)/), { focus: [{ ring: officeSpaces("focus"), separate: true }] }),
    watch("others-focus-sam", "p2", checks.promptMessage(/build their factory/), { focus: [{ ring: officeSpaces("focus"), separate: true }] }),
    // ------------------------------------------------------------------ year 1: build
    narrate(
      "build",
      beats("build", [
        ["", [{ ring: factory, reveal: true, zoom: false }]],
        ["Add gallery", [{ ring: { ui: "gallery:inline" } }, { arrow: { ui: "button:Add" } }]],
        ["Everyone builds", [{ arrow: { ui: "players" } }]],
      ]),
    ),
    doIt("add-mainline", [{ key: "build.add", chit: entry("mainline:car") }], checks.state((root, me) => !!tile("mainline:car")(root, me)), {
      focus: [{ arrow: { ui: "button:Add" } }, { ring: entry("mainline:car"), arrow: true }],
    }),
    doIt("place-mainline", [{ key: "build.move", chit: tile("mainline:car"), target: dropAt(3, 3, 4, 3) }], checks.state(at_("mainline:car", 3, 3)), {
      focus: [{ ring: tile("mainline:car"), arrow: true }, { ring: dropAt(3, 3, 4, 3) }],
    }),
    narrate("mainline", { focus: [{ ring: tile("mainline:car"), arrow: true, dim: true }] }),
    doIt("add-dealer", [{ key: "build.add", chit: entry("dealership:0") }], checks.state((root, me) => !!tile("dealership:0")(root, me)), {
      focus: [{ arrow: { ui: "button:Add" } }, { ring: entry("dealership:0"), arrow: true }],
    }),
    doIt("rotate-dealer", [{ button: "Rotate" }], checks.state((root, me) => tile("dealership:0")(root, me)?.rotation === 1), {
      focus: [{ ring: tile("dealership:0") }, { arrow: { ui: "button:Rotate" } }],
    }),
    doIt("place-dealer", [{ key: "build.move", chit: tile("dealership:0"), target: dropAt(0, 3, 3, 4) }], checks.state(at_("dealership:0", 0, 3)), {
      focus: [{ ring: tile("dealership:0"), arrow: true }, { ring: dropAt(0, 3, 3, 4) }],
    }),
    narrate(
      "zones",
      beats("zones", [
        ["", [{ ring: tile("mainline:car"), arrow: true, dim: true }]],
        ["A side", [{ ring: { chit: tile("mainline:car"), offset: { y: -0.4 }, scale: { y: 0.25 } }, arrow: true }]],
        ["own hatching", [{ ring: (root) => root.supply.stacks.filter((st) => st.key.startsWith("station:")), zoom: false }]],
        ["spec indicator", [{ ring: (root) => root.track("reliability").slot(2), arrow: true }]],
      ]),
    ),
    doIt("add-chassis", [{ key: "build.add", chit: entry("station:chassis") }], checks.state((root, me) => !!tile("station:chassis")(root, me)), {
      focus: [{ arrow: { ui: "button:Add" } }, { ring: entry("station:chassis"), arrow: true }],
    }),
    doIt("place-chassis", [{ key: "build.move", chit: tile("station:chassis"), target: dropAt(3, 6, 3, 4) }], checks.state(at_("station:chassis", 3, 6)), {
      focus: [{ ring: tile("station:chassis"), arrow: true }, { ring: dropAt(3, 6, 3, 4) }],
    }),
    doIt("add-spec", [{ button: "Add spec" }], checks.state((_root, me) => me.factory.indicators.length > 0), {
      focus: [{ ring: tile("station:chassis") }, { arrow: { ui: "button:Add spec" } }],
    }),
    doIt("place-spec", [{ key: "build.move", chit: (_root, me) => me.factory.indicators.get(0)!, target: dropAt(6, 6, 1, 1) }], checks.state((_root, me) => me.factory.indicators.some((i) => i.x === 6 && i.y === 6)), {
      focus: [{ ring: (_root, me) => me.factory.indicators.get(0)!, arrow: true }, { ring: dropAt(6, 6, 1, 1) }],
    }),
    doIt("add-marketing", [{ key: "build.add", chit: entry("dept:marketing") }], checks.state((root, me) => !!tile("dept:marketing")(root, me)), {
      focus: [{ arrow: { ui: "button:Add" } }, { ring: entry("dept:marketing"), arrow: true }],
    }),
    doIt("rotate-marketing", [{ button: "Rotate" }], checks.state((root, me) => tile("dept:marketing")(root, me)?.rotation === 1), {
      focus: [{ ring: tile("dept:marketing") }, { arrow: { ui: "button:Rotate" } }],
    }),
    doIt("place-marketing", [{ key: "build.move", chit: tile("dept:marketing"), target: dropAt(0, 7, 3, 4) }], checks.state(at_("dept:marketing", 0, 7)), {
      focus: [{ ring: tile("dept:marketing"), arrow: true }, { ring: dropAt(0, 7, 3, 4) }],
    }),
    narrate("expansion", {
      focus: [{ ring: (_root, me) => me.factory.pendingExpansion()!, arrow: true }],
    }),
    doIt("done-build", [{ key: "build.done" }], promptGone(/build their factory/, hint("done-build") ?? ""), {
      focus: [{ arrow: { ui: "button:Done" } }],
    }),
    confirm("confirm-build", upTo(checks.state((root) => root.playerAid.phase >= 5))), // the same hold as "brochures"
    othersStep("others-build", checks.state((root) => root.playerAid.phase >= 4), { focus: [{ ring: (root) => [...robin(root).factory.floors.copy(), ...sam(root).factory.floors.copy()], separate: true, zoom: false }] }),
    // ------------------------------------------------------------------ year 1: brochures and sales
    narrate("brochures", {
      ...upTo(checks.state((root) => root.playerAid.phase >= 5)),
      ...beats("brochures", [
        ["", [{ ring: (_root, me) => me.factory.placedTiles().filter((t) => t.kind === "department" && t.departmentType === "planning"), arrow: true }]],
        ["specs", [{ ring: myTiles("dealership"), arrow: true }]],
        ["marketing", [{ ring: myTiles("department"), separate: true }]],
        ["faint", [{ ring: reachOf(me_), arrow: true }]],
      ]),
    }),
    narrate(
      "sell",
      beats("sell", [
        ["", [{ ring: officeSpaces("focus"), separate: true }]],
        ["window", [{ ring: myTiles("dealership"), arrow: true }]],
        ["every buyer", [{ ring: nichesWithBuyers, separate: true }]],
        ["capacity", [{ arrow: spark((me) => me.capacity) }]],
      ]),
    ),
    watch("others-sell-robin", "p1", logged(/:p1: sells/), { focus: [{ ring: (root) => root.market.windows.copy(), separate: true, arrow: true }] }),
    watch("others-sell-sam", "p2", logged(/:p2: sells/), { focus: [{ ring: (root) => root.market.windows.copy(), separate: true, arrow: true }] }),
    doIt("sell-window", [{ key: "sell.window", target: windowSpot(7, 1, 2, 2) }, { button: "Confirm" }], checks.promptMessage(/inside the new window/), {
      focus: [{ ring: (root) => root.market.windows.filter((w) => w.staged), arrow: true }, { ring: (root) => root.market.niche(7, 1) }],
    }),
    doIt("sell-niche", [{ key: "sell.niche" }], grew((_root, me) => me.wealth.value), {
      focus: [{ ring: (root) => root.market.niches.filter((n) => n.highlighted), separate: true, arrow: true }],
    }),
    confirm("confirm-sell", upTo(soldMine)), // hold before phases 6–8 can run past the sale
    narrate("sold", {
      ...upTo(soldMine),
      ...beats("sold", [
        ["", [{ arrow: spark((me) => me.wealth) }]],
        ["capacity", [{ arrow: spark((me) => me.capacity) }]],
        ["rounds", [{ arrow: { ui: "players" } }]],
      ]),
    }),
    // ------------------------------------------------------------------ year 1: the end of the year
    narrate("finish", {
      ...upTo(soldMine),
      ...beats("finish", [
        ["", [{ ring: timecard, arrow: true }]],
        ["flips over", [{ ring: clockSpaces, zoom: false }, { ring: timecard, arrow: true }]],
        ["seventh year", [{ ring: (_root, me) => me.factory.floors.copy(), zoom: false }]],
      ]),
    }),
    narrate("expectations", {
      ...beats("expectations", [
        ["", [{ ring: activeTracks, separate: true }]],
        ["leaves the market", [{ ring: (root) => root.market.obsolescenceMarker, arrow: true }, { ring: (root) => root.research.offBoard.get(root.research.offBoard.length - 1)! }], upTo(oldTrackOut)],
        ["Sam", [{ ring: (root) => root.track("design").markers(), separate: true, arrow: true }]],
        ["minimum", [{ ring: (root) => root.market.minSpecs.copy(), arrow: true }]],
        ["most innovative", [{ ring: activeTracks, separate: true }, { ring: (root) => root.allTracks().map((t) => t.innovation.get(0)!), separate: true }], upTo(newTrackIn)],
        ["arrow turns", [{ ring: (root) => root.market.obsolescenceMarker, arrow: true }]],
      ]),
    }),
    // ------------------------------------------------------------------ year 1: grow demand
    narrate(
      "grow",
      beats("grow", [
        ["", [{ ring: hand, arrow: true }]],
        ["sparks", [{ ring: hand, arrow: true }]],
        ["floor expansions", [{ ring: (_root, me) => me.factory.floors.copy(), zoom: false }]],
      ]),
    ),
    doIt("play-card", [{ key: "grow.card", chit: inHand("P3") }], checks.promptMessage(/choose a quadrant/), {
      focus: [{ ring: inHand("P3"), arrow: true }],
    }),
    doIt("play-quadrant", [{ key: "grow.quadrant", chit: quadrantSpot(1) }], checks.state((root) => root.market.played.length > 0), {
      focus: [{ ring: quadrantSpot(1), arrow: true }, { ring: quadrant(1) }],
    }),
    confirm("confirm-card"),
    othersStep("others-cards", cardsDown, { ...upTo(cardsDown), focus: [{ ring: (root) => root.market.played.copy(), separate: true, arrow: true }] }),
    narrate("reveal", {
      timeline: "hold",
      ...beats("reveal", [
        ["", [{ ring: (root) => root.market.played.copy(), separate: true }]],
        ["spark lands", [{ ring: sparksOnBoard, separate: true, arrow: true }, { ring: timecard, arrow: true }], upTo(sparksDown)],
        ["new buyer", [{ ring: nichesWithBuyers, separate: true }], upTo(sparkBuyers)],
        ["neutral deck", [{ ring: (root) => root.market.neutralDeck, arrow: true }], upTo(nextYear)],
        ["prices", [{ ring: priced, separate: true }]],
      ]),
    }),
    // ------------------------------------------------------------------ the rest of the game
    narrate("year-two", {
      ...upTo(nextYear), // whatever the reveal's cues reached, the board lands on the new year here
      ...beats("year-two", [
        ["", [{ ring: myTiles("dealership"), arrow: true }]],
        ["safety now", [{ ring: (root) => root.market.minSpecs.copy(), arrow: true }]],
        ["expansion is part", [{ ring: (_root, me) => me.factory.floors.copy(), separate: true, zoom: false }]],
        ["Stations you built", [{ ring: myTiles("station"), arrow: true }]],
        ["several windows", [{ ring: myTiles("dealership"), arrow: true }]],
      ]),
    }),
    narrate("game-end", {
      ...beats("game-end", [
        ["", [{ ring: timecard, arrow: true }]],
        ["richest", [{ arrow: { ui: "players" } }]],
        ["sales focus", [{ ring: officeSpaces("historical") }]],
      ]),
    }),
    narrate("full-game", { focus: [{ ring: (root) => root.supply.stacks.filter((st) => st.key.startsWith("mainline:")), separate: true }] }),
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
