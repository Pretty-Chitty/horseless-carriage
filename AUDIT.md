# Horseless Carriage — rules-conformance audit

Date: 2026-11-02. Method: `~/.claude/skills/board-game-port/references/audit.md`, Sweeps 1, 2 and the
mechanical checks (plus the Sweep 4b render-read list). Inputs: `RULES.md`, `rules.txt`
(publisher rulebook extraction), and the rules code: `src/HorselessCarriage.ts`, `src/phases/*.ts`,
`src/chits/*.ts`, `src/consts.ts`, `src/geometry.ts`. Rendering, `src/ai.ts`, `src/aiPlanner.ts`,
`src/canvas` and `src/assets` were out of scope, except where a render shows rules state wrongly.

Already known and not re-raised: P3.19 (selecting an earlier station to add an indicator) is fixed
in `phase3BuildFactory.ts:270-274`; `metadata.implementationNotes` is stale and will be rewritten
from this report.

Line numbers are as of this audit. Other agents were editing render files at the same time, so
render-file lines may have shifted a little.

**Result in one line:** no rule is missing. Four places deviate, one rule text is out of date and
two spec gaps need the developer. The type check is clean, and every data table taken from a
picture matches its scan.

---

## 1. Sweep 1 — coverage, one row per RULES.md id

Statuses: ✅ implemented · ⚠️ deviates · ❌ missing · 🎨 intentional UX simplification.
Picture-sourced tables were re-checked against the scans in `raw scans/` and the rulebook p.8
inventory (`rules.pdf` page 5) during this audit. The row says so where it applies.

### C — Components and terminology

| Rule | Status | Location | Note |
|---|---|---|---|
| C1 | ✅ | `HorselessCarriage.ts:69-98` | Phases 1–8 run in order each year; P6 is inline. |
| C2 | ✅ | `phases/*.ts` | Admin phases (4, 6, 7, 8b) make no picks; the others order their turns per phase. |
| C3 | ✅ | `chits/Root.ts:14-15` | minPlayers 3, maxPlayers 5. |
| C4 | ✅ | `chits/MarketBoard.ts:49` | 8×8 niches. |
| C5 | ✅ | `MarketBoard.ts:35, 95-110` | One price per segment, kept in `prices` (UX10 for the display). |
| C6 | ✅ | `consts.ts:370-375` | Four quadrants. |
| M1 | ✅ | `consts.ts:370-375` | Checked against the board scan: III top-left, IV top-right, I bottom-left, II bottom-right. |
| M2 | ✅ | `consts.ts:384-390, 494-496` | The anti-diagonal formula is the spec's own definition. Segment sizes 10/26/22/6 are asserted at load. Quadrant I's segment-1 cells checked against the board scan. |
| M3 | ✅ | `consts.ts:391` | [6, 4, 3, 2] (developer, Q1). |
| C7 | ✅ | `MarketBoard.ts:82-88` | Active dimensions are read from the bottom and left axes. |
| C8 | ✅ | `MarketBoard.ts:85-86` | `floor((col−1)/2)` and `floor((8−row)/2)`: 4 slots of 2 niches each. |
| M4 | ✅ | `MarketBoard.ts:85-86`, `MarketPieces.ts:19` | Low to high runs left→right and bottom→top. Matches the ▮/■■■■ marks on the board scan. |
| C9 | ✅ | `MarketPieces.ts:19-21`, `phase7AdvanceExpectations.ts:36,40` | Each axis reads min…min+3, with no cap (Q2). |
| C10 | ✅ | `consts.ts:29` | |
| C11 | ✅ | `MarketBoard.ts:82-88` | Off-board dimensions require their minimum. There are no minima at the start. |
| C12 | ✅ | `ResearchTrack.ts:136-151` | Positions 0–6. |
| C13 | ✅ | `ResearchTrack.ts:114, 156-163` | |
| C14 | ✅ | `consts.ts:216-234`, `Root.ts:69-81` | Access is granted per slot. Indicators of the same dimension count alike (P4.5). |
| M5 | ✅ | `consts.ts:255-261, 475-480` | All 30 slots checked against the tracks scan, including the step letters. |
| M6 | ✅ | `consts.ts:246` | Checked against the scan: every track has a clock on slots 4 and 6 and no others. |
| M7 | ✅ | `ResearchTrack.ts:137` | Position 0 is the start spot. |
| M8 | ✅ | `consts.ts:482-483` | |
| C15 | ✅ | `MarketBoard.ts:77-81` | Created on first use; the value is uncapped (Q3). |
| C16 | ✅ | `ResearchTrack.ts:139` | |
| C17 | ✅ | `MarketBoard.ts:42` | |
| C18 | ✅ | `chits/Niche.ts:11` | Buyers are `Car` chits. Cars sold are counters (UX8). |
| C19 | ✅ | `MarketBoard.ts:82-88` | |
| C20 | ✅ | `phase8GrowDemand.ts:83,109` | Created as needed, never stocked (Q4). |
| C21 | ✅ | `PlanningOffice.ts:84-93`, `HorselessCarriage.ts:132-141` | 8 pieces in use per player, within the 10 supplied. |
| C22 | ✅ | `chits/FloorTile.ts` | |
| M9 | ✅ | `consts.ts:337` | Checked against the factory scan: 12×12, 5×5 bay top-right, line on top. |
| M10 | ✅ | `consts.ts:338` | Checked against the scan: 6×8, 2×2 bay bottom-left, line on the short bottom edge. |
| M11 | ✅ | `Factory.ts:47-50` | Bay squares are taken out of `floor`. |
| C23 | ✅ | `FactoryTile.ts:9`, `SpecIndicator.ts` | |
| C24 | ✅ | `consts.ts:271-275`, `phase5Sell.ts:45-47` | |
| C25 | ✅ | `consts.ts:302`, `phase3BuildFactory.ts:108` | |
| C26 | ✅ | `consts.ts:301`, `phase3BuildFactory.ts:109-110` | |
| C27 | ✅ | `consts.ts:176-234, 470` | |
| C28 | ✅ | `consts.ts:216-234` | |
| C29 | ✅ | `Factory.ts:193`, `phase3BuildFactory.ts:306` | An indicator's step is its station's step. |
| M12 | ✅ | `consts.ts:216-234, 471-474` | Steps, slot badges and copies checked against the p.8 inventory (rulebook page 5 render). Badge colours and numbers match row by row. |
| M13 | ✅ | `consts.ts:271-282`, `geometry.ts:48-55` | Sector edges checked on all three mainlines in the factory scan (A bottom, B right, C left, D top). |
| M14 | ✅ | `consts.ts:311-322` | Green sizes checked in the scan. Other colours assumed the same (Q5). |
| M15 | ✅ | `consts.ts:291-295` | Checked in the scan. |
| M16 | ✅ | `consts.ts:324` | |
| M17 | ✅ | `consts.ts:299-300`, `SupplyArea.ts:79` | 6+6 per set (Q6, provisional). |
| M18 | ✅ | `phase3BuildFactory.ts:306` | Unlimited, created on Add spec. |
| C30 | 🎨 | `phase5Sell.ts:88-95` | UX7: windows are created when placed, not kept in a pile. Costs nothing. |
| C31 | ✅ | `consts.ts:402` | |
| C32 | ⚠️ | `phase8GrowDemand.ts:64-66`, `Niche.ts:40` | A niche's sparks of one type merge into a single counter whose `count` can reach 3 or 4. The face only draws 1 or 2 (`SparkFace.tsx:16`), so the board shows fewer sparks than the rules use. The arithmetic is right. **F4.** |
| C33 | ✅ | `consts.ts:430-448`, `Player.ts:40-46` | |
| C34 | ✅ | `consts.ts:450-458`, `HorselessCarriage.ts:122-123` | |
| C35 | ✅ | `ClockBoard.ts:48-54` | From space 1, a punch flips the timecard instead. |
| M19 | ✅ | `consts.ts:430-448` | All 17 cards re-read from the player-card scan (the cards are rotated 90° CW in the scan; upright (r,c) = (5−c_scan, r_scan)). Year, clocks and every spark match. |
| M20 | ✅ | `consts.ts:450-458` | All 7 neutral cards re-read from the black-card scan; all match. |
| M21 | ✅ | `phase8GrowDemand.ts:63,108` | Card cell (r,c) maps to niche (row0+r−1, col0+c−1). The card hatching in the scans agrees with the board's segments. |
| C36 | ✅ | `PlanningOffice.ts:80` | |
| M22 | ✅ | `consts.ts:344-345` | Board scan: 0–20, with the clock on 10. |
| C37 | ✅ | `PlanningOffice.ts:81-82, 128-137` | |
| C38 | ✅ | `ResearchArea.ts:14` | |
| M23 | ✅ | `consts.ts:346-348` | Board scan: 1–5, with the clock on 5. |
| C39 | ✅ | `Player.ts:18` | |
| M24 | 🎨 | `Player.ts:18` | A plain counter rather than the lapped track. Costs nothing. |
| C40 | ✅ | `ClockBoard.ts:34-39` | |
| M25 | ✅ | `consts.ts:350-351` | Board scan: 40…1, with dots under 40, 32 and 24. |
| C41 | ✅ | `MarketBoard.ts:40` | |

### S — Setup

| Rule | Status | Location | Note |
|---|---|---|---|
| S1 | ✅ | `HorselessCarriage.ts:139-140`, `MarketPieces.ts:13` | `min = 0`. |
| S2 | 🎨 | `HorselessCarriage.ts:106-114` | No industrialist choice: colour follows the shuffled seat. Windows follow UX7. |
| S3 | ✅ | `HorselessCarriage.ts:126-140` | Shuffled with `setup.takeRng`. |
| S4 | ✅ | `MarketBoard.ts:42` | |
| S5 | ✅ | `HorselessCarriage.ts:137-138` | |
| S6 | ✅ | `HorselessCarriage.ts:141` | Draw order is the outlet order; index 0 is the top. |
| S7 | ✅ | `ResearchTrack.ts:115,139` | |
| S8 | ✅ | `PlanningOffice.ts:84-85` | The engine shuffles `root.players`, so seat order is random. |
| S9 | ✅ | `PlanningOffice.ts:86-88` | |
| S10 | ✅ | `phase3BuildFactory.ts:84-97`, `HorselessCarriage.ts:67` | Placed under the P3 rules. The two departments are **deducted from the shared supply** (`consumeStock` also runs in setup), which RULES.md never states. **F5.** |
| S11 | ✅ | `Factory.ts:31` | |
| S12 | ✅ | `PlanningOffice.ts:87-89` | |
| S13 | ✅ | `ClockBoard.ts:38` | |
| S14 | ✅ | `HorselessCarriage.ts:144` | |
| S15 | ✅ | `HorselessCarriage.ts:145` | |
| S16 | ✅ | `SupplyArea.ts:55-80`, `HorselessCarriage.ts:116` | N sets. |
| S17 | ✅ | `Root.ts:17-24` | The variant is a selectable option. |

### P1 — Research

| Rule | Status | Location | Note |
|---|---|---|---|
| P1.1 | ✅ | `phase1Research.ts:15` | Historical order. |
| P1.2 | ✅ | `phase1Research.ts:16-20` | |
| P1.3 | ✅ | `phase1Research.ts:21-26` | Own capacity marker, or any marker on any of the five tracks. |
| P1.4 | ✅ | `phase1Research.ts:19,24,26` | `moved` is scoped to the turn callback, so undo is safe. |
| P1.5 | ✅ | `phase1Research.ts:24,26-30` | Markers at the end are excluded; an action with no option is forfeited (Q10). |
| P1.6 | ✅ | `phase1Research.ts:63,69` | |
| P1.7 | ✅ | `Root.ts:69-81` | Research is read only by access and by P7. |

### P2 — Set focus

| Rule | Status | Location | Note |
|---|---|---|---|
| P2.1 | ✅ | `phase3BuildFactory.ts:65`, `PlanningOffice.ts:143-147` | Every marker is on the historical track when P2 starts. |
| P2.2 | ✅ | `phase2SetFocus.ts:14-15` | The comparator is a total order, so sort stability does not matter. |
| P2.3 | ✅ | `phase2SetFocus.ts:21-34` | |
| P2.4 | ✅ | `PlanningOffice.ts:122-124` | |
| P2.5 | ✅ | `phase2SetFocus.ts:40-45` | |
| P2.6 | ✅ | `PlanningOffice.ts:128-134` | `focusSlot ?? 100+historical` gives the same order after P3.24. |

### P3 — Build factory

| Rule | Status | Location | Note |
|---|---|---|---|
| P3.1 | ✅ | `phase3BuildFactory.ts:25-41` | Players build at the same time. Shortages are settled in engineering order (UX6). |
| P3.2 | ✅ | `phase3BuildFactory.ts:206-338` | |
| P3.3 | ✅ | `FactoryTile.ts:103`, `phase3BuildFactory.ts:60-61,211,282,317` | |
| P3.4 | ✅ | `Factory.ts:111-119`, `geometry.ts:57-62` | |
| P3.5 | ✅ | `Factory.ts:91-100,179` | |
| P3.6 | ✅ | `Factory.ts:137-146,180` | Path through pieces, indicators included. Only committed bays count. |
| P3.7 | ⚠️ | `phase3BuildFactory.ts:31-41,145-163,198-202` | The settle-up is right. But taking back a piece that was **already paid** (possible in a shortage rebuild) does not return it to the supply, so the shared stock permanently loses a tile. **F2.** |
| P3.8 | ✅ | `Factory.ts:183-184` | |
| P3.9 | ✅ | `Factory.ts:185` | |
| P3.10 | ✅ | `Root.ts:75` | |
| P3.11 | ✅ | `Root.ts:71,76-77`, `PlanningOffice.ts:135-137` | Rank k needs ≥k others, so the last seat gets only its own research. |
| P3.12 | ✅ | `phase3BuildFactory.ts:384-388` | |
| P3.13 | ⚠️ | `geometry.ts:88-140` (mainlines `continue` at 103-111) | Two mainline sides of the same step that touch each other directly are never joined into one zone. The book defines a zone as "a connected area of one type of hatching", so they would join. **F1.** |
| P3.14 | ✅ | `Factory.ts:188` | Indicators inherit it through their station's zone. |
| P3.15 | ✅ | `Factory.ts:189-192`, `phase3BuildFactory.ts:102` | |
| P3.16 | ✅ | `Factory.ts:193`, `phase3BuildFactory.ts:288-313` | |
| P3.17 | ✅ | `phase3BuildFactory.ts:384-388` | One indicator per (dimension, slot) per station. |
| P3.18 | ✅ | — | Pieces are never removed; access is checked only when adding. |
| P3.19 | ✅ | `phase3BuildFactory.ts:270-274` | Just fixed. A locked station is offered even when its ring has no legal square; the indicator then shows invalid and can be taken back, so nothing illegal can be committed. |
| P3.20 | ✅ | `Factory.ts:196`, `geometry.ts:122-124` | Adjacent and same step means same zone. Pointing is drawn (`SpecIndicator.ts:62-73`). |
| P3.21 | ✅ | `phase3BuildFactory.ts:44-54,175-179,263-268,321` | Mandatory and gates Done. Not buildable this year (Q12). |
| P3.22 | ⚠️ | `phase3BuildFactory.ts:277-278`, `Factory.ts:277-283` | Adjacency and grid are right. The expansion can also be **flipped** (UX11), giving a mirrored bay corner that no rotation produces. The code's own comment says the tile's back is blank (`FloorTile.ts:65-66`). **F3.** |
| P3.23 | ✅ | `Factory.ts:260,264`, `FloorTile.ts` keepClearCells | Covers both directions: the new tile does not cover an old strip, and old floor does not cover the new strip. |
| P3.24 | ✅ | `phase3BuildFactory.ts:65` | At the end of the phase for everyone (concurrent model). |
| P3.25 | ✅ | `phase3BuildFactory.ts:84-97,316,320` | |

### P4 — Print sales brochures

| Rule | Status | Location | Note |
|---|---|---|---|
| P4.1 | ✅ | `phase4PrintBrochures.ts` | No picks. |
| P4.2 | ✅ | `phase4PrintBrochures.ts:15-22` | |
| P4.3 | ✅ | `phase4PrintBrochures.ts:17-18` | `before<10 && after>=10`; capped at 20. |
| P4.4 | ✅ | `phase4PrintBrochures.ts:25-34` | Stored on the dealer (`publishedSpecs`/`publishedSize`) and read in P5. |
| P4.5 | ✅ | `Factory.ts:167-174` | (See F1 for zones that should merge.) |
| P4.6 | ✅ | `phase4PrintBrochures.ts:28` | |
| P4.7 | ✅ | `phase5Sell.ts:45-47` | Sums over adjacent mainlines of the type. |
| P4.8 | ✅ | `phase4PrintBrochures.ts:30-32`, `consts.ts:404-406` | 3 or more give L (Q13). |
| P4.9 | ✅ | `phase4PrintBrochures.ts:31-32` | All five dimensions. |

### P5 — Sell, sell, sell!

| Rule | Status | Location | Note |
|---|---|---|---|
| P5.1 | ✅ | `phase5Sell.ts:16-29` | |
| P5.2 | ✅ | `phase5Sell.ts:78-149` | |
| P5.3 | ✅ | `phase5Sell.ts:51-53` | |
| P5.4 | ✅ | `phase5Sell.ts:136-139` | |
| P5.5 | ✅ | `MarketBoard.ts:125-145` | |
| P5.6 | ✅ | `MarketBoard.ts:130-131`, `phase5Sell.ts:117` | Overhang is allowed; the 2×1 can be turned. |
| P5.7 | ✅ | `phase5Sell.ts:106` | Only staged windows can be dragged. Overlap is unrestricted. |
| P5.8 | ✅ | `phase5Sell.ts:153-178` | |
| P5.9 | ✅ | `phase5Sell.ts:154,170`, `consts.ts:83-92` | |
| P5.10 | ✅ | `phase5Sell.ts:161-167` | |
| P5.11 | ✅ | `phase5Sell.ts:126-131` | |
| P5.12 | ✅ | `phase5Sell.ts:157` | Loops over every type. |
| P5.13 | ✅ | `phase5Sell.ts:21-24` | No pass. Options only shrink during P5, so dropping a player is final and correct. |
| P5.14 | ✅ | `phase5Sell.ts:115-116` | Both orders are available. |
| P5.15 | ✅ | `phase5Sell.ts:31-32` | |
| P5.16 | ✅ | `phase5Sell.ts` legalAnchors, sellTurn | Q14: any placement within specs; no sale if nothing inside can be sold. |

### P6 — Finish?

| Rule | Status | Location | Note |
|---|---|---|---|
| P6.1 | ✅ | `HorselessCarriage.ts:83-93` | |
| P6.2 | ✅ | `HorselessCarriage.ts:86` | Checked after P5, before P7. |
| P6.3 | ✅ | `HorselessCarriage.ts:90`, `consts.ts:464` | Ends in year 7. Equivalent to "no expansions left", since one is mandatory each year. |
| P6.4 | ✅ | `Root.ts:56-64` | Slots are unique, so the tiebreak is complete. |

### P7 — Advance expectations

| Rule | Status | Location | Note |
|---|---|---|---|
| P7.1 | ✅ | `phase7AdvanceExpectations.ts` | |
| P7.2 | ✅ | `phase7AdvanceExpectations.ts:15-17` | Appended, so it becomes the bottom of the stack. |
| P7.3 | ✅ | `phase7AdvanceExpectations.ts:19`, `MarketBoard.ts:77-81` | |
| P7.4 | ✅ | `phase7AdvanceExpectations.ts:21` | |
| P7.5 | ✅ | `MarketBoard.ts:84`, `phase4PrintBrochures.ts:31` | |
| P7.6 | ✅ | `phase7AdvanceExpectations.ts:23` | |
| P7.7 | ✅ | `phase7AdvanceExpectations.ts:28-31` | |
| P7.8 | ✅ | `ResearchTrack.ts:160-163` | Indicator at i sits between i and i+1, so a marker at i+1 scores 1. Matches the p.18 example. |
| P7.9 | ✅ | `phase7AdvanceExpectations.ts:29-30` | Score, then furthest past the indicator, then top of the stack. |
| P7.10 | ✅ | `phase7AdvanceExpectations.ts:33-41` | |

### P8 — Grow demand

| Rule | Status | Location | Note |
|---|---|---|---|
| P8.1 | ✅ | `phase8GrowDemand.ts:18` | |
| P8.2 | ✅ | `phase8GrowDemand.ts:26-46`, `Card.ts:29-33` | `cardId` is hidden from the other seats until revealed; the log names only the quadrant. |
| P8.3 | ✅ | `phase8GrowDemand.ts:19` | |
| P8.4 | ✅ | `phase8GrowDemand.ts:20-23,72` | Q15. |
| P8.5 | ✅ | `phase8GrowDemand.ts:54-67` | Placement is correct; the display of more than 2 sparks is F4. |
| P8.6 | ✅ | `phase8GrowDemand.ts:68` | |
| P8.7 | ✅ | `phase8GrowDemand.ts:77-86` | `max(0, min(s, 2s − b))`. Runs before the neutral buyers, as the book orders it. |
| P8.8 | ✅ | `phase8GrowDemand.ts:91` | II, III, then (N−2)× I. |
| P8.9 | ✅ | `phase8GrowDemand.ts:114-115` | |
| P8.10 | ✅ | `phase8GrowDemand.ts:93`, `MarketBoard.ts:100-110` | |
| M30 | ✅ | `consts.ts:491-493` | Asserted at load. |

### V — Introductory rules

| Rule | Status | Location | Note |
|---|---|---|---|
| V1 | ✅ | `Player.ts:43`, `HorselessCarriage.ts:122`, `consts.ts:485-486` | |
| V2 | ✅ | `phase5Sell.ts:37-39` | |
| V3 | ✅ | follows from V1 | No sport or truck spark or buyer can appear. |

### UX — developer decisions

| Rule | Status | Location | Note |
|---|---|---|---|
| UX1 | ✅ | `phase3BuildFactory.ts:211,259-262` | |
| UX1a | ✅ | `Factory.ts:215-248,334-341`, `phase3BuildFactory.ts:222-242` | |
| UX2 | ✅ | `Factory.ts:177-209`, `FactoryTile.ts:171-177` | |
| UX3 | ✅ | `phase3BuildFactory.ts:319-322` | |
| UX4 | ✅ | `phase3BuildFactory.ts:286-313` | |
| UX5 | ✅ | `phase3BuildFactory.ts:84-97,175-179` | |
| UX6 | ✅ | `phase3BuildFactory.ts:78-111,29-41` | (See F2.) |
| UX7 | 🎨 | `phase5Sell.ts:88-96` | |
| UX8 | 🎨 | `FactoryTile.ts:39`, `phase5Sell.ts:166-167` | |
| UX9 | ⚠️ | `MarketBoard.ts:125-145` | The "largest legal coverage per top-left niche" rule is implemented and sound: needs only grow upward and rightward, so the largest legal coverage contains every other legal one. But the text says windows are placed by **clicking** a niche, and the code drags (UX14). The spec text is stale. **F6.** |
| UX10 | 🎨 | `MarketBoard.ts:108-109` | |
| UX11 | ⚠️ | `phase3BuildFactory.ts:263-268,275-278` | Implemented as written, including the flip. See F3 on whether the flip is physical. |
| UX12 | ✅ | `phase1Research.ts:31-52` | |
| UX13 | ✅ | `FactoryTile.ts:154-170` | |
| UX14 | ✅ | `phase5Sell.ts:84-118` | |

**Counts (189 ids, including the inline M22–M25 and UX1a):** ✅ 177 · ⚠️ 6 (C32, P3.7, P3.13,
P3.22, UX9, UX11) · 🎨 6 (C30, M24, S2, UX7, UX8, UX10) · ❌ 0.

---

## 2. Sweep 2 — this game's mechanisms and their hazards

| Mechanism | Hazard derived | Checked | Result |
|---|---|---|---|
| Turn order from history (P1, P2, P3.24) | Wrong track read after P3.24 drops markers; unstable sort on ties | `PlanningOffice.ts:128-141`, `phase2SetFocus.ts:15` | ✅ Every order reads `focus ?? historical`, slot-preserving. The P2 comparator is total. |
| Simultaneous phase (P3) | Conflicts over the shared supply; patent rank changing mid-phase | `phase3BuildFactory.ts:25-41` | ✅ Settled in engineering order; rank is read from the focus track, which does not change in P3. ⚠️ A paid piece taken back is lost from the supply (**F2**). |
| Patents / access by rank (P3.11) | Off-by-one in "k others"; 3- and 5-player edges | `Root.ts:69-81` | ✅ Rank k needs ≥k others. The last seat (rank N, N−1 others) gets only its own research, at every player count. |
| Spatial legality (P3.4–P3.23) | Adjacency vs. connectivity; zone flood-fill; keep-clear in both directions | `Factory.ts`, `geometry.ts` | ✅ Except **F1** (mainline–mainline sides) and **F3** (expansion mirror). |
| Pending state (this year's expansion and pieces) | A not-yet-active piece read by a consumer | grep `committed`, `placed`, `pendingExpansion` | ✅ The grid and bounds use committed floors only. P1 and P4 count `placedTiles`, so the bench is excluded. P8.3 reads `expansionsPlaced`, which is bumped at commit. |
| Derived state cached across a mutation | `Factory._grid` is an in-memory cache (not serialised, and not cleared by an in-place deserialize) | `Factory.ts:34-59` | ✅ Every reader in P3 runs after `refreshValidity()` at the top of the loop. P4/P5 read it after the end-of-P3 refresh, and the factory never changes after P3. The drop-target `_index` is rebuilt every iteration. Safe as written. Keep the "refresh first" order if new readers are added. |
| Snapshot spent later (P4 → P5) | Specs recomputed in P5 instead of the published ones | `phase5Sell.ts:52,69` | ✅ P5 uses `publishedSpecs`/`publishedSize`. |
| Finite supply (P3.7) | Pool vs. rule; running-out behaviour | see the supply table below | ✅ (F2 aside). |
| Decks and draws (neutral deck, hands) | Running dry mid-effect; reshuffle | `phase8GrowDemand.ts:98-116` | ✅ At most N+1 draws (setup) or N draws (P8), both ≤ 6 = the smallest deck (intro, 5p). Reshuffled whole after each use. The `if (!card) break` guard is never reached. |
| Hidden information (hands, played cards, neutral deck) | Leak through the log, a context or a field | `Card.ts:29-33`, `phase8GrowDemand.ts:42,48` | ✅ Only `quadrant` is public, which is public at the table too. |
| Economy (P5.9) | Missing price on a segment with buyers | `MarketBoard.ts:100-110` | ✅ Buyers are added only in setup and P8, and both reprice. Sales only remove buyers, so every segment with buyers has a marker. |
| Scores and tracks (Gantt 0–20, capacity 1–5, clock 40→flip) | Cap, punch on "onto or past", flip at 0 | `phase4PrintBrochures.ts:17-21`, `phase1Research.ts:24,69`, `ClockBoard.ts:48-54` | ✅ |
| Tiebreak chains (P2.2, P6.4, P7.9) | No tiebreak, or an incomplete one | as cited | ✅ All three are complete. |
| Action counts (P1 one per department, mandatory; P5 obligatory; P8 one card) | Skip buttons over mandatory actions | phase files | ✅ No pass in P1, P5 or P8. P2 pass is a rule. |
| Depletion rounds (P5 rounds until no options) | Infinite loop or phantom turns | `phase5Sell.ts:18-29` | ✅ Each turn removes ≥1 buyer, so the loop ends. |
| Menus with dead-end sub-steps | An offered action with no legal completion | P3 Add spec, P5 drag, P8 | ✅ The spec picker is opened only with ≥2 slots. A dropped window always contains a sellable niche. A small window with only vertical spots is reachable through Turn. P3.21 has a theoretical dead end if **no** legal expansion spot exists in any orientation (Done is withheld forever). Unreachable in practice: a finite factory always has a free outer edge. Not raised. |
| Effect-heavy end path (year 7, flipped timecard) | Crash or double-run on the end branch | `HorselessCarriage.ts:86-101` | ✅ Both branches break before P7. `winners()` handles ties. |
| "Useless move" filters | Legal moves removed for tidiness | P5 anchors, P3 Add, P8 quadrants | ✅ (fixed 2026-11-03) P5 offers every placement within the dealer's specs, overhangs included, buyer or not; the book has no such filter (Q14). P8 offers all four quadrants. |
| Player-count variants | Per-count tables | S9, S13, S16, P2.4, P3.11, P8.8 | ✅ |
| Player aid / help text | Prose restating a rule and drifting | `PlayerAid.tsx`, every `.help()` | ✅ The aid renders `STATIONS` from code. The help strings agree with the rules (P1 punch clocks, P2 Gantt reset, P5 bonuses, P8 year rule). No rule ids appear in UI text. |
| Data from pictures | Transcription errors | M5, M6, M12, M13, M19, M20, M22–M25, M1–M4 | ✅ Re-read against the scans in this audit (see the Sweep 1 rows). |

### Supply classification (the "does running out match the rulebook" check)

| Supply | Book | Code | Verdict |
|---|---|---|---|
| Stations, mainlines | "The number of station tiles provided is limiting, if they run out, a tile can no longer be built" (p.12) | Finite, N sets, `SupplyArea` | ✅ hard limit |
| Research / planning departments | Part of the per-colour set returned to the box (p.8) | Finite, 6+6 per set (Q6) | ✅ (count provisional; the setup deduction is F5) |
| Dealerships (3), marketing (4) | "maximum of three dealerships", "maximum of four marketing departments" (p.5) | Per-player limits | ✅ |
| Floor expansions | 6 per player (p.8), "if any remain" (p.14) | Counter, 6 | ✅ (load-bearing: ends the game, P6.3) |
| Spec indicators | Not stated | Unlimited, created on Add (Q7) | ✅ |
| Buyers / car meeples, sparks | Not stated | Unlimited, created (Q4) | ✅ |
| Market windows | 9 per player = 3 per dealer (p.6) | One per dealer per year, created on placement | ✅ |
| Minimum-spec indicators | 5, two-sided (p.4, p.18) | One per dimension, uncapped value (Q2/Q3) | ✅ |
| Neutral cards | Finite deck, reshuffled (p.19) | `GameDeckChit` | ✅ |
| Player cards | 17, "never return" (p.19) | Hand, discarded on play | ✅ |
| Brand pieces | 10 per colour | 8 used | ✅ |
| Gantt (0–20), capacity (1–5) | "any excess is lost" (p.15); track ends at 5 | Capped | ✅ |

---

## 3. Mechanical checks

| Check | Result |
|---|---|
| `npx tsc --noEmit -p .` | **Clean**: exit 0, no output. |
| `render-reads.mjs src` | 2 reads to review. Both are safe: `ResearchTrack.ts:73` BrandPiece reads `parent.label()`, and `ResearchTrack.ts:120` InnovationIndicator reads `parent.dimension`. A TrackSlot's position and dimension and a track's dimension never change. 15 type/role checks were listed as safe. |
| `Math.random`, `Date.now`, `new Date`, module-level `let` in game logic | None. Randomness uses `setup.takeRng` and the engine deck. The engine shuffles player order. |
| Un-awaited async (`decide`, `createTurn`, `runParallelTurns`, phase calls) | None. |
| Outer-scope state written from turn callbacks | None. `moved` (P1), `selected`/`done`/`justAdded` (P3), `staged`/`chosenNiche` (P5) and `card` (P8) all live inside their callbacks. P5's `active` Set is mutated only outside `createTurn`. `Factory._grid`/`_index`/`_claimed` are in-memory caches, rebuilt before use (Sweep 2 row). |
| `turn.pick` with an empty legal set | None reachable: every pick is guarded (see the "Menus" row). |
| `new <Piece>(` in game logic | Each one is a supply decision that matches the table above: `FactoryTile` is minted against `catalogueMax`; `SpecIndicator`, `Car`, `Spark` and `MarketWindow` are created as needed (unlimited or one per dealer); `FloorTile` is one per year from the counter of 6; `MinSpecMarker` is one per dimension; the `FloorTile` probe at `Factory.ts:263` is a throwaway, never attached. |
| Optional parameters that gate side effects | None (`player?`/`turn?` grep is empty). |
| `turn.log` inside `.filter/.map` | None. |
| Formulas standing in for printed tables | `segmentOf` (M2) is the spec's own definition, asserted against the printed segment sizes and spot-checked on the board scan. `windowSizeFor` is the P4.8 rule. `valueAt = min+index` is C9 ("four consecutive values"). Everything printed is a literal table. |
| Parallel arrays | `DEALERSHIP_NAMES[c]` (3) vs `DEALERSHIPS` (3); PlayerAid phase names (8); `PRICE_MARKERS` (4, asserted). Lengths agree. |
| `maxPlayers`/`minPlayers`, `description` | 3/5 matches C3; the description is accurate. |
| `implementationNotes` | ❌ "In progress: setup and phase 3 (build factory) only." Stale (known; rewrite from this report). `rulesPdfUrl` is empty. |
| `status: "tested"` claims | None. |

Not run in this audit: Sweep 2b (frame trace), Sweep 5 (legibility) and Sweep 6 (soak/playtest).
Other agents were editing the render and AI files at the time.

---

## 4. Findings, in priority order

### F1 — Mainline sides of the same step that touch are not one zone (P3.13) — medium

- **Code:** `geometry.ts:103-111`. Mainline nodes `continue` before any neighbour scan, so a
  mainline side is joined only to stations and indicators. Two mainlines whose A sides (say)
  touch edge to edge stay in separate zones.
- **Book (p.13):** "A connected area of one type of hatching forms a manufacturing zone, made up of
  technology stations, spec indicators and one side of (one or more) mainlines. Each mainline can
  be part of four different zones, one on each side."
- **Failure scenario:** a car mainline M1 lies with its A (bottom) edge against the A side of a
  second mainline M2 that has been turned 180°. A Chassis on M1's A side gives its Reliability
  indicator to M1 only. By the hatching definition the area is connected, so M2 should also get
  +1 Reliability. Conversely, a Bumper on M1's A side and a second Bumper on M2's A side are in one
  connected A area under the book's definition. P3.15 forbids that, but the code accepts it.
- **Spec status:** RULES.md P3.13's reading ("a tile is in a mainline's zone X if it is
  edge-adjacent … across the mainline's edge X") does not address mainline–mainline contact. Add a
  Q-row and ask the developer.
- **Fix if the hatching reading is confirmed.** In `computeZones`, for mainline `p`, scan the
  neighbours of its cells. For each neighbour cell owned by another mainline `q`, find the edge of
  `p` and of `q` that the contact crosses, and union the two sides when their steps match:
  ```ts
  if (p.kind === "mainline") {
    for (const e of EDGES) { const n = `${p.id}:${e}`; find(n); nodeStep.set(n, mainlineStepOnEdge(e, p.rotation, p.flipped)); }
    for (const c of cellsOf(p.x, p.y, p.footprint)) for (const d of NEIGHBOURS) {
      const q = byCell.get(cellKey(c.x + d.x, c.y + d.y));
      if (!q || q === p || q.kind !== "mainline") continue;
      const ep = edgeTouched(p.x, p.y, p.footprint, { x: c.x + d.x, y: c.y + d.y });
      const eq = edgeTouched(q.x, q.y, q.footprint, c);
      if (ep && eq && mainlineStepOnEdge(ep, p.rotation, p.flipped) === mainlineStepOnEdge(eq, q.rotation, q.flipped)) union(`${p.id}:${ep}`, `${q.id}:${eq}`);
    }
    continue;
  }
  ```
  `mainlineSpec` and the uniqueness check need no change: they already read whole zones.

### F2 — Taking back a paid piece leaks it from the shared supply (P3.7) — medium

- **Code:** `consumeStock` (`phase3BuildFactory.ts:145-155`) marks covered pieces `paid` and
  decrements `SupplyArea`. In the shortage rebuild (`:37-39`) the player may take back any
  unlocked piece (`takeBack` → `removePiece`, `:159-163,198-202`), including a paid one. Nothing
  increments the supply again. `syncBenchCounts` (`Factory.ts:299-306`) counts only unpaid pieces,
  so the catalogue cannot offer that copy again either.
- **Book (p.12):** "The number of station tiles provided is limiting, if they run out, a tile can
  no longer be built." The limit is the tiles that exist, not tiles that vanished.
- **Failure scenario:** 4 players. Blue (rank 2) placed a car mainline and an Engine. Green (rank 1)
  took the last Engine, so Blue rebuilds. Blue's mainline is already paid. Blue takes the mainline
  back to rearrange. The car-mainline stack stays one lower for the rest of the game, and Blue
  (and later Yellow) may be told "the supply ran out" of a tile that is sitting in nobody's
  factory.
- **Fix:** return paid copies to the supply when they leave the floor. For example, give
  `removePiece` the root and add the copy back:
  ```ts
  function removePiece(f: Factory, piece: FactoryTile, root?: Root): void {
    for (const ind of f.indicators.copy()) if (ind.station === piece) ind.removeFromParent();
    const key = piece.paid && !piece.committed ? piece.supplyKey() : undefined;
    if (key && root) { root.supply.give(key); const e = f.benchTiles().find((b) => b.signature() === key); if (e) e.catalogueMax += 1; }
    piece.removeFromParent();
    f.recomputeGrid();
  }
  ```
  `SupplyArea.give(key)` is new: it finds the stack and does `count += 1`. Pass `root` from `takeBack`. The shortage removal at
  `:34` only removes unpaid pieces, so it is unaffected. A simpler alternative is to forbid Take
  back on `paid` pieces during the rebuild, but that removes a legal rearrangement.

### F3 — The floor expansion can be mirrored (P3.22 / UX11) — medium-low, needs the developer

- **Code:** `phase3BuildFactory.ts:277-278` offers Flip on this year's expansion.
  `Factory.placeNewExpansion` (`:276-284`) also tries `flipped = true`. A flip mirrors the bay and
  keep-clear line to the other end of the short edge. The tile is chiral: going round its edge,
  the line's short side meets the long side on the bay side, and rotation preserves that. So a
  mirrored tile is a placement no rotation reaches. `FloorTile.ts:65-66` says "the underside of a
  floor tile is blank".
- **Book (p.14):** "The expansion must be placed adjacent to the existing factory, aligned with the
  existing square grid." The book does not mention turning the tile over, and a blank back has no
  bay to mirror.
- **Failure scenario:** a player needs the 2×2 bay in the bottom-right corner, with the strip
  below, to keep a keep-clear lane open next to their main bay. No physical orientation gives
  that. The port allows it and the factory gains a legal bay position the real game does not
  have.
- **Fix:** if the back really is blank, remove the floor FlipButton (`:278`) and the `flipped`
  loop in `placeNewExpansion` (try rotations only). If the developer wants the flip, change UX11
  to 🎨 and say in `implementationNotes` that expansions may be mirrored, unlike the physical
  tiles.

### F4 — More than two sparks on a niche display as two (C32/P8.5) — low (legibility)

- **Code:** `phase8GrowDemand.ts:64-65` adds to an existing marker's `count`
  (`(existing.count + sp.count) as 1 | 2`), which can reach 3 or 4. `SparkFace.tsx:16` draws the
  single icon for 1 and the double for anything else. `Niche.ts:40` types `count` as `1 | 2`.
- **Book (p.19):** "A niche square can hold any number of spark markers; the markers can be reversed
  to show two sparks of the relevant type."
- **Failure scenario:** P5 card (car ×2 at (1,4)) is played on a quadrant whose (1,4) already has
  a car spark. The niche gets 3 sparks and generates 3 buyers, capped at 6, but shows one
  double-spark counter. Players reading the board under-count future demand.
- **Fix:** top up an existing single, then add new counters of at most 2:
  ```ts
  let left = sp.count;
  const single = niche.sparks.find((x) => x.type === sp.type && x.count === 1);
  if (single && left > 0) { single.count = 2; left -= 1; }
  while (left > 0) { const n = Math.min(2, left) as 1 | 2; niche.sparks.add(new Spark().set((x) => { x.type = sp.type; x.count = n; })); left -= n; }
  ```
  `sparksOf` already sums every marker, so P8.7 is unchanged.

### F5 — Unstated reading: the setup departments come out of the shared supply (S10/S16/Q6) — low, spec

- **Code:** `executeBuildFactory(…, "setup")` runs `consumeStock` (`phase3BuildFactory.ts:31-41`),
  so N research and N planning departments leave the shared stock at setup.
- **Book (p.8):** "Give each player one Research and one Planning department. … Finally, place the
  technology stations, mainlines and additional departments on the table." The word "additional"
  can mean the given pair is separate from the supply, or that the supply is what is left.
- **Failure scenario:** none today with Q6 at 6+6 per set (no shortage is plausible). But if the
  real count is 3+3 per set, deducting the setup pair halves the buildable research and planning
  departments.
- **Fix:** add a Q-row (with Q6) and record the decision in RULES.md S10. No code change unless the
  developer says the starting pair is extra. In that case, mark the setup tiles `paid = true` in
  `makeCatalogue`'s setup branch (`:88`).

### F6 — RULES.md UX9 describes click placement; the code drags (UX14) — low, documentation

- **Code:** `phase5Sell.ts:106-111` places windows by drag only. Clicking a niche sells from a
  window that is already placed.
- **Fix:** reword UX9 as "Each legal drop spot is the largest legal coverage anchored at that
  top-left niche…", and keep the subset argument: needs only grow upward and rightward, so the
  largest legal coverage contains every other legal one.

### F7 — `metadata` (known) — low

- `implementationNotes` is stale (`HorselessCarriage.ts:41`). Rewrite it from this report. Mention
  UX7, UX8, UX10, the S2 colour-by-seat simplification, the provisional Q6 count, F3 if the flip
  is kept, and the readings in Q10, Q13, Q14 and Q15.
- `rulesPdfUrl` is empty (`:45`).

---

## 5. Q-rows: does the book answer them?

| Id | Book answers it? | Evidence |
|---|---|---|
| Q1 | Partly. The text gives only $6: "Place the $6 price marker in the bottom left price segment" (p.8); "The highest segment containing any buyers will get the $6 marker; the next highest segment with buyers gets the next highest price" (p.19). $4/$3/$2 come from the picture and the developer. | — |
| Q2 | Partly; supports "uncapped": "the first time, it will be '0 1 2 3'; if a dimension makes a comeback, it will increase to '1 2 3 4', etc." (p.18). | — |
| Q3 | Partly. The book covers only the second time: "placing a the corresponding cardboard minimum spec indicator tile on the board (or, if it happens again, by turning over the spec indicator)" (p.18). A third time is not addressed. The uncapped reading is a decision. | — |
| Q4 | No. The book is silent on meeple supply. | — |
| Q5 | No. Only green's names and sizes are pictured. | — |
| Q6 | No (text). "return a set of tiles as depicted below to the box" (p.8). Only the picture shows the stacks. | — |
| Q7 | No. | — |
| Q8 | No. "the corresponding deck of 17 cards" (p.8). | — |
| Q9 | Yes (with the picture): "Note the card will always be aligned with the board as shown." (p.19). The card scans' segment hatching agrees with the board. | — |
| Q10 | No. "For each research department in the player's factory, they must move one research marker forward by one step." (p.10). Silent on the no-legal-marker case, which is practically unreachable. | — |
| Q11 | Yes: "Each spot on a research track represents the ability to add one spec indicator to the station pictured." (p.10), and "If a player has access to multiple spec indicators belonging to the same technology station, they can choose to add all those spec indicators" (p.13). | — |
| Q12 | Yes, as to order: "After placing all stations in the existing factory, a player must place one factory floor expansion if any remain." (p.14). "In the existing factory" implies nothing is built on the new tile this year. | — |
| Q13 | No. "A dealer with no adjacent marketing departments counts as small (S); one department makes it medium (M); and two departments makes it large (L)." (p.15). Silent on 3–4. | — |
| Q14 | Overruled by the developer 2026-11-03: the book never requires a window to cover a buyer. Former reading: "First, the player decides which dealer will sell. … If the market window of that dealer has not yet been placed, place it first. … A player must then sell all cars to all buyers in one of the niche squares inside of their dealer's market window" (p.16), and "Selling cars is obligatory if possible; passing is not allowed." (p.17). Placing a window is a step of a sale. | — |
| Q15 | No. The book says only "a card may only be played if the player has at least that many factory expansions" and "Once played, cards are discarded and never return to the player's hand." (p.19). | — |
| Q16 | No (text). | — |
| *new* Q17 | (F1) Do two same-step mainline sides that touch directly form one zone? The book's definition suggests yes: "A connected area of one type of hatching forms a manufacturing zone" (p.13). | — |
| *new* Q18 | (F3) Is the floor expansion's back blank, i.e. is a mirrored expansion illegal? | — |
| *new* Q19 | (F5) Do the setup Research and Planning departments come out of the shared supply ("additional departments", p.8)? | — |

Checked against rules.txt where RULES.md looked doubtful:

- **P3.11.** The book says rank 2 has "every technology researched by at least two players" (not
  "two others"). This is equivalent, because the player's own research already grants access.
- **P7.9.** "a research marker furthest to the right of the innovation indicator" matches the
  code's "furthest past the indicator".
- **P3.23.** "The areas directly bordering on these zones must remain empty table space" matches
  the 1-deep strip.
- **P8.7 and P8.8.** The order (sparks first, then neutral buyers that ignore the cap) matches
  p.19.
