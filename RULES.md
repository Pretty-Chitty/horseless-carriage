# Horseless Carriage — rules specification

Source: *Horseless Carriage* rulebook, Splotter Spellen 2022 (`rules.pdf`, 20 numbered pages;
`rules.txt` is the text extraction). Page numbers below are rulebook pages, not PDF pages.
Component data that the rulebook never states in prose was read off the scans in `raw scans/`
and the rulebook's own diagrams; every such fact has an `M` id and says where it was read from.

Every id is one assertion. Quotes are the book's words. "Reading:" marks an interpretation.

---

## C — Components and terminology (p.2–7)

### Time
- **C1** The game covers multiple years; each year consists of 8 phases, in order: 1 Research,
  2 Set focus, 3 Build factory, 4 Print sales brochures, 5 Sell, 6 Finish?, 7 Advance
  expectations, 8 Grow demand. (p.2, p.10–19)
- **C2** Each phase is either upkeep or one or more rounds of player turns; turn order differs
  per phase. (p.2)
- **C3** Player count is 3–5. (p.1)

### Market board
- **C4** The market board is 8×8 niche squares. (p.2)
- **C5** There are four price segments, distinguished by hatching; each segment has one price
  marker showing its current price. (p.2)
- **C6** There are four quadrants of 4×4 niches, numbered I, II, III, IV. (p.2)
- **M1** Quadrant layout (board scan): I = bottom-left, II = bottom-right, III = top-left,
  IV = top-right. In (row, col) with row 1 at the top and col 1 at the left: I = rows 5–8 ×
  cols 1–4; II = rows 5–8 × cols 5–8; III = rows 1–4 × cols 1–4; IV = rows 1–4 × cols 5–8.
- **M2** Price segments (board scan, confirmed against the priced board picture on p.3 and
  against S17/`M30`): let `d = (8 − row) + (col − 1)`, the anti-diagonal distance from the
  bottom-left niche (0…14). Segment 1 (cheapest, bottom-left) = d 0–3 (10 niches); segment 2 =
  d 4–7 (26); segment 3 = d 8–11 (22); segment 4 (top-right, dearest) = d 12–14 (6).
  Segments are totally ordered bottom-left → top-right, which is the order P8.13 walks.
- **M3** Price markers: $6, $4, $3, $2 (p.3 picture; confirmed by the developer, Q1).

### Spec axes
- **C7** Two spec axes lie along the board (bottom and left) and show the spec required to sell
  to buyers in that column/row. (p.2)
- **C8** "Because a slot on the spec axis is bigger than a single niche, there are always 4
  adjacent niches that require the same combination of specs." Each axis has 4 slots of 2
  niches. (p.3)
- **M4** Axis direction (p.3 picture): bottom axis reads low→high left→right; left axis reads
  low→high bottom→top. So niche (row, col) requires `bottomMin + floor((col−1)/2)` of the
  bottom-axis dimension and `leftMin + floor((8−row)/2)` of the left-axis dimension.
- **C9** An axis tile shows four consecutive values starting at the dimension's current
  minimum spec: "the first time, it will be '0 1 2 3'; if a dimension makes a comeback, it will
  increase to '1 2 3 4', etc." (p.18) **Which axis tiles physically exist — Q2.**

### Research tracks
- **C10** There are 5 research tracks: speed, reliability, design, range, safety. (p.2)
- **C11** At any time two tracks are active (next to the board, one per axis) and three are
  off-board. Off-board tracks "only influence the minimum specs on their respective dimension".
  At game start there are no minimum specs. (p.2)
- **C12** Each track shows 6 technologies (slots). A player's research level on a track is
  their research marker's position. Some technologies occur more than once on a track. (p.2)
- **C13** Each track has an innovation indicator, used in phase 7. (p.2)
- **C14** Each slot on a research track "represents the ability to add one spec indicator to
  the station pictured". Two technologies with the same spec indicator are equivalent: "A car
  with only a brake is just as safe as a car with only a window pane (both would have 1 safety;
  a car with both would have 2 safety)." (p.10)
- **M5** Track contents (tracks scan + player aid scan), slots 1–6 from the start spot, with
  the station's manufacturing step and whether the slot bears a punch clock:

  | Track | 1 | 2 | 3 | 4 ⏱ | 5 | 6 ⏱ |
  |---|---|---|---|---|---|---|
  | Speed (red) | Engine B | Horn D | Hub B | Tire D | Fuel tank B | Dashboard C |
  | Reliability (blue) | Battery C | Chassis A | Car body A | Bumper A | Engine B | Chassis A |
  | Design (purple) | Paint C | Windscreen A | Headlamp D | Dashboard C | Car body A | Steering wheel B |
  | Range (green) | Engine B | Radiator A | Tire D | Fuel tank B | Radiator A | Hub B |
  | Safety (orange) | Brake B | Window pane D | Steering wheel B | Bumper A | Headlamp D | Tire D |

- **M6** Punch clocks on research tracks: slots 4 and 6 of every track (tracks scan). No clock
  on slots 1, 2, 3, 5.
- **M7** Each track has a start spot to the left of slot 1 (position 0). (p.8 "start spot",
  tracks scan)
- **M8** Cross-check: the dashboard module "is the fourth possible innovation on the design
  research track and the sixth on the speed one" (p.5) — matches M5.

### Minimum specs, indicators, markers
- **C15** 5 cardboard minimum spec indicators, placed on the board's Minimum Specifications
  spaces during the game. (p.4) **Two-sided 1/2? — Q3.**
- **C16** 5 wooden innovation indicators, one per research track. (p.4)
- **C17** One obsolescence marker, pointing at the active track that goes off-board next year. (p.4)

### Buyers and cars
- **C18** Wooden car meeples in three types: normal car, sports car, truck. On the market board
  they are buyers; placed on a mainline they track production. (p.4)
- **C19** Each buyer requires, for the active dimensions, the spec read from the axes; and for
  each off-board dimension, that dimension's minimum spec. (p.4)
- **C20** Supply of car meeples is not stated. Reading: unlimited. **Q4.**

### Brands
- **C21** 5 × 10 wooden brand pieces (one colour per player). (p.4)

### Factories
- **C22** Each player has a factory made of factory floor tiles; every floor tile has a
  preprinted loading bay with a 'Keep clear' zone. (p.4)
- **M9** Main factory floor tile (factory pieces scan, grid pitch ≈153 px): 12×12 squares, with a
  5×5 loading bay in one corner. The keep-clear line runs along **one** outer edge of the bay,
  exactly as wide as the bay (the main tile's bay is top-right with the line on the top edge).
- **M10** Floor expansion tile (same scan): 6×8 squares with a 2×2 loading bay in one corner;
  the keep-clear line runs along the bay's outer edge on the **short (6-wide) side**.
- **M11** Loading bays are not buildable squares (they are not black). (p.12 "must cover only
  black square(s)"; p.4 picture)

### Factory tiles
- **C23** Five kinds of factory tile: mainlines, dealerships, departments, technology stations,
  spec indicators. (p.4)
- **C24** Mainlines come in three types (normal car, sports car, truck); the assembly capacity
  track shows how many cars each mainline constructs per year. (p.5)
- **C25** Dealerships sell cars; each positions itself with a market window; a player has at
  most three dealerships. (p.5)
- **C26** Departments: research, planning, marketing. A player has at most four marketing
  departments. (p.5)
- **C27** 17 technology stations, in four groups by manufacturing step: A structural,
  B essential (drive train, steering), C factory options, D after-market options. (p.5)
- **C28** Each station increases specs on one or more dimensions; the possible contributions
  are printed on the station. (p.5)
- **C29** Spec indicators are placed pointing at a station to show which technologies are
  realised on it; they "correspond in manufacturing step (A, B, C, D)" and show a dimension.
  "A technology station must always have at least one spec indicator." (p.5)
- **M12** Station table (steps and slot badges from the p.8 inventory picture and player aid;
  footprints measured on the p.8 inventory at ≈88 px/square, cross-checked against the p.14–16
  factory pictures for research, planning, paint, brake, horn, window pane, engine; copies =
  tiles per player-colour set in the p.8 inventory). Footprint is width×height as printed;
  tiles may be rotated (p.12 says nothing against it; the p.14 pictures show rotated tiles).

  | Station | Step | Footprint | Indicator slots (track: slot) | Copies / set |
  |---|---|---|---|---|
  | Chassis | A | 3×4 | Rel 2, Rel 6 | 1 |
  | Car body | A | 3×3 | Rel 3, Des 5 | 1 |
  | Radiator | A | 2×3 | Rng 2, Rng 5 | 2 |
  | Windscreen | A | 2×3 | Des 2 | 2 |
  | Bumper | A | 4×2 | Rel 4, Saf 4 | 2 |
  | Engine | B | 4×4 | Spd 1, Rng 1, Rel 5 | 1 |
  | Hub | B | 3×4 | Spd 3, Rng 6 | 1 |
  | Fuel tank | B | 4×2 | Rng 4, Spd 5 | 1 |
  | Steering wheel | B | 3×3 | Saf 3, Des 6 | 1 |
  | Brake | B | 2×2 | Saf 1 | 2 |
  | Dashboard | C | 4×2 | Des 4, Spd 6 | 1 |
  | Paint | C | 2×3 | Des 1 | 2 |
  | Battery | C | 2×2 | Rel 1 | 2 |
  | Tire | D | 3×3 | Rng 3, Spd 4, Saf 6 | 1 |
  | Headlamp | D | 2×3 | Des 3, Saf 5 | 1 |
  | Window pane | D | 4×2 | Saf 2 | 2 |
  | Horn | D | 2×2 | Spd 2 | 2 |

  25 tiles per set; 17 types; the 30 badges fill the 5×6 track slots of M5 exactly.
  Names in italics are not in the rulebook: the book names brake, paint, engine, radiator,
  tires, fuel tank, dashboard module, window pane; the rest are read from the art.
- **M13** Mainline footprints (factory pieces scan and p.8 inventory stack widths): normal car
  4×3, sports car 5×3, truck 6×3. Each mainline tile has four triangular sectors, one per step,
  each owning one edge of the tile: A = bottom edge, B = right, C = left, D = top (as printed;
  the tile rotates with its sectors). The back is the mirror image (B and C swapped), so a
  mainline may be placed either side up (developer). Copies per set: 2 of each type.
- **M14** Dealership footprints (factory pieces scan, p.16 pictures): each player's three
  dealerships are 4×3, 4×4 and 5×4, each with its own name (green: Luton 4×3, Dunstable 4×4,
  Ellesmere Port 5×4). **Same three sizes for every colour? — Q5.**
- **M15** Department footprints: research 3×3, planning 2×3, marketing 4×3 (factory pieces
  scan; p.14/p.16 pictures agree).
- **M16** Spec indicator footprint: 1×1, printed with the dimension's chevron and
  abbreviation on the hatching of one manufacturing step (factory pieces scan).
- **M17** Research and planning departments in the shared supply: the p.8 inventory shows
  two stacks of 3 of each per set. **Count per set — Q6.**
- **M18** Spec indicators are an unlimited supply, created as needed (developer, Q7).

### Market windows
- **C30** Each player has 9 market windows: three sizes for each of three dealerships. (p.6)
- **C31** Sizes: small 2×1, medium 2×2, large 3×3 (niches). (p.15)

### Spark markers
- **C32** Spark markers sit on the market board and generate buyers each year; they come in the
  three car types and can be reversed to show two sparks. (p.6, p.19)

### Cards
- **C33** Each player has a deck of 17 cards showing a 4×4 quadrant with car types to be placed,
  and a number in the bottom-left corner: the year from which the card may be played. (p.6, p.8)
- **C34** There are also neutral market growth cards, placed next to the board. (p.6)
- **C35** Many items show punch-clock symbols; each reduces the timecard marker on the punch
  clock track by one step. "If the marker would reach 0 on the track, flip it over instead; the
  game will soon finish." (p.6)
- **M19** Player deck (scan of the blue deck; cell = (row, col) within the 4×4, row 1 at top,
  col 1 at left, in the card's upright orientation with the number at bottom-left):

  | # | Year | Clocks | Sparks |
  |---|---|---|---|
  | P1 | 3 | 3 | car (2,2), car (4,2), car (4,3) |
  | P2 | 2 | 2 | car (2,3), car (3,2) |
  | P3 | 1 | 1 | car (4,2) |
  | P4 | 3 | 0 | car (2,4), car (3,4), car (4,1) |
  | P5 | 4 | 1 | car (1,3), car ×2 (1,4), car (2,3) |
  | P6 | 1 | 0 | car (4,3) |
  | P7 | 2 | 1 | truck (3,2) |
  | P8 | 1 | 0 | truck (4,3) |
  | P9 | 1 | 0 | sports (3,4) |
  | P10 | 3 | 1 | sports (1,4), sports (2,3), car (3,1) |
  | P11 | 3 | 3 | truck (2,1), truck (2,2), truck (4,1) |
  | P12 | 2 | 4 | — (no sparks) |
  | P13 | 2 | 0 | car (3,1), car (3,2) |
  | P14 | 2 | 2 | truck (1,1), truck (3,1) |
  | P15 | 2 | 2 | sports (1,2) |
  | P16 | 3 | 3 | sports (1,3), sports (2,4), car (3,2) |
  | P17 | 3 | 1 | truck (3,3), truck (4,2), truck (4,4) |

  "car ×2" is the double-car icon: two sparks of that type on that niche. Cards free of trucks
  and sports cars: P1–P6, P12, P13 = 8, matching V1. **Are all five decks identical? — Q8**
  (the rulebook's red example card on p.18 does not match P13; the developer confirms the decks
  are identical, so the picture is prototype art).
- **M20** Neutral deck (scan): 7 cards, no year, no clocks, one buyer each:
  N1 car (4,1); N2 car (3,1); N3 car (3,2); N4 car (2,1); N5 car (4,3); N6 car (4,2);
  N7 truck (4,1). Exactly one shows a truck, matching V1's "the neutral market growth card".
- **M21** Card-to-quadrant mapping: a card's cell (r, c) is the niche (r, c) of the quadrant it
  is played next to, in the same orientation as the board — "the card will always be aligned
  with the board as shown" (p.19 example: red's card with sparks at (3,2),(4,2) puts sparks on
  quadrant III's (3,2),(4,2)). Confirmed by M30. **Q9.**

### Planning office and tracks (p.7, board scan)
- **C36** Gantt chart track: amount of planning accumulated per player. **M22** Spaces 0–20;
  a punch clock on space 10.
- **C37** Focus track (top) and historical focus track (bottom): slots 1–5. "Engineering →
  ← Sales": slot 1 is the highest engineering focus, slot 5 the highest sales focus (p.13
  example: green on slot 1 "is first in engineering order", red on 2 is second).
- **C38** Assembly capacity track: per-player mainline capacity. **M23** Spaces 1–5; a punch
  clock on space 5; nothing beyond 5.
- **C39** Wealth accumulation track: score. **M24** 0–50 with +50/+100/+150 laps (a plain
  counter in the port).
- **C40** Punch clock track: time left. **M25** Spaces 40 down to 1; dotted start marks under
  40 (5 dots), 32 (4 dots), 24 (3 dots) = starting space for 5 / 4 / 3 players.
- **C41** Minimum Specifications area: five boxes, Speed, Design, Reliability, Safety, Range,
  for the minimum spec indicators. (board scan)

---

## S — Setup (p.8)

- **S1** Place the board; place the spec axis markers so both axes read '0 1 2 3'.
- **S2** Each player chooses an industrialist and takes its player aid, deck of 17 cards,
  9 market windows, 3 dealership stations, 4 marketing departments, brand pieces, and a main
  factory floor tile.
- **S3** Shuffle the 5 research tracks. The first drawn goes at the bottom of the board under the
  bottom spec axis; the second on the left of the board next to the left spec axis.
- **S4** The obsolescence marker points to the bottom research track.
- **S5** On each of the two active tracks, every player's research marker starts on the first
  technology station (slot 1).
- **S6** The other three tracks are drawn one by one and placed off-board, vertically adjacent
  (this order is the "top" order used by P7.9). On each, every player's research marker starts on
  the start spot (position 0).
- **S7** Each research track's innovation indicator starts between the start spot and slot 1
  (position 0). The minimum spec indicators start off the board.
- **S8** Randomly determine player order. Place the first player's brand piece on historical
  focus slot 1, the second on slot 2, etc.
- **S9** Gantt chart track: the reverse order — "the last player gets 1 Gantt chart, the
  one-but-last player 2 Gantt charts, etc." (first player gets N).
- **S10** Give each player one Research and one Planning department; "They must immediately
  place these in their factory following the normal placement rules." (A decision: P3 rules
  apply; see P3.)
- **S11** Place 6 floor expansion tiles per player; return the rest to the box.
- **S12** Each player's brand piece starts at the start of the Assembly Capacity track (space 1).
- **S13** Place the timecard marker, punch-clock face up, on the punch clock track at the space
  for the player count (M25).
- **S14** Draw (players + 1) neutral cards; place buyers as shown on the cards on the matching
  niches of quadrant I.
- **S15** Place the $6 price marker in the bottom-left price segment. (All setup buyers land
  in segment 1 — see M30. Other markers are placed by the first P8.13.)
- **S16** Place the technology stations, mainlines and additional departments on the table as a
  shared supply; for every player colour not in the game, return one set (M12, M13, M17) to
  the box. The shared supply is therefore N sets.
- **S17** "For the first game, we advise to take out the sports cars and trucks (see the
  introductory rules)."

---

## P1 — Research (p.10)

- **P1.1** Turn order: highest engineering focus first, then descending engineering focus.
  Reading: in this phase the markers are on the **historical** focus track (they are moved
  there at the end of P3 and the focus track is empty until P2), so the order is the historical
  track order; in year 1 that is the setup order (S8).
- **P1.2** On their turn a player performs all of their research actions: one action per
  research department in their factory.
- **P1.3** Each action moves one research marker forward one step; the marker is either the
  player's own marker on the Assembly Capacity track, or any research marker (own or another
  player's) on any of the five research tracks.
- **P1.4** A player may not move a marker a second step that they have already moved this
  phase. Another player may move a marker that someone else already moved this phase, if they
  have not moved it themselves.
- **P1.5** A marker cannot move beyond the last space (slot 6; capacity 5). Reading: such a
  marker is not a legal choice; a player with no legal move for an action forfeits it. **Q10.**
- **P1.6** If a marker reaches a space with a punch clock (M6, M23), move the timecard down one
  step.
- **P1.7** Research grants access to stations (P3.10) and drives P7; it does not change cars
  directly.

## P2 — Set focus (p.11)

- **P2.1** Preparation: all focus markers are on the historical focus track at the start.
- **P2.2** Turn order: most Gantt charts first, then descending Gantt charts; ties broken by
  higher engineering focus (lower historical slot). Each player acts or passes exactly once.
- **P2.3** Action: place the focus marker on any open slot of the focus track AND set the Gantt
  chart marker to 0; or pass (keeping the Gantt charts).
- **P2.4** Slots numbered higher than the number of players are not available.
- **P2.5** End of phase: markers still on the historical track move to the focus track
  preserving relative order — leftmost historical marker to the leftmost open slot, etc.
- **P2.6** The resulting focus track order is the engineering order (slot 1 first) and sales
  order (slot 5 first) for P3, P4/P5, P6 and P8 this year.

## P3 — Build factory (p.12–14)

- **P3.1** Order of play: "It is advised to do most of this phase concurrently"; conflicts are
  resolved in engineering-focus order (slot 1 first). The conflict is the shared supply (P3.7)
  and patent access (P3.11) only; nothing a player builds otherwise affects another's legality.
- **P3.2** A player may place any number of tiles, each validly placed.
- **P3.3** Tiles placed in previous years can never be moved or removed. (Tiles placed this year
  may be rearranged until the player ends their turn.)
- **P3.4** Adjacent = two tiles touch on at least one side of one square.
- **P3.5** Must fit: fully on the floorplan, grid-aligned, may span floor tiles, covers only
  black squares, no overlap (and therefore not on a loading bay, M11).
- **P3.6** Must be adjacent to a loading bay or to a previously placed tile; from every tile a
  path must exist to a loading bay without crossing unbuilt area (connectivity through tiles to
  a bay).
- **P3.7** Must be available: the shared supply of stations, mainlines and research/planning
  departments is finite; when a tile type runs out it cannot be built. Dealerships (3) and
  marketing departments (4) are per player and also finite.
- **P3.8** Each mainline must be adjacent to at least one dealership; each dealership must be
  adjacent to at least one mainline. Any number of mainlines may be built.
- **P3.9** Each marketing department must be adjacent to one or more dealerships. Research and
  planning departments have only the general requirements.
- **P3.10** Technology access — own research: the player's marker is on or past a slot that
  pictures the station (on any track). Access is per slot: it grants that slot's indicator
  (dimension, station).
- **P3.11** Technology access — patents: ranked by engineering focus, rank k (1 = highest) has
  access to every slot that at least k *other* players have researched (markers on or past it).
  So rank 1: anything anyone else researched; rank 2: slots reached by ≥2 others; rank 3: ≥3
  others; rank 4: ≥4 others (never in a 4-player game); rank 5: own research only. (p.13
  worked example: red, 2nd, reaches engine (3 others) and radiator (2 others) but not tire/fuel
  tank (1 other); blue, 4th, "can only build what they researched themselves".)
- **P3.12** Patents also give access to additional spec indicators on stations already built.
- **P3.13** Manufacturing zone: stations and indicators carry the hatching of their step; a
  mainline's four sectors are the four steps. A connected area of one step's hatching is a
  manufacturing zone, made of stations, indicators and one *side* of one or more mainlines.
  Each mainline can be in up to four zones, one per side. Reading: a tile is in a mainline's
  zone X if it is edge-adjacent to the mainline across the mainline's edge X (M13).
- **P3.14** Every zone must include a mainline: stations and indicators may not be placed so
  that they do not connect to a mainline.
- **P3.15** A station must be unique within its zone; any placement that puts two identical
  stations in one zone is illegal. Identical stations in different zones are fine, but access
  (P3.10/11) is needed in each year a copy is built.
- **P3.16** Each station must have at least one adjacent spec indicator pointing at it; the
  player must have access (P3.10/11) to that indicator's slot when placing it. With access to
  several slots of one station they may add all, but need not add more than one.
- **P3.17** Reading of C14 + M12 badges: each slot is a distinct indicator; a station may carry
  one indicator per slot that pictures it (e.g. a radiator may carry two range indicators, from
  Rng 2 and Rng 5), never two indicators from the same slot. **Q11.**
- **P3.18** Existing stations keep working with their indicators even if access is later lost;
  without access a second copy cannot be built.
- **P3.19** Upgrading: a station built earlier may receive an indicator the player now has
  access to, if there is a legal square for it.
- **P3.20** An indicator must be in the same zone as the station it points at (its hatching is
  the step; it is adjacent to the station). Reading: pointing = chevron toward an orthogonally
  adjacent square of the station.
- **P3.21** Floor expansion: after placing all stations in the existing factory, the player
  must place one floor expansion tile if any remain. Reading: the expansion is placed after
  this year's building, so nothing is built on it until next year. **Q12.**
- **P3.22** The expansion must be adjacent (edge-adjacent) to the existing factory and aligned
  with the existing square grid; it may be rotated (M10 orientations).
- **P3.23** Keep clear: the squares of table directly bordering a keep-clear line (a 1-deep
  strip as wide as the bay, outside the tile on the bay's keep-clear edge, M9/M10) must remain
  empty table space — no floor tile of the existing or new factory may cover them. Bays opening
  onto an area fully enclosed by factory tiles are allowed.
- **P3.24** After a player's build turn, their focus marker moves down to the historical focus
  track.
- **P3.25** Setup placement (S10) follows the same rules with a bench of exactly one research
  and one planning department and an empty 12×12 floor.

## P4 — Print sales brochures (p.15)

- **P4.1** Admin phase; no decisions.
- **P4.2** Gantt charts: each player's marker advances by the number of planning departments
  in their factory.
- **P4.3** Each time a marker moves onto or past space 10 (punch clock), move the timecard down
  one step. At the end of the track (20) excess is lost.
- **P4.4** For each dealership (placed this year or earlier), publish: specs, type(s) and
  volume, and market stretch.
- **P4.5** A mainline's spec on a dimension = the number of that dimension's spec indicators
  connected to the mainline (in any of its zones).
- **P4.6** A dealer's specs = its single adjacent mainline's specs; with several adjacent
  mainlines, per dimension the lowest.
- **P4.7** Type and volume: the dealer sells each type among its adjacent mainlines; each
  mainline produces (assembly capacity) cars of its type this year. (p.15 example: a dealer on
  two car mainlines "can sell twice as many cars as purple's current assembly capacity".)
- **P4.8** Market stretch = number of marketing departments adjacent to the dealer: 0 → small
  (2×1), 1 → medium (2×2), 2 → large (3×3). A marketing department adjacent to several dealers
  benefits each. **3 or 4 adjacent — Q13** (reading: large).
- **P4.9** A dealer whose specs do not meet or exceed the minimum spec on all five dimensions,
  including off-board ones, sells nothing this year and takes no window.

## P5 — Sell, sell, sell! (p.16–17)

- **P5.1** Turn order: highest sales focus first (focus slot 5, then 4, …). After all players
  have had a turn, another round in the same order; rounds continue until all players have run
  out of sales options.
- **P5.2** On a turn the player must activate one dealer to sell cars in one niche.
- **P5.3** The dealer must meet the minimum off-board specs (else no sales by it this year —
  P4.9).
- **P5.4** If the dealer's market window has not been placed, place it first.
- **P5.5** The window must be placed so that no niche inside it exceeds the dealer's specs on
  either active dimension (M4).
- **P5.6** The window may stick out past the board. The 2×1 window may be horizontal or
  vertical.
- **P5.7** Windows may overlap other windows, including the same player's. Once placed a
  window may not be moved or rotated.
- **P5.8** Then sell all cars to all buyers in one niche inside the window, limited by capacity
  of the correct type (P4.7): if capacity is short, sell as many as capacity allows.
- **P5.9** Each sold buyer scores the price marker of the niche's segment; trucks +$1, sports
  cars +$2. Sold buyers leave the board.
- **P5.10** Capacity is tracked per mainline: each car sold is placed on a mainline of its type
  adjacent to the dealer; a mainline cannot exceed the assembly capacity this year. (So a
  mainline shared by two dealers shares its capacity.)
- **P5.11** If a niche lies inside two of the player's windows, the player chooses which dealer
  sells; capacities are not combined. Two dealers of one player may therefore sell to the same
  niche on two successive turns.
- **P5.12** If the dealer can sell several types present in the niche, all of them must be sold
  in the same turn.
- **P5.13** Selling is obligatory if possible; passing is not allowed. A player with no possible
  sale is out for the remaining rounds (they have "run out of sales options").
- **P5.14** Across rounds a player may place several windows before selling from earlier ones,
  or sell everything from one window first.
- **P5.15** End of phase: all windows return to their owners; sold cars return from mainlines
  to stock; remaining buyers and all spark markers stay on the board.
- **P5.16** The book puts no limit on where a window goes beyond P5.5–P5.7: it need not cover a
  buyer. A window placed with no buyer inside that it can sell to sells nothing that turn. **Q14.**

## P6 — Finish? (p.17)

- **P6.1** Admin phase.
- **P6.2** The game ends if, at the start of this phase, the timecard marker has already been
  turned over.
- **P6.3** The game also ends in year 7, when no floor expansions were available to place in
  phase 3 (each player has 6, S11, one is placed per year, P3.21).
- **P6.4** Winner: highest wealth; ties go to the tied player with the highest sales focus
  (focus track slot).

## P7 — Advance expectations (p.18)

- **P7.1** Admin phase; no decisions.
- **P7.2** Remove the active research track the obsolescence marker points to; place it under
  the off-board tracks (it becomes the bottom one). Remove its spec axis.
- **P7.3** Increase that dimension's minimum spec by 1 (place its cardboard indicator; the second
  time, turn it over).
- **P7.4** Move that track's innovation indicator one step forward.
- **P7.5** From now on only cars with at least the minimum spec on that dimension can be sold.
- **P7.6** Point the obsolescence marker at the remaining active track.
- **P7.7** The new dimension is chosen from the off-board tracks excluding the one just removed;
  the one with the most innovation enters.
- **P7.8** Innovation of a track = sum over all research markers ahead of its innovation
  indicator of (spaces ahead): 1 for the first space past the indicator, 2 for the next, etc.
  (p.18 example: Reliability three markers one ahead = 3; Speed 1 + 3 = 4; Design 2 + 2 = 4.)
- **P7.9** Ties: the tied track whose furthest marker is furthest past its indicator; if still
  tied, the top track in the off-board stack (S6/P7.2 order).
- **P7.10** Place the chosen track on the empty axis with the axis tile starting at that
  dimension's current minimum spec (C9).

## P8 — Grow demand (p.19)

- **P8.1** Two sub-phases: each player plays a card (engineering order, slot 1 first); then one
  player processes market growth.
- **P8.2** Each player plays one card face down next to one of the four quadrants.
- **P8.3** A card may be played only if the player has placed at least (card year) floor
  expansions.
- **P8.4** Played cards are discarded and never return. Reading: a player with no playable card
  plays none. **Q15.**
- **P8.5** Quadrant by quadrant (I, II, III, IV) reveal the cards played there; for each card
  place a spark marker of the card's car type on the niche indicated (M21); a double icon
  places two sparks. A niche can hold any number of sparks.
- **P8.6** For each card showing punch clocks, move the timecard down that many steps.
- **P8.7** Sparks generate buyers: every spark marker on the board (new and old) generates one
  buyer of its type on its niche, up to a maximum of 2 buyers per spark of that type on that
  niche: `added = clamp(2·sparks − buyers, 0, sparks)`. (Example: 2 sparks: +2 if 0–2 buyers,
  +1 if 3, +0 if 4.)
- **P8.8** Neutral buyers: draw a neutral card and place its buyer in quadrant II; draw another
  for quadrant III; then draw (players − 2) cards, each placing a buyer in quadrant I. Neutral
  buyers ignore the spark cap.
- **P8.9** Then shuffle all neutral cards back into one deck.
- **P8.10** Set prices: walk the segments from top-right (segment 4) to bottom-left; the highest
  segment containing any buyers gets the $6 marker, the next highest with buyers the next
  highest price, and so on; empty segments are skipped (and keep no marker).
- **M30** Check: every neutral-card buyer position (M20) falls in quadrant I's d 0–3 band, so at
  setup only segment 1 has buyers and S15 is exactly what P8.10 would do.

## V — Introductory rules (p.20)

- **V1** Remove all cards showing trucks or sports cars (8 player cards remain each; the one
  neutral truck card is removed, 6 neutral cards remain).
- **V2** Every mainline produces normal cars, "even the bigger mainlines depicting trucks or
  sports cars".
- **V3** Truck and sports-car meeples and sparks are not used.

---

## UX — build-phase interaction model (developer, 2026-10-17)

These are not rules of the game but decisions about how P3 is played at the table; code cites
them like rules.

- **UX1** Building is free arrangement: the player drags components from their bench onto
  their factory floor and may drag any component that is not yet locked (placed in an earlier
  year, P3.3) to any square, including invalid ones.
- **UX1a** Any piece may be dropped at any position where it lies on floor squares (the drop
  target is the piece's own footprint), including overlapping others; it is then shown invalid.
  Spec indicators may only be dropped on squares edge-adjacent to their own station, though
  they may overlap something there. Overlapping pieces are lifted so none is hidden: smaller
  always above bigger, and among equal sizes invalid above valid. Invalid pieces are outlined;
  a selected piece can be taken back.
- **UX2** Invalid placements are shown, not prevented: every tile that currently breaks a P3
  requirement is highlighted as invalid, with the reason in its summary.
- **UX3** The turn can only be ended when no piece is invalid (all of P3.5–P3.20 hold for the
  whole arrangement). Until then the end-turn action is withheld.
- **UX4** Spec indicators are never dragged in from a bench. Selecting a station on the floor
  offers a button per indicator the player may add to it ("Add Range spec", one per accessible
  slot not already on that station, P3.16/P3.17/P3.19). The new indicator appears next to the
  station, always points at that station, and can then be dragged like any unlocked piece.
- **UX5** The same model serves the setup placement (S10/P3.25) and the expansion placement
  (P3.21), which is a drag of the expansion tile to a grid-aligned spot.
- **UX7** 🎨 A dealer's market windows are not kept as a pile on the player's panel; the window
  appears on the board when placed (P5.4) and is removed at the end of phase 5. The dealer tile
  on the factory shows its published size instead (C30).
- **UX8** 🎨 A sold buyer moves from its niche onto the mainline that built it (P5.10), as in the
  physical game, and returns to stock at the end of phase 5 (P5.15).
- **UX9** A window is placed by dragging it onto a drop spot named by the top-left niche it will
  cover (UX14). Every placement within the dealer's specs is offered, overhanging ones (P5.6)
  included, whether or not it covers a buyer.
- **UX10** 🎨 Price markers are not separate pieces: each segment's current price is printed on
  a few niches along the middle of its band, in grey (C5, P8.10).
- **UX6** Building starts from an "Add" button that opens a gallery of every component
  the player may build this year, one entry per kind captioned with its size and how many are
  left (the shared supply for stations, mainlines and research/planning departments; the
  player's own limit for dealerships and marketing). Picking one puts it on the first free
  spot that touches a loading bay or a built tile and selects it; the gallery reopens so
  several can be added in a row. At setup the two starting departments simply start on the
  floor (S10). Players build concurrently; afterwards the shared supply is trued up in
  engineering-focus order (P3.1, P3.7) and a player the supply ran short on rebuilds.
- **UX11** This year's floor expansion (P3.21) is part of the build turn: it starts at the
  factory's first legal spot, can be dragged only to legal spots, rotated in place and flipped
  (the bay mirrors), shows invalid if a rotation leaves it in a bad spot, and must be legal
  before Done. It cannot be built on until next year (Q12).
- **UX12** Research markers stand at a fixed spot per seat on every track space. A research
  action picks a space; if several markers there could move, a small gallery asks which.
- **UX13** A dealership's published specs (P4.4) are shown as coloured cubes on the tile.
- **UX14** In a sell turn the player's unplaced market windows wait above the board at their
  real size; dragging one onto the board places it (only legal spots that cover a buyer the
  dealer can serve accept it; a 2×1 window can be turned), or the player clicks a niche inside
  a window already placed.

---

## Q — Open questions

| Id | Question | Current reading |
|---|---|---|
| Q1 | ✅ resolved 2026-10-17: price markers are $6, $4, $3, $2. | [6, 4, 3, 2] |
| Q2 | ✅ resolved: no limit on a minimum spec; axis tiles are drawn (ParameterizedCanvas) for any min. | min…min+3, uncapped |
| Q3 | ✅ resolved with Q2: minimum spec is uncapped; the indicator is drawn with any number. | Uncapped |
| Q4 | Car meeples and spark markers: treated as unlimited (not raised as a problem by the developer). | Unlimited |
| Q5 | Does every colour's dealership set have the same three sizes, 4×3, 4×4 and 5×4? | Yes |
| Q6 | ✅ provisional: 6 research and 6 planning per colour set ("fine for now, exact count later"). | 6 and 6 per set |
| Q7 | ✅ resolved: spec indicators are unlimited, created as needed. | Unlimited |
| Q8 | ✅ resolved: all five decks are identical apart from colour (the p.18 picture is not to be trusted). | Identical |
| Q9 | ✅ answered by the book (p.19): "Note the card will always be aligned with the board as shown." | Unrotated |
| Q10 | A research action with no legal marker (all candidates at track end) — forfeited? | Forfeited |
| Q11 | ✅ resolved: yes, a station may carry one indicator per slot that pictures it. | Yes, one per slot |
| Q12 | ✅ answered by the book (p.14): "After placing all stations in the existing factory, a player must place one floor expansion." | After building |
| Q13 | Market stretch with 3 or 4 adjacent marketing departments? | Large |
| Q14 | Must a newly placed window cover a buyer the dealer can sell to? The book never says so (p.16–17); the developer ruled 2026-11-03 that it need not. | Any placement within specs |
| Q15 | A player with no playable card in P8 — skip? | Skip |
| Q16 | Which step hatching do the two scanned "Rng" indicators have (one chevron is blue-grey on B hatching, one green on A)? Is chevron colour always the dimension? | Colour = dimension |
| Q17 | ✅ reading applied 2026-11-02 (audit F1): two mainline sides of the same step that touch are one zone, since a zone is "a connected area of one type of hatching … one side of (one or more) mainlines" (p.13). | Joined |
| Q18 | ✅ reading applied 2026-11-02 (audit F3): a floor expansion is never turned over; its back is blank, so only rotations are offered. | Rotate only |
| Q19 | Do the two starting departments (S10) come out of the shared department supply? The book's "additional departments" (p.8) reads either way. | Yes, from the supply |
