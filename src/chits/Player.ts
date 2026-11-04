import { setupTable } from "../table";
import { PlayerChit, SparkChit, ChildOutlet, ChitRenderSpec, CameraSpec } from "@pretty-chitty/core";
import { CounterChit } from "./CounterChit";
import { Factory } from "./Factory";
import { FloorTile } from "./FloorTile";
import { cardHasSpecials, PLAYER_DECK, PlayerColor } from "../consts";
import { Card, Hand } from "./Card";

// LAYOUT.md §4 "Factory": the player's panel holds their factory (floor, pieces, bench) and
// later their hand and window piles. Per-player numbers are sparks.
export class Player extends PlayerChit {
  playerColor: PlayerColor = "red";
  seat = 0;
  decisions = 0; // bumped after every answer (src/decide.ts), so no answer is ever a no-op

  @ChildOutlet public factory = new Factory();
  @ChildOutlet public hand = new Hand();

  @ChildOutlet public wealth = new CounterChit().set((c) => { c.label = "$"; c.hex = "#3d7a3d"; c.bindToPlayer(this); });
  @ChildOutlet public gantt = new CounterChit().set((c) => { c.label = "Gantt"; c.hex = "#5f7a8a"; c.bindToPlayer(this); });
  @ChildOutlet public capacity = new CounterChit().set((c) => { c.label = "Assembly capacity"; c.short = "Cap"; c.hex = "#8a5f3a"; c.bindToPlayer(this); c.value = 1; });
  @ChildOutlet public focusSlot = new CounterChit().set((c) => { c.label = "Focus"; c.hex = "#6b6b8a"; c.bindToPlayer(this); });
  // Places in this year's engineering and sales order (P2.6), for the player bar.
  @ChildOutlet public engineering = new CounterChit().set((c) => { c.label = "Engineering order"; c.short = "Eng"; c.hex = "#4a6a8a"; c.bindToPlayer(this); });
  @ChildOutlet public sales = new CounterChit().set((c) => { c.label = "Sales order"; c.short = "Sell"; c.hex = "#8a6a3a"; c.bindToPlayer(this); });
  @ChildOutlet public expansions = new CounterChit().set((c) => { c.label = "Exp"; c.hex = "#444"; c.bindToPlayer(this); c.value = 6; });

  // Only numbers that differ between players and that the table does not already show. Assembly capacity, Gantt charts and focus
  // are brand pieces on the planning office's tracks, so they are not repeated here: a spark
  // that changes pulls every viewer to this player's panel during playback (engine
  // PanelSpark), and those three change constantly. The counters stay as the values the
  // rules read.
  // Wealth, assembly capacity and this year's place in engineering and sales order (developer
  // request): numbers each player reads constantly, kept off the board.
  override getSparks(): SparkChit[] {
    return [this.wealth, this.capacity, this.engineering, this.sales];
  }

  // S2: a main factory floor tile; S11: six expansions waiting in the box.
  setupFactory(): void {
    this.factory.floors.add(new FloorTile().set((f) => { f.kind = "main"; f.x = 0; f.y = 0; }));
    this.factory.recomputeGrid();
    this.factory.syncHand(); // the hand deck starts beside the floor, not at the origin (it used to slide in)
  }

  // S2 / V1: the deck of 17 cards, or the 8 without trucks and sports cars.
  setupHand(intro: boolean): void {
    this.hand.playerColor = this.playerColor;
    // Sorted by the year printed on each card (developer request): the gallery reads in the
    // order the cards become playable (P8.3). Every hand starts as the same deck, so the order
    // tells rivals nothing.
    for (const c of [...PLAYER_DECK].sort((a, b) => a.year - b.year)) {
      if (intro && cardHasSpecials(c)) continue;
      this.hand.cards.add(new Card().set((k) => { k.cardId = c.id; k.playerColor = this.playerColor; k.ownerId = this.playerId; }));
    }
  }

  render(spec: ChitRenderSpec): void {
    // The player chit draws nothing itself; its own fields are bookkeeping (the decision
    // counter changes after every answer). Only its pieces should pull the camera here.
    spec.worthSlidingToPanelToShowChange = false;
    spec.camera = new CameraSpec();
    spec.camera.paddingTop = 30;
    spec.camera.paddingBottom = 10;
    spec.camera.paddingLeft = 10;
    spec.camera.paddingRight = 10;
    setupTable(spec, this.playerColor); // their own floor, stained toward their colour
  }
}
