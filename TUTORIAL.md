# Tutorial: How to play Horseless Carriage

A scripted first game for three: you and two bots, **Robin** and **Sam**, on the rulebook's
**introductory rules** (no trucks or sports cars: the book "strongly advises" them for a first game).
The lesson plays two whole years with you making every real decision, then explains the end of the game and
the full rules' trucks and sports cars, and hands the same match over (`end: "continue"`).

## The narrator

The company's founder, in the voice of the rulebook's opening speech: bombastic, impatient, proud of
"our brakeless bangers", sure that "if I can dream it, you can do it". They address you as the new
director of the works. Short sentences, one clause each, for the voice.

## Outline

Rewritten on 2026-11-03 after the developer's review of the first script ("here's a thing and here's a thing… not
enough of explaining WHY things happen… far too few steps in a game this complicated"): 132 steps, two full years.
Every stretch is split into short steps, each with its reason; a result step follows every consequential tap; each
bot's part of a turn is its own held step; terms are taught where they are first used (price segments at the first
sale, quadrants with the market cards, patents when Sam takes slot 1).

**The table** (names things; rules come when they are used): welcome, goal, chain (buyers want specs, specs come
from stations, stations from research), market, axes, axes-why, tracks, tracks-slots, tracks-markers (active tracks
start on slot 1: the brake and the battery are everyone's), office (order is money), factory, departments, supply,
cards.

**Setup**: place-departments, confirm-setup, others-setup.

**Market** also has market-types (cars only in this first game; trucks and sports cars in the full one).

**Year 1** — research (why first), research-rules (any marker, patents), research-capacity, research-clock,
research-space (why reliability), research-marker, research-done, Robin's step (safety), Sam's step (design, off
the board: the bet) · focus, focus-patents (what slots 1, 2 and 3 may copy; supply order), focus-gantt, focus-do (slot 1: supply and patents), Robin (slot 3: first pick of four
buyers), Sam (passes, keeps the chart) · build, build-rules, mainline (add, place, the four sides), dealer (add,
rotate, place, dealer-done), zones, zones-rule, chassis (add, place), spec (add, place, spec-done: how a car gets
its numbers), paint-why (slot 1's patents reach Sam's design slot; design is not on the market yet, and next year we may
not hold slot 1), move-dealer (this year's pieces still move: the dealer slides down off side C), paint (add, rotate,
place, spec from Sam's slot, place spec), paint-done (design one, worth nothing until design enters),
marketing-why, marketing (add, place, under the dealer), expansion, done, confirm, others-build,
others-build-look (Robin's three stations), others-build-robin-specs (one indicator, one point),
others-build-sam (Sam's tab: brake, battery, a second research department), others-build-research (one step per
research department) · brochures (what a brochure is), brochures-specs, brochures-reach · sell (order), sell-price (the four
bands, one at a time), sell-price-why (the $6 marker, and why the corner's price will fall), sell-window-rule,
Robin's sale (held on the window, then the sale), Sam's, sell-window, sell-niche, confirm, sold · finish ·
expectations (safety leaves), expectations-min (minimum 1: Robin and Sam built brakes, you did not),
expectations-new (Sam's design enters), expectations-arrow · grow (quadrants one at a time), grow-neutral (the black cards, dealt face down before anyone plays),
grow-cards (your hand full screen; one card's sparks ringed), grow-sparks, grow-clocks (the card's clock box),
grow-year (the year badge in the card's corner), play-card, play-quadrant, confirm, others-cards, reveal-sparks, reveal-buyers, reveal-neutral,
reveal-prices (the corner's price fell to $4, as warned).

**Year 2** — year-two (your dealer cannot sell), year-two-why (the brake was always yours to build) · y2-research
(reliability to the car body: the $6 buyers at (4,2) ask for reliability 2), confirm, done, Sam's two steps (design,
then free), Robin's two steps (range, then free; one player never moves one marker twice, another player may) · y2-focus (Sam first: the kept
chart), Sam takes slot 1 (patents), y2-focus-do (tie → last year's engineering slot; take the sales end), Robin
(slot 2) · y2-build (the expansion is floor, last year's tiles are fixed), brake (add, place on the B side, spec,
place spec), car body (add, place beside the chassis: a station joins a zone through another station, spec, place
spec), y2-spec-done (reliability 2, safety 1, design 1), y2-second-why (two $6 buyers, one car a year), a second
mainline on last year's expansion (add, rotate ×2, place: C side on the paint, a corner on the dealer), y2-shared-dealer (a dealer publishes
the lower of its mainlines: reliability and safety drop to zero), y2-shared-zones (design still reads one: the paint between the lines serves both; from slot 3 we could not build it
today), chassis (a second copy in another zone, turned along the top), brake (side B, the left), y2-battery-why (the
battery joins the paint's zone behind its indicator, so it serves both lines), battery, y2-second-done (the cubes come back), y2-done-build (the expansion's rules), confirm, others-build,
y2-others-build-look (Robin's second mainline), y2-others-build-sam, y2-others-build-yours · y2-brochures · y2-sell-window (you sell first; one niche → the sale is automatic), confirm,
y2-sold ($12: one car from each mainline through one dealer; the capacity track), Robin's sale, Sam's, y2-sell-rounds · y2-finish ·
y2-expectations (reliability leaves; everyone meets the minimum this time), y2-expectations-tie (range and safety tied;
the higher track wins), y2-expectations-new (range enters; the arrow turns to design) · y2-others-cards (engineering order: the bots first), y2-grow (a year-2
card), y2-play-quadrant, confirm, y2-reveal.

**The end**: year-three (judgement: what to research, when to add a mainline or capacity, which slot, when to
pass), game-end, full-game, finish-tutorial (`end: "continue"`).

## Pieces

| Piece / printed area | Step that rings it |
|---|---|
| Market board, niches, buyers | market, chain |
| Quadrants | grow (one at a time), play-quadrant |
| Price segments, price markers | sell-price (band by band), sell-price-why, reveal-prices |
| Spec axes | axes, axes-why |
| Research tracks (active and off-board), slots, start spots | tracks, tracks-slots, tracks-markers |
| Research markers (yours, Robin's, Sam's) | tracks-markers, research-space, research-done, the bots' research steps |
| Innovation indicators | expectations-new |
| Obsolescence marker | others-research-sam, expectations, expectations-arrow, y2-expectations |
| Minimum specifications | expectations-min, y2-spec-done, y2-expectations |
| Planning office: Gantt, focus, historical focus | office, departments, focus, focus-gantt, y2-focus, y2-focus-do |
| Punch clock and timecard | goal, research-clock, finish, y2-finish |
| Wealth, capacity, Gantt sparks | goal, research-capacity, focus-gantt, sold, y2-sold |
| Factory floor, loading bay, floor expansion | factory, build-rules, expansion, y2-build, y2-done-build |
| Mainline and its four sides | mainline, zones, y2-add-brake |
| Dealerships, departments, stations, spec indicators | the build steps, others-build-look, y2-spec-done |
| Market windows, reach | marketing-why, brochures-reach, sell-window-rule, the sale steps |
| Car meeples (buyers), spark markers | market, reveal-sparks, reveal-buyers, y2-reveal |
| Market cards, neutral deck | cards, grow, grow-cards, grow-year, reveal-neutral |
| Shared supply | supply, office, y2-others-build |

## Newcomer audits (references/tutorial.md, step 8)

1–4. The first script's passes (see git history). 5. **The developer's review (2026-11-03):** the tour listed things
without reasons; too few steps; terms zipped past. The rewrite above. The rewritten script passes `tutorial:check` (coverage; headless,
browser-like and fast-bot replays identical, 136 steps); the developer's reading is pending.

Narration is silent (`"narrator": { "provider": "none" }`, reading clock) until the developer approves the script.

## Coverage

| Rules | How | Step or reason |
|---|---|---|
| C1 | explained | chain |
| C2 | explained | office |
| C3 | skip | player counts: the game sets up for 3–5 players itself |
| C4, C18 | explained | market |
| C5, M2, M3 | explained | sell-price |
| C6, M1 | explained | grow |
| C7, C8, M4, C9, C19 | explained | axes |
| C10, C11, C12, C14, M5, M7 | explained | tracks, tracks-slots |
| C13, C16 | explained | expectations-new |
| M6, C35 | explained | research-clock |
| M8 | skip | a data cross-check, not a rule |
| C15, C41 | explained | expectations-min |
| C36, C37, C38 | explained | office, departments |
| C17 | explained | others-research-sam, expectations |
| C20, C21 | skip | component counts the game tracks itself |
| C22, M9, C26 | explained | factory |
| M10 | explained | expansion |
| M11, C23 | explained | build-rules |
| C24 | explained | mainline |
| C25 | explained | add-dealer |
| C27, C28, C29, M13 | explained | zones |
| M12, M14, M15, M16, M17, M18 | skip | footprints and supply counts: printed on the pieces, enforced by the game |
| C30, C31 | explained | brochures-specs |
| C32, C34 | shown | reveal-sparks, reveal-neutral |
| C33 | explained | cards |
| M19, M20 | skip | card contents: printed on each card |
| M21 | shown | play-quadrant |
| C39, C40 | explained | goal |
| S1, S2, S3, S4, S6, S7, S8, S9, S11, S12, S13, S14, S15, S16 | skip | setup the game does for you |
| S5 | explained | tracks-markers |
| S10, P3.25, UX5 | shown | place-departments |
| S17, V1, V2, V3 | explained | full-game |
| P1.1 | explained | y2-others-research-sam |
| P1.2, P1.3 | explained | research, research-rules |
| P1.4 | shown | y2-others-research-robin |
| P1.5 | skip | the game never offers a step past the end of a track |
| P1.6 | explained | research-clock |
| P1.7, P3.10 | explained | research-done |
| P2.1, P2.3, P2.6 | explained | focus, focus-gantt |
| P2.2 | shown | y2-focus-do |
| P2.4 | explained | focus |
| P2.5 | shown | others-focus-sam |
| P3.11, P3.12 | explained | paint-why, paint-spec, y2-shared-zones, y2-others-focus-sam |
| P3.1 | explained | y2-others-build |
| P3.2, P3.5, UX6 | explained | build, build-rules |
| P3.3, P3.18 | explained | y2-build |
| P3.19 | explained | y2-add-carbody |
| P3.4, P3.8 | explained | place-dealer |
| P3.6 | explained | factory |
| P3.7 | explained | supply |
| P3.9 | explained | place-marketing |
| P3.13, P3.15, P3.16 | explained | zones, zones-rule |
| P3.14 | explained | y2-add-carbody |
| P3.17, UX4 | explained | add-spec |
| P3.20 | explained | place-spec |
| P3.21, P3.22, P3.23, UX11 | explained | expansion, y2-done-build |
| P3.24 | skip | the game moves the focus marker down itself |
| UX1, UX2, UX3 | explained | build-rules, move-dealer, done-build |
| P4.1, P4.2, P4.3 | explained | brochures |
| P4.4, P4.5, P4.6, P4.8 | explained | brochures-specs, marketing-why |
| P4.9 | explained | expectations-min |
| P4.7, P5.10, P5.13 | explained | sold |
| P5.1 | shown | others-sell-robin |
| P5.2, P5.3 | explained | sell |
| P5.4, P5.5, P5.6, P5.7, P5.16 | explained | sell-window-rule |
| P5.8, P5.9, UX9, UX14 | shown | sell-window, sell-niche, y2-sell-window |
| P5.11, P5.14 | explained | y2-sell-rounds |
| P5.15 | explained | y2-sell-rounds |
| P5.12 | explained | full-game |
| P6.1, P6.2, P6.3 | explained | finish |
| P6.4 | explained | game-end |
| P7.1, P7.2, P7.3, P7.5, P7.6 | explained | expectations, expectations-min, expectations-arrow |
| P7.4, P7.7, P7.8, P7.9, P7.10 | explained | expectations-new, y2-expectations-tie, y2-expectations-new |
| P8.1, P8.2 | explained | grow, y2-others-cards |
| P8.3 | explained | grow-year |
| P8.4, P8.5, P8.6, P8.7, P8.8, P8.9, P8.10 | shown | reveal-sparks, reveal-buyers, reveal-neutral, reveal-prices, y2-reveal |
| M30 | skip | a data cross-check, not a rule |
| UX7, UX8, UX10, UX12, UX13 | skip | how the port shows things; nothing to learn |
| Q1, Q2, Q3, Q4, Q5, Q6, Q7, Q8, Q9, Q10, Q11, Q12, Q13, Q14, Q15, Q16, Q17, Q18, Q19 | skip | rulings, not rules |
