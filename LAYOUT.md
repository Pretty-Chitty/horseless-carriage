# Table plan — state tree, panels and layout

Unit: `BASE_SIZE = 1` = one factory floor square. Everything else is derived from it.
Rule ids refer to `RULES.md`.

## 1. State tree

```
Root (RootChit)
 ├ market: MarketBoard                       PANEL "Market"
 │   ├ niches: Niche[64]  (row 1–8, col 1–8; each knows its quadrant and segment, M1/M2)
 │   │    ├ buyers: Ordered<Car>             car meeples = buyers (C18)
 │   │    └ sparks: Ordered<Spark>           spark markers, value 1 or 2 (C32)
 │   ├ bottomAxis, leftAxis: SpecAxis        dimension + min, drawn face min…min+3 (C9, M4)
 │   ├ bottomTrack, leftTrack: ChildOutlet<ResearchTrack>   the two ACTIVE tracks (C11)
 │   ├ priceMarkers: PriceMarker[4]          value 6/4/3/2, segment or off-board (M3, P8.10)
 │   ├ windows: Ordered<MarketWindow>        windows placed this sell phase (P5.4–P5.7)
 │   ├ quadrantSlots: QuadrantSlot[4]        card-play targets beside each quadrant (P8.2)
 │   └ staged: ChildOutlet<Card>             the card being played, before it is committed
 ├ research: ResearchArea                    PANEL "Research"
 │   ├ capacity: CapacityStrip → spaces: OfficeSpace[1..5] (clock at 5)   (M23)
 │   ├ offBoard: Ordered<ResearchTrack>      the 3 off-board tracks, top → bottom order (S6, P7.9)
 │   └ (each ResearchTrack owns: slots[6] with markers Ordered<BrandPiece>, startSpot markers,
 │      innovation: InnovationIndicator, obsolescence?: ObsolescenceMarker when active)
 ├ office: PlanningOffice                    PANEL "Planning office"
 │   └ spaces: OfficeSpace — gantt 0..20 (clock at 10), focus 1..5, historical 1..5  (M22, C37)
 ├ clock: ClockBoard                         PANEL "Punch clock"
 │   ├ spaces: OfficeSpace 40…1                                 (M25)
 │   └ timecard: Timecard (position, flipped)                   (C35)
 │ market (above) also holds minSpecs: MinSpecMarker (created when first raised, C41, P7.3)
 │   and neutralDeck: NeutralDeck beside the board              (M20, P8.8–9)
 ├ supply: SupplyArea                        PANEL "Supply"
 │   ├ stations: SupplyStack[17]   (count = N sets × copies, M12, S16)
 │   ├ mainlines: SupplyStack[3]   (N × 2 each, M13)
 │   └ departments: SupplyStack[2] (research, planning: N × 6 each, Q6)
 ├ playerAid: PlayerAid                      DROPDOWN
 └ players: Player[3–5]                      PANEL each ("Factory — <name>")
     ├ factory: Factory
     │   ├ floors: Ordered<FloorTile>        main 12×12 + expansions 6×8, x/y/rotation (M9, M10)
     │   ├ tiles: Ordered<FactoryTile>       EVERY tile the player owns: placed (x, y, rotation,
     │   │                                   placedYear) or on the bench (benchSlot) — one parent
     │   │                                   so drag never reparents (patterns.md)
     │   ├ indicators: Ordered<SpecIndicator> each bound to a station tile id, x/y/facing (UX4)
     │   ├ expansionsLeft: number            (S11, P3.21, P8.3)
     │   └ staged expansion: the FloorTile being placed (floors with placed=false)
     ├ hand: Ordered<Card>                   hidden from others; 17 → fewer (C33, M19)
     ├ dealers' windows: MarketWindow[3]     unplaced windows shown as a pile per dealer; the
     │                                       size is recomputed each P4 (C30, P4.8)
     ├ brand pieces                          live on the tracks/slots they stand on (reparented)
     └ sparks (getSparks): wealth $, Gantt charts, assembly capacity, focus slot, expansions left
```

Derived, never stored: a tile's footprint after rotation, zone flood-fill, dealer specs
(recomputed in P4 and *then* snapshotted as `publishedSpecs`/`publishedTypes`/`publishedSize`
because P5 reads the P4 values), legal-placement queries, segment of a niche, innovation score.

Grid index: `Factory.recomputeGrid()` builds `_cells: Map<"x,y", {floor, tile?, step?}>`
from `floors` and `tiles` after every mutation; `Factory.problems(tile)` is the one function
that drives both the red outline (UX2) and the commit gate (UX3).

## 2. Panels (2026-11-03, after the developer's second review)

| Panel | Chit | Holds | Tab | minW×minH |
|---|---|---|---|---|
| Market | `Root.market` | the 8×8 board cut to its frame, the two active tracks and their axis strips flush beside it, price markers, buyers, sparks, windows, played cards, the minimum-spec tiles down its right edge (only once a minimum exists), the obsolescence marker at the end of the track it points at, the neutral deck | 2×2 niches | 340×320 |
| Planning office | `Root.office` | the board's planning-office section: Gantt, focus, last year's focus | the clerks | 280×270 |
| Factory — viewer | `Player` | floors, pieces, indicators, hand deck | player colour | 340×320 |
| Research | `Root.research` | the three off-board tracks, stacked | engine icon | 280×140 |
| Supply / Punch clock | `Root.supply`, `Root.clock` | one tab group: the piles; the board's punch-clock section with the timecard | steering wheel / clock | 220×140 |
| Factory — opponents | `Player` | as the viewer's, read-only | player colour | 180×140 |

Not shown: money is the $ spark (the printed wealth track is not used) and assembly capacity
is a spark; `office.capacity` keeps its spaces as bookkeeping, unrendered.

## 3. Split tree

**Current (developer, 2026-11-03):** bottom row, beside the action bar and its galleries: the market and
the viewer's own factory, both large. Top row, short: planning office, research (off-board tracks), a
tab group of supply + punch clock, and one tab group of every opponent's factory. At phone width every
panel is a tab, in order: market, own factory, office, research, supply, clock, opponents. The Add
gallery opens by itself at the first build prompt. (`Root.getLayout`; the notes below are history.)

```
┌──────────────┬────────────┬──────────────────┐
│ MARKET       │ PLANNING   │ FACTORY (viewer) │
│              │ OFFICE     │                  │
├────────┬─────┴──────┬─────┴──┬───────┬───────┤
│RESEARCH│ SUPPLY|CLOCK│ Bob    │ Carol │ Dave  │
└────────┴────────────┴────────┴───────┴───────┘
```

The punch clock starts folded into a tab group with the supply (a `CollapsedNode`). Collapse
order: opponents (2), the bottom row (4), the whole table (5, the phone's tab strip, in
`order`). The table is worn, oil-stained concrete (`felt()` in `scripts/extract-tts.py`,
seamless 2048 px, its own bump map, one tile 40 units across).

## 4. Per-panel contents and positioning

### Market (`MarketBoard`)
- `NICHE = 2 × BASE`. Board origin: niche (row, col) centre at
  `x = (col − 4.5) × NICHE`, `y = (4.5 − row) × NICHE`. Board 16×16 units.
- Bottom track: `ResearchTrack` rotated 0 at `y = −8 − 0.6 − 1.6` (axis strip 1.2 units
  between board and track); left track rotated 90° at `x = −8 − 0.6 − 1.6`. Track face
  16 × 3.2 units: start spot + 6 slots, slot ≈ 2.1 units.
- Axis strips: `SpecAxis` 16 × 1.2 units, four numbers, one per 2 niches.
- Price markers: 1.6 × 1.0 unit chit at the centre of a fixed "home" niche per segment
  (segment 1 → (6,1), 2 → (2,1), 3 → (3,5), 4 → (1,7), the spots the p.3 picture uses).
- Buyers: `Car` meeples 1.2 × 0.5 units, splayed in a 2×2 grid inside the niche, max 4 shown
  then a counter. Sparks: 0.7-unit squares at the niche's bottom-right corner, counter.
- Windows: frame geometry, `size` 2×1 / 2×2 / 3×3 niches, positioned by (row, col, vertical).
- Quadrant slots: 2 × 2.8-unit face-down card targets just outside each quadrant's outer
  corner (I bottom-left, II bottom-right, III top-left, IV top-right); empty = invisible.
- Panel bounding box ≈ 24 × 24 units → at 420 px a niche is ~35 px, meeple 21 px, axis
  digits 20 px. Smallest text a player must read: axis numbers and track slot letters.

### Factory (`Player`)
- Floor squares at `x = fx + 0.5`, `y = −(fy + 0.5)` in factory coordinates; the main tile's
  top-left at (0, 0); expansions at any integer offset. Tiles centre on their covered cells and
  rotate about that centre with `spec.rotateZ` (printed size constant).
- **Build shelf (developer decision).** During phase 3 only, a dark tray to the right of the
  floor holds a fixed spot for every buildable component, from the literal `SHELF` table in
  `consts.ts` (asserted non-overlapping at load). Rows follow the rulebook's groups:
  departments and step C; step A; step B; step D; mainlines; dealerships
  along the bottom, small to large. Positions never depend on what is left, so nothing reflows.
  Copies of a kind stack in their spot with a count badge; a kind the player cannot build this
  year shows as a faded ghost of its face, and long-press says why. A piece returned to the
  shelf goes to its own spot, unrotated and unflipped. Outside the build the tray, ghosts and
  stacks are gone.
- Hand: a face-down deck just below the floor at its left end, there in every phase; click it
  to browse the cards as a gallery.
- Floor expansion: waits where the shelf stood (the shelf is gone by then) until dragged.
- Selection: a clicked tile gets `COLOR_SELECTED`; invalid tiles `COLOR_INVALID` with the
  reasons in `summary` (long-press).

### Planning office (`PlanningOffice`) and punch clock (`ClockBoard`)
Each is its own section of the real board (`board/office`, `board/clock`), with every printed
space as its own crop placed by the lines measured on the scan (`src/generated.ts`,
`boardGeometry.ts`). A lone brand piece fills its square (0.66); pieces sharing a square stand
centred in a cluster (two side by side, three in a triangle, four in a square), from
`officeSpot`/`officeCount` stored on each piece. The timecard stands on its clock space.

### Research (`ResearchArea`)
The three off-board tracks stacked, each the real die-cut track (16 units long, name tab
hanging below), with the innovation indicator in the gap it occupies and markers on slots in
fixed seat spots (two columns of three across the whole slot, 0.74 wide). The two active tracks live on
the market board (the left one turned so its tab points away from the board); P7 reparents
them.

### Supply (`SupplyArea`)
22 piles in the rulebook's rows — step A, step B, steps C and D, then mainlines and
departments — standing on one baseline per row with one gap, each row centred, the real face
on a pile as tall as the stock and a count tag under it.

## 5. What each prompt focuses

| Decision | Prompt shape | `.focus()` |
|---|---|---|
| P1 research: advance a marker | one `Chit.pick` over all legal markers (own capacity piece + every legal track marker) | market + research + office |
| P2 focus: choose a slot or pass | pick over open `FocusSlot`s + Pass button | office |
| P3 build (setup, yearly) | drag picks from bench stacks to the floor; click-to-select; Add-spec / Rotate / Take-back buttons; Done when valid; then drag the expansion | viewer's factory (+ supply, research for reference) |
| P5 sell: choose dealer + niche | pick over sellable niches (window already covering) **or** drag the dealer's window onto the board (pooled niche targets) | market + viewer's factory |
| P8 card: choose card, then quadrant | pick a playable card from hand → pick a `QuadrantSlot` | viewer's factory + market |

At phone width every one of these needs at most one panel plus a tab switch; the two-panel
cases (sell, build) put the decision on the market/factory and the reference on the other.

## 6. Status colours (reserved, outside both the player palette and the dimension palette)
Players are red, blue, purple, green, yellow (the brand pieces) and the five dimensions are
red, blue, purple, green, orange — so status cannot use any of those.
- Actionable: theme accent (engine default).
- Selected: cyan `#19e6ff`.
- Invalid: magenta `#ff2bd6`.
Player colours: red `#c8302b`, blue `#2c56b8`, purple `#8a5bb5`, green `#6cc24a`,
yellow `#e8c21a`. Dimension colours (tracks, chevrons, badges): speed `#b5342c`,
reliability `#3f6fa8`, design `#4a3a66`, range `#4f6b3a`, safety `#c9892d`.
