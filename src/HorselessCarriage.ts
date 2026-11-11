import { Game, GameResult, Turn, GameTheme, ChitRenderSpec, LightSpec, StaticImage, GameMetaData } from "@pretty-chitty/core";
import { Mesh, MeshPhongMaterial, RepeatWrapping, PlaneGeometry } from "three";
import "@fontsource/quicksand/400.css";
import "@fontsource/quicksand/700.css";
import "@fontsource/roboto-slab/700.css";

// Canvas faces draw text once and cache the texture, and the engine does not wait for web
// fonts: start loading the print font now so faces drawn later use it, not the fallback.
if (typeof document !== "undefined") void document.fonts?.load("700 32px 'Roboto Slab'");

import * as ButtonLibrary from "./ButtonLibrary";
import { ChitLibrary } from "./chits/ChitLibrary";
import { CanvasLibrary } from "./canvas/CanvasLibrary";

import { Root } from "./chits/Root";
import { Player } from "./chits/Player";
import { ResearchTrack } from "./chits/ResearchTrack";
import { Catalogue } from "./chits/Catalogue";
import { Card } from "./chits/Card";
import { carTokenArt, feltArt } from "./art";
import { carTypeHex, dimensions, MAX_YEARS, NEUTRAL_DECK, playerColors, playerHex } from "./consts";
import { executeBuildFactory, placeStartingDepartments } from "./phases/phase3BuildFactory";
import { executeResearch } from "./phases/phase1Research";
import { executeSetFocus } from "./phases/phase2SetFocus";
import { executePrintBrochures } from "./phases/phase4PrintBrochures";
import { executeSell } from "./phases/phase5Sell";
import { executeAdvanceExpectations } from "./phases/phase7AdvanceExpectations";
import { drawNeutralBuyers, executeGrowDemand } from "./phases/phase8GrowDemand";
import { ai } from "./ai";
import { tutorials } from "./tutorial/script";

import boxArt from "../static/boxArt.jpg";
import screenshot from "../static/screenshot.jpg";

// The box: charcoal ground, cream paper lettering; the action bar in a dark, muted teal from
// the sports-car green so it stands apart from every player colour.
const theme = GameTheme.withDefaults("#262626", "#d8c7a0");
theme.actionBarColor = "#2f4a4c";
theme.fontFamily = "Quicksand, sans-serif";

export default class HorselessCarriage implements Game<Player, Root> {
  metadata = {
    name: "Horseless Carriage",
    licenseInformation: "Fan implementation; Horseless Carriage © Splotter Spellen BV 2022.",
    implementationNotes:
      "The full game and the introductory rules (no trucks or sports cars), 3–5 players, audited rule by rule against the publisher's rulebook. " +
      "Everyone builds at once in phase 3; when the shared supply runs short, engineering focus decides who keeps their pieces and the others rebuild. " +
      "Where the rulebook is silent: price markers are $6, $4, $3 and $2; minimum specs have no upper limit; car meeples, sparks and spec indicators never run out; " +
      "each colour set adds 6 research and 6 planning departments to the supply, and the two starting departments come from it; " +
      "touching mainline sides of the same step form one manufacturing zone; floor expansions are rotated but never turned over; " +
      "a market window may go anywhere within its dealer's specs, and sells nothing that turn if no buyer inside can be sold to; a player with no card they may play skips growing demand.",
    publisher: "Splotter Spellen",
    designer: "Jeroen Doumen, Joris Wiersinga",
    artist: "Jan Lipiński",
    rulesPdfUrl: "",
    purchaseUrl: "https://www.splotter.nl",
    publisherUrl: "https://www.splotter.nl",
    description: "Industrialists build factories and sell the first automobiles to a market whose tastes change every year.",
    boxArt,
    screenshot,
  } as GameMetaData;

  chitLibrary = ChitLibrary;
  canvasLibrary = CanvasLibrary;
  buttonLibrary = ButtonLibrary;
  theme = theme;
  ai = ai; // src/ai.ts: rule-based bots for demo seats and AI players
  tutorials = tutorials; // src/tutorial/script.ts: the scripted first year (TUTORIAL.md)
  // Log and prompt icons: each car type is its white car on its colour, as on the spark markers.
  tokenMap = {
    table: { image: feltArt },
    car: { image: carTokenArt("car"), text: "car" },
    sports: { image: carTokenArt("sports"), text: "sports car" },
    truck: { image: carTokenArt("truck"), text: "truck" },
  };

  async run(setup: Turn<GameResult<Player>, Player, Root>, root: Root) {
    const players = root.players.copy();
    await this.gameSetup(setup, root, players);

    // S10 / P3.25: the starting departments are placed under the normal placement rules.
    await executeBuildFactory(root, setup, "setup");

    for (let year = 1; year <= MAX_YEARS; year++) {
      root.year = year;
      root.playerAid.year = year;
      setup.log(`Year ${year}`);
      root.playerAid.phase = 1;
      await executeResearch(root, setup);
      root.playerAid.phase = 2;
      await executeSetFocus(root, setup);
      root.playerAid.phase = 3;
      await executeBuildFactory(root, setup, "year");
      root.playerAid.phase = 4;
      await executePrintBrochures(root, setup);
      root.playerAid.phase = 5;
      await executeSell(root, setup);
      root.playerAid.phase = 6;
      // P6.2: the timecard was turned over before this phase. P6.3: the game ends in year 7,
      // the year in which no floor expansions were left to place in phase 3.
      if (root.clock.timecardFlipped()) {
        setup.log("The timecard has run out: the game is over");
        break;
      }
      if (year >= MAX_YEARS) {
        setup.log("No floor expansions remain: the game is over");
        break;
      }
      root.playerAid.phase = 7;
      await executeAdvanceExpectations(root, setup);
      root.playerAid.phase = 8;
      await executeGrowDemand(root, setup);
    }
    const winners = root.winners();
    setup.log(`${winners.map((w) => w.logKey).join(" and ")} win${winners.length === 1 ? "s" : ""} with $${winners[0].wealth.value}`);
    return { winners };
  }

  // RULES.md S1–S17 (the parts that exist so far).
  private async gameSetup(setup: Turn<GameResult<Player>, Player, Root>, root: Root, players: Player[]) {
    players.forEach((p, i) => {
      p.seat = i;
      p.playerColor = playerColors[i];
      p.color = playerHex(p.playerColor);
      p.setupFactory(); // S2, S11
      const cat = new Catalogue().set((c) => (c.playerId = p.playerId));
      root.catalogues.add(cat);
      p.factory.catalogue = cat;
      p.setupHand(root.variant === "intro"); // S2, V1
    });
    root.supply.setup(players.length, root.variant === "intro"); // S16, V2a
    root.market.setup(); // C4, C5
    root.market.setupReach(players); // the reach overlays, one per possible dealership
    root.market.setupWindowTargets();
    root.research.capacity.setup(); // M23
    root.clock.setup(players.length); // S13
    root.office.setup(players); // S8, S9, S12
    root.syncOrderSparks(); // S8: the starting order, for the player bar
    // C34 / M20 / V1: the neutral deck, minus its truck card under the introductory rules.
    root.market.neutralDeck.discard(NEUTRAL_DECK.filter((c) => root.variant !== "intro" || !c.sparks.some((sp) => sp.type !== "car")).map((c) => new Card().set((k) => { k.cardId = c.id; k.playerColor = "neutral"; })));
    root.market.neutralDeck.shuffle();

    // S3–S7: shuffle the five tracks; two go active, three off-board.
    const rng = await setup.takeRng(dimensions.length);
    const order = [...dimensions];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    const makeTrack = (d: (typeof dimensions)[number], startPosition: number) =>
      new ResearchTrack().set((t) => {
        t.dimension = d;
        t.setup(players, startPosition);
      });
    root.market.bottomTrack = makeTrack(order[0], 1); // S3, S5
    root.market.leftTrack = makeTrack(order[1], 1);
    root.market.bottomAxis.dimension = order[0]; // S1: both axes read 0 1 2 3
    root.market.leftAxis.dimension = order[1];
    order.slice(2).forEach((d) => root.research.offBoard.add(makeTrack(d, 0))); // S6
    // S14, S15: players + 1 neutral cards seed quadrant I, and the $6 marker lands bottom-left.
    await drawNeutralBuyers(root, setup, Array(players.length + 1).fill(1), false);
    root.market.repriceSegments();
    // S10: the starting departments, already on each floor.
    for (const p of players) placeStartingDepartments(p);
    // One first frame with the whole table set out: nothing is dealt or flipped in on screen.
    setup.flush();
  }

  // The engine weights a DragPick by its target count, so a piece with 120 legal squares
  // would swamp every button. Normalise drags to one unit each, then shape the rest so the
  // demo builds a little before it finishes and rarely undoes itself.
  // Demo AI weighting only — never a reason to change what a player sees. The engine multiplies
  // this weight by the number of options in the pick (chits in a ChitPick, targets in a
  // DragPick), so each weight is divided back by that count: the numbers below are per
  // decision, not per option. The AI then tidies up and finishes whenever it can, so its
  // factories stay small and every phase gets played.
  demoPickWeight(picks: any[], pick: any): number {
    const m: string = pick.message ?? "";
    const chits = pick.details?.c?.length ?? 1;
    const targets = (pick.details?.d ?? []).reduce((n: number, g: any[]) => n + g.length, 0);
    const drags = picks.filter((p) => p.type === "DragPick").length;
    if (pick.type === "DragPick") return 2 / Math.max(1, drags) / Math.max(1, targets); // all drags together: 2
    if (pick.type === "ChitPick" && /add an item/.test(m)) return 0.5 / chits;
    if (pick.type === "ChitPick") return 1 / chits; // selecting a piece, or an ordinary choice
    if (/finish|confirm/.test(m)) return 8;
    if (/^take back|remove the indicator/.test(m)) return 3;
    if (/rotate|turn the|flip/.test(m)) return 0.3;
    if (/^pass/.test(m)) return 0.3;
    return 1;
  }

  // Lighting only: every panel draws its own table (src/table.ts). Brighter than the engine's
  // realistic() preset (ambient 0.3, two low lights), which left flat boards seen from above dim:
  // more ambient, and the key light higher, so faces read while edges still cast shadows.
  renderDefaultRootChit(spec: ChitRenderSpec): void {
    const light = LightSpec.realistic();
    light.ambientIntensity = 0.75;
    light.lights[0].intensity = 1.3;
    light.lights[0].angleElevationRadians = Math.PI * (1.25 / 4);
    light.lights[1].intensity = 1.0;
    spec.lightSpec = light;
    // The root's fields (year, variant) are bookkeeping, not something to slide to.
    spec.worthSlidingToPanelToShowChange = false;
  }

}
