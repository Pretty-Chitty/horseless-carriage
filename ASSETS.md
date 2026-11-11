# Assets inventory

**Developer rules.** It has to look like the real game (2026-10-18), and everything that is a
layout plus data is generated on the client at high resolution rather than shipped as a cut
image (2026-11-02). So the port ships only one-offs and ingredients, and draws every face
from `consts.ts` data with those ingredients.

Two scripts cut the art; rerun both after any table edit (`extract-art.py` first):

- `scripts/extract-art.py` — the developer's scans in `raw scans/`: the five die-cut research
  tracks and their slots, the step patterns, the station illustrations, the mainlines (and
  their mirrored backs), the departments (marketing recoloured per player), the dealership's
  dotted paper, and the traced brand-piece outlines (`src/outlines.ts`).
- `scripts/extract-tts.py` — the Tabletop Simulator mod's files in `raw scans/tts/`
  (`manifest.json` maps each file to its workshop nickname and URL; source:
  https://steamcommunity.com/sharedfiles/filedetails/?id=3204177049): the flat board scan,
  cut into the market square (resampled so its 8×8 frame is where the photo's was), the
  board's right half, and every printed space; the drawing ingredients; the felt; and
  `src/generated.ts` (measured line positions, the chevron and car outlines, brand colours).

Shipped sprite sheets after packing: **4.3 MB** (stations 0.63, pieces 0.88, boardCells 0.81,
board 0.80, tracks 0.48, trackSlots 0.39, ingredients 0.18, icons, patterns).

## What ships as images

| Family | Count | Source | Shipped size |
|---|---|---|---|
| Market board (8×8, cut to its frame) | 1 | `tts/056` warped so the frame interior is 2362 px square, cut 30 px outside it (the printed margin and its axis pips are not shipped) | 1600 px |
| Planning office section, punch clock section | 2 | `tts/056` | 1600 px |
| Niche crops (click targets on the board) | 64 | market square, uniform 8×8 of the frame | 200 px |
| Card grid cells | 16 | quadrant I niches, inset (the cards print quadrant I's hatching) | 200 px |
| Office spaces: gantt 0–20, focus 1–5, historical 1–5, capacity 1–5, clock 1–40, min-spec boxes | 81 | lines measured on the scan (`measure()`, counts asserted) | ≤ 200 px |
| Panel-tab icons | 3 | the clerks, the printed clock symbol, 2×2 niches | 160 px |
| Research tracks (die-cut, with outline) | 5 | `raw scans/horseless tracks.jpeg` | 1400 px |
| Track slots | 35 | same | 180 px |
| Station illustrations | 17 | track slots, soft-edged, palette PNG | 240 px |
| Mainlines + mirrored backs | 6 | `raw scans/horseless factory pieces.jpeg` | 640 px |
| Departments (marketing × 5 colours) | 7 | same | 640 px |
| Step patterns (A–D), seamless | 4 | track slots | 170 px |
| Dotted paper (dealerships), seamless | 1 | the large dealership's body | 1 square |
| Board paper, seamless | 1 | `tts/056` plain area | 440 px |
| Floor square, bay square | 2 | `tts/071` (80 px a square; bay cut to 2 stripe periods) | 80 px |
| Car icons (white, alpha) | 3 | the mod's upright single-car spark counters `tts/057,059,061`, upscaled 4× before the alpha is taken | ~300 px |
| Card paper, seamless | 1 | the blank band of a card on `tts/124`, mirrored | 480 px |
| Punch-clock, FINISH, arrow icons | 3 | `tts/135`, `tts/136`, `tts/114` | 164–256 px |
| Card backs | 6 | `tts/125,127,129,131,133` (green, red, purple, yellow, blue by hue), `tts/113` neutral | 255 px |
| Table: worn oil-stained concrete | 1 | generated: periodic noise, aggregate, oil stains, cracks, raked light; also its bump map | 2048 px |

## What is drawn (ParameterizedCanvas, from `consts.ts` data + ingredients)

| Family | Face | Ingredients |
|---|---|---|
| Station tiles | `StationFace` | step pattern, station illustration, step letter and badges with abbreviations in the slab serif |
| Dealerships | `DealershipFace` | dotted paper, band in a tint of the player colour, city name, brand roundel (traced outline) |
| Spec indicators | `IndicatorFace` | step pattern, chevron traced from `tts/170` filled in the dimension colour, abbreviation |
| Spark counters and card spark cells | `SparkFace` / `SparkPrint` | the print's ink per type (`SPARK_COLORS`, sampled from the counters), white car icon; a ×2 is two cars on a diagonal |
| Player and neutral cards | `CardFace` | the cards' own paper, quadrant-I cell crops lightened to the card's print, framed cells with paper gutters, spark prints, year badge in the deck's printed colour, clock box with clocks at its right |
| Price markers | `NicheFace` | pale green card, "$6." in the slab serif, on an empty niche of the segment |
| Minimum-spec tiles (beside the market, 1 unit) | `MinSpecFace` | dimension colour, print speckle, number and name |
| Axis strips | `AxisFace` | paper, grey ticks, black pips (a dash for 0) |
| Factory floors (main, expansion, flipped) | `FloorFace` | floor square, bay square, keep-clear line |
| Timecard | `TimecardFace` | paper + clock / FINISH icon |
| Obsolescence marker | `ArrowFace` on an extruded disc | arrow icon |
| Market windows | `FrameBarFace` | player colour, city name |
| Brand pieces, car meeples, tracks | extruded outlines (`svg.ts`) | traced from the scans (brands, tracks) and `tts/070,076,077` (cars), wood colours sampled |

Face resolution: `TEXELS_PER_SQUARE = 128` (a 4×4 station is 512 px), cards 600×840,
indicators 256, floors 80 px a square.

## Data findings

- **Decks differ per colour in the mod.** The five mod card sheets agree with `PLAYER_DECK`
  on every card's year-bracket, clock count and spark types, but the spark *cells* differ
  from sheet to sheet (and from the developer's scanned deck). `consts.ts` keeps the scan's
  positions (Q8: identical decks); see the report.
- Dealership names per colour and size are read off the mod tiles (`DEALERSHIP_NAMES`).
- The board's Wealth Accumulation track is not shown: the $ spark is the score (developer, 2026-11-03).

## Still placeholder
- Nothing on the table.

## Store images (`static/`)
- `screenshot.jpg`: 1800×1050, q82 progressive, ~247 KB. A capture of the 4-player `/demo` at the
  first human prompt (setup, starting departments), taken with the skill's `screenshot.mjs` (2026-11-10).
