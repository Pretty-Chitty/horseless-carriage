# Tutorial: How to play Horseless Carriage

A scripted first game for three: you and two bots, **Robin** and **Sam**, on the rulebook's
**introductory rules** (no trucks or sports cars: the book "strongly advises" them for a first game).
The lesson plays the whole of year 1 with you making every real decision, then year 2 more briskly,
then explains the end of the game and the full rules' trucks and sports cars, and hands the same match
over (`end: "continue"`).

## The narrator

The company's founder, in the voice of the rulebook's opening speech: bombastic, impatient, proud of
"our brakeless bangers", sure that "if I can dream it, you can do it". They address you as the new
director of the works. Short sentences, one clause each, for the voice.

## Outline

**The table** (a tour that names things; rules come when they are used)
1. welcome — the company, the goal: the most wealth when the clock runs out.
2. market — 8×8 niches, cars on them are buyers; four quadrants; four price segments and their markers.
3. axes — the two active research tracks lie along the board; the axes say what each row and column demands.
4. tracks — five research tracks; each slot pictures a station; the markers; the three off-board tracks.
5. office board — Planning office (Gantt charts, focus, last year's focus), Minimum specifications,
   punch clock and timecard, Assembly capacity, Wealth.
6. factory — your floor, loading bay, keep-clear line; departments already given.
7. supply and cards — the shared supply; your deck of market cards.

**Setup**
8. place-departments (do it) — the two starting departments must touch the bay or each other.

**Year 1**
9. research (explain) → research-do (do it: advance your own marker to open a station) → others-research.
10. focus (explain: Gantt order, engineering ↔ sales, patents) → focus-do (do it: slot 1) → others-focus.
11. build: the five tile kinds → mainline (do it: Add, drag) → dealership (do it) → zones and steps
    (explain) → station (do it) → spec indicator (do it) → marketing (do it) → done (do it) →
    expansion (explain + do it) → others-build (shared supply settled by engineering order).
12. brochures — Gantt charts, published specs, window sizes, the minimums.
13. sell — sales order → window (do it: drag) → niche (do it: two buyers inside, capacity for one) →
    price + capacity → others-sell → rounds until nobody can sell.
14. finish? — the two ways the game ends.
15. expectations — the obsolete track leaves, its minimum rises, the most innovative track enters.
16. grow demand — play a card (do it) → quadrant (do it) → sparks and buyers → neutral cards → prices.

**Year 2** (briskly): research; pass on focus to keep Gantt charts; an indicator on last year's
station (P3.19) and building on the expansion; selling from a window placed earlier.

**The end**: wealth and the sales-focus tiebreak; the full game's trucks (+$1) and sports cars (+$2);
over to you.

## Pieces

| Piece / printed area | Step that rings it |
|---|---|
| Market board, niches, quadrants, segments, price markers | market |
| Spec axes | axes |
| Research tracks, slots, markers, innovation indicators, obsolescence marker | tracks, expectations |
| Planning office: Gantt, focus, historical focus | office, focus |
| Minimum specifications | office, expectations |
| Punch clock and timecard | office, finish |
| Assembly capacity | office, research |
| Wealth track | office, sell |
| Factory floor, loading bay, keep-clear line, floor expansion | factory, expansion |
| Mainlines, dealerships, departments, stations, spec indicators | build steps |
| Market windows | sell |
| Car meeples (buyers), spark markers | market, grow demand |
| Market cards, neutral deck | supply-cards, grow demand |
| Shared supply | supply-cards, others-build |

## Newcomer audits (references/tutorial.md, step 8)

1. **Pass 1:** no overview of a year up front; "hatching", "market window" and "minimum" used before they were explained; the reveal and the change of expectations played out before the narration described them; bot moves under-narrated ("Robin chooses"); the close missed the board's real lesson (your dealer has no safety and safety now has a minimum). All fixed.
2. **Pass 2:** the axes named no dimensions; the obsolescence arrow was never introduced and the step that uses it rang the track instead; "rightmost slot" was unclear with three players (slots 4 and 5 closed). All fixed.
3. **Pass 3:** "spark", "neutral cards" and "the timecard flips" were used before being explained. All fixed.
4. **Pass 4:** nothing found.

Narration is silent (`"narrator": { "provider": "none" }`, reading clock) until the developer approves the script.

## Coverage

| Rules | How | Step or reason |
|---|---|---|
| C1, C2 | shown | research |
| C3 | skip | player counts: the game sets up for 3–5 players itself |
| C4, C5, C6, M1, M2, M3, C18 | explained | market |
| C7, C8, M4, C9, C19 | explained | axes |
| C10, C11, C12, C13, C14, M5, M7, C16 | explained | tracks |
| M6, C35 | explained | research |
| M8 | skip | a data cross-check, not a rule |
| C15, C36, C37, C38, C41 | explained | office |
| C17 | explained | expectations |
| C20, C21 | skip | component counts the game tracks itself |
| C22, M9, C26 | explained | factory |
| M10 | explained | expansion |
| M11, C23 | explained | build |
| C24 | explained | mainline |
| C25 | explained | add-dealer |
| C27, C28, C29, M13 | explained | zones |
| M12, M14, M15, M16, M17, M18 | skip | footprints and supply counts: printed on the pieces, enforced by the game |
| C30, C31 | explained | brochures |
| C32, C34 | shown | reveal |
| C33 | explained | supply-cards |
| M19, M20 | skip | card contents: printed on each card |
| M21 | shown | play-quadrant |
| C39, C40 | explained | goal |
| S1, S2, S3, S4, S5, S6, S7, S8, S9, S11, S12, S13, S14, S15, S16 | skip | setup the game does for you |
| S10, P3.25, UX5 | shown | place-departments |
| S17, V1, V2, V3 | explained | full-game |
| P1.1 | shown | research-space |
| P1.2, P1.3, P1.4, P1.6 | explained | research |
| P1.5 | skip | the game never offers a step past the end of a track |
| P1.7, P3.10 | explained | research-done |
| P2.1, P2.2, P2.3, P2.6, P3.11, P3.12 | explained | focus |
| P2.4 | skip | the game offers only the open slots |
| P2.5 | shown | others-focus-sam |
| P3.1, P3.2, P3.5, UX6 | explained | build |
| P3.3, P3.18, P3.19, P5.11, P5.14, P5.15 | explained | year-two |
| P3.4, P3.8 | explained | place-dealer |
| P3.6 | explained | factory |
| P3.7 | explained | supply-cards |
| P3.9 | explained | place-marketing |
| P3.13, P3.14, P3.15, P3.16 | explained | zones |
| P3.17, UX4 | explained | add-spec |
| P3.20 | explained | place-spec |
| P3.21, P3.22, P3.23, UX11 | explained | expansion |
| P3.24 | skip | the game moves the focus marker down itself |
| UX1, UX2, UX3 | explained | done-build |
| P4.1, P4.2, P4.3, P4.4, P4.5, P4.6, P4.8, P4.9 | explained | brochures |
| P4.7, P5.10, P5.13 | explained | sold |
| P5.1 | shown | others-sell-robin |
| P5.2, P5.3, P5.4, P5.5, P5.6, P5.7, P5.16 | explained | sell |
| P5.8, P5.9, UX9, UX14 | shown | sell-window |
| P5.12 | explained | full-game |
| P6.1, P6.2, P6.3 | explained | finish |
| P6.4 | explained | game-end |
| P7.1, P7.2, P7.3, P7.4, P7.5, P7.6, P7.7, P7.8, P7.9, P7.10 | explained | expectations |
| P8.1, P8.2, P8.3 | explained | grow |
| P8.4, P8.5, P8.6, P8.7, P8.8, P8.9, P8.10 | shown | reveal |
| M30 | skip | a data cross-check, not a rule |
| UX7, UX8, UX10, UX12, UX13 | skip | how the port shows things; nothing to learn |
| Q1, Q2, Q3, Q4, Q5, Q6, Q7, Q8, Q9, Q10, Q11, Q12, Q13, Q14, Q15, Q16, Q17, Q18, Q19 | skip | rulings, not rules |
