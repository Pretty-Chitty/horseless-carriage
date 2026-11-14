import { RootChit, DropdownChit, ChildOutlet, Selectable, LayoutNode, Ordered, OrderedOutlet } from "@pretty-chitty/core";
import { Catalogue } from "./Catalogue";
import { PlayerAid } from "./PlayerAid";
import { Player } from "./Player";
import { MarketBoard } from "./MarketBoard";
import { ResearchArea } from "./ResearchArea";
import { PlanningOffice } from "./PlanningOffice";
import { ClockBoard } from "./ClockBoard";
import { SupplyArea } from "./SupplyArea";
import { ResearchTrack } from "./ResearchTrack";
import { Dimension } from "../consts";

export class Root extends RootChit<Player> {
  minPlayers = 3; // C3
  maxPlayers = 5; // C3

  @Selectable({
    label: "Rules",
    choices: [
      { label: "Full game", id: "full" },
      { label: "Introductory rules (no trucks or sports cars)", id: "intro" },
    ],
  })
  public variant: "full" | "intro" = "full"; // V1–V3

  // P3.1: the book advises building concurrently, with the supply settled in engineering order.
  // "engineering" plays it strictly: one player at a time, slot 1 first, each seeing the last.
  @Selectable({
    label: "Factory building",
    choices: [
      { label: "Everyone at once", id: "simultaneous" },
      { label: "One at a time, in engineering order", id: "engineering" },
    ],
  })
  public buildOrder: "simultaneous" | "engineering" = "simultaneous";

  year = 0; // 0 during setup, then 1..7 (C1, P6.3)

  @ChildOutlet public market = new MarketBoard();
  @ChildOutlet public research = new ResearchArea();
  @ChildOutlet public office = new PlanningOffice();
  @ChildOutlet public clock = new ClockBoard();
  @ChildOutlet public supply = new SupplyArea();
  @ChildOutlet public playerAid = new PlayerAid();
  @Ordered public catalogues = new OrderedOutlet<Catalogue>(); // per-player build catalogues: gallery only, in no panel

  override setupDemoGame(): number {
    return 4;
  }

  override getDropdowns(): DropdownChit[] {
    return [this.playerAid];
  }

  allTracks(): ResearchTrack[] {
    return [this.market.bottomTrack, this.market.leftTrack, ...this.research.offBoard.copy()].filter((t): t is ResearchTrack => !!t);
  }
  track(d: Dimension): ResearchTrack {
    const t = this.allTracks().find((x) => x.dimension === d);
    if (!t) throw new Error(`no track for ${d}`);
    return t;
  }
  // P2.6: each player's place in engineering order (1 = first) and sales order, for the sparks.
  syncOrderSparks(): void {
    const order = this.engineeringOrder();
    order.forEach((p, i) => {
      if (p.engineering.value !== i + 1) p.engineering.value = i + 1;
      if (p.sales.value !== order.length - i) p.sales.value = order.length - i;
    });
  }
  engineeringOrder(): Player[] {
    return this.office.engineeringOrder(this.players.copy());
  }
  // P6.4: highest wealth; ties go to the higher sales focus (the larger focus slot).
  winners(): Player[] {
    const players = this.players.copy();
    const best = Math.max(...players.map((p) => p.wealth.value));
    const tied = players.filter((p) => p.wealth.value === best);
    if (tied.length === 1) return tied;
    const slot = (p: Player) => this.office.focusSlot(p.playerId) ?? this.office.historicalSlot(p.playerId) ?? 0;
    const top = Math.max(...tied.map(slot));
    return tied.filter((p) => slot(p) === top);
  }

  // P3.10 + P3.11: the set of "dimension:slot" research slots this player may build from.
  // Own research reaches a slot when the marker is on or past it; patents reach a slot when
  // at least `rank` *other* players' markers are on or past it, rank 1 = highest engineering.
  accessibleSlots(player: Player): Set<string> {
    const players = this.players.copy();
    const rank = this.office.engineeringRank(player, players);
    const out = new Set<string>();
    for (const t of this.allTracks()) {
      for (let slot = 1; slot <= 6; slot++) {
        const own = t.positionOf(player.playerId) >= slot;
        const others = players.filter((p) => p !== player && t.positionOf(p.playerId) >= slot).length;
        if (own || others >= rank) out.add(`${t.dimension}:${slot}`);
      }
    }
    return out;
  }

  // Developer decisions (LAYOUT.md §3): the decisions sit on the bottom row beside the action bar
  // and its galleries — the market and the viewer's own factory, large. The reference panels sit
  // in a short row above. Opponents' factories and the rarely-moving punch clock are folded into
  // tab groups, so nobody has to look at everyone's floor all the time.
  override getLayout(width: number, height: number, playerId: string): LayoutNode {
    const viewer = this.players.filter((p) => p.id === playerId);
    const opponents = this.players.filter((p) => p.id !== playerId);
    const reference: LayoutNode[] = [
      { order: 3, chit: this.office, minWidth: 240, minHeight: 150 },
      { order: 4, chit: this.research, minWidth: 240, minHeight: 130 },
      { panels: [{ order: 5, chit: this.supply, minWidth: 200, minHeight: 130 }, { order: 6, chit: this.clock, minWidth: 200, minHeight: 130 }], minWidth: 200, minHeight: 130 },
    ];
    if (opponents.length) reference.push({ panels: opponents.map((p, i) => ({ order: 10 + i, chit: p, minWidth: 200, minHeight: 130 })), minWidth: 200, minHeight: 130 });
    return {
      direction: "optimizePreferVertical",
      collapseOrder: 7,
      splits: [
        { direction: "optimizePreferHorizontal", collapseOrder: 4, splits: reference },
        {
          direction: "optimizePreferHorizontal",
          collapseOrder: 6,
          splits: [
            { order: 1, chit: this.market, minWidth: 380, minHeight: 400 },
            ...viewer.map((p) => ({ order: 2, chit: p, minWidth: 440, minHeight: 400 })),
          ],
        },
      ],
    };
  }

}
