import React from "react";
import { Color, Horizontal, Image, Layered, Pad, Raw, Spacer, Text, Vertical } from "@pretty-chitty/core/ReactCanvas";
import { ParameterizedCanvas } from "@pretty-chitty/core";
import { CardSpec, NEUTRAL_DECK, PLAYER_DECK, PlayerColor } from "../consts";
import { cardBackArt, cardCellArt, cardPaperArt, clockIconArt } from "../art";
import { PatternGrid } from "./TileFace";
import { SparkPrint } from "./SparkFace";

function cardSpec(id: string): CardSpec {
  const c = [...PLAYER_DECK, ...NEUTRAL_DECK].find((x) => x.id === id);
  if (!c) throw new Error(`unknown card ${id}`);
  return c;
}

// The year badge's colour as printed on each deck (sampled from the mod's card sheets).
const YEAR_HEX: Record<PlayerColor, string> = { green: "#7fbe6f", red: "#e34041", purple: "#9a73aa", yellow: "#f5cf3c", blue: "#3e5ea7" };

// A market growth card (C33, C34, M19, M20), drawn as the real cards are printed (mod card
// sheets 124–132, 112; compared side by side at the same size): plain cream paper; a square
// 4×4 grid near the top — a heavy outer frame, each cell framed in a thin line with a paper
// gutter between cells, a heavier cross between the 2×2 blocks — each cell the light hatching
// of the matching quadrant-I niche, or a spark print (type ink, white car) where the card
// seeds a spark; below, the year in a square of the deck's colour and the punch-clock box
// with one clock symbol per punch at its right, or a dash. Neutral cards have no year, so
// their box runs the full width. Everything comes from the rules' own card table.
export class CardFace extends ParameterizedCanvas {
  cardId = "P1";
  playerColor: PlayerColor | "neutral" = "neutral";
  width = 600;
  height = 840;

  render() {
    const spec = cardSpec(this.cardId);
    const W = this.width;
    const H = this.height;
    const margin = W * 0.067;
    const grid = W - 2 * margin;
    const frame = W * 0.012; // the heavy outer frame and the centre cross
    const thin = W * 0.004; // each cell's own outline
    const gutter = W * 0.012; // paper between neighbouring cells
    const inner = grid - 2 * frame;
    const cell = inner / 4;
    const rowH = H * 0.137;
    const badgeW = rowH;
    const yearHex = this.playerColor === "neutral" ? "#333" : YEAR_HEX[this.playerColor];
    const cellAt = (r: number, c: number) => {
      const s = spec.sparks.find((x) => x.row === r && x.col === c);
      return (
        <Pad key={`${r}${c}`} amount={gutter / 2}>
          <Layered>
            {s ? (
              <SparkPrint type={s.type} count={s.count > 1 ? 2 : 1} size={cell} />
            ) : (
              <Layered>
                <Image image={cardCellArt(r, c)} fill />
                <Color hex="#ffffffa8" />
              </Layered>
            )}
            <Raw
              cb={(ctx, x, y, w, h) => {
                ctx.strokeStyle = "#2a2a2a";
                ctx.lineWidth = thin;
                ctx.strokeRect(x + thin / 2, y + thin / 2, w - thin, h - thin);
              }}
            />
          </Layered>
        </Pad>
      );
    };
    return (
      <Layered>
        <PatternGrid image={cardPaperArt} cols={2} rows={3} />
        <Pad left={margin} right={margin} top={H * 0.05} bottom={H * 0.055}>
          <Vertical>
            <Layered size={grid}>
              <Pad amount={frame}>
                <Vertical>
                  {[1, 2, 3, 4].map((r) => (
                    <Horizontal key={r}>{[1, 2, 3, 4].map((c) => cellAt(r, c))}</Horizontal>
                  ))}
                </Vertical>
              </Pad>
              <Raw
                cb={(ctx, x, y, w, h) => {
                  ctx.strokeStyle = "#1c1c1c";
                  ctx.lineWidth = frame;
                  ctx.strokeRect(x + frame / 2, y + frame / 2, w - frame, h - frame);
                  ctx.lineWidth = frame * 0.6;
                  ctx.beginPath();
                  ctx.moveTo(x + w / 2, y);
                  ctx.lineTo(x + w / 2, y + h);
                  ctx.moveTo(x, y + h / 2);
                  ctx.lineTo(x + w, y + h / 2);
                  ctx.stroke();
                }}
              />
            </Layered>
            <Spacer />
            <Horizontal size={rowH}>
              {spec.year > 0 ? (
                <Pad size={badgeW + W * 0.045} right={W * 0.045}>
                  <Layered>
                    <Raw
                      cb={(ctx, x, y, w, h) => {
                        ctx.fillStyle = yearHex;
                        ctx.strokeStyle = "#1c1c1c";
                        ctx.lineWidth = frame * 0.8;
                        ctx.beginPath();
                        ctx.roundRect(x + frame * 0.4, y + frame * 0.4, w - frame * 0.8, h - frame * 0.8, w * 0.04);
                        ctx.fill();
                        ctx.stroke();
                      }}
                    />
                    <Text fill={this.playerColor === "yellow" ? "#151515" : "#fff"} fontSize={rowH * 0.5} fontWeight="normal" fontFamily="Quicksand, sans-serif">
                      {String(spec.year)}
                    </Text>
                  </Layered>
                </Pad>
              ) : (
                <Spacer size={0} />
              )}
              <Layered>
                <Raw
                  cb={(ctx, x, y, w, h) => {
                    ctx.fillStyle = "#fbfbf8";
                    ctx.strokeStyle = "#1c1c1c";
                    ctx.lineWidth = frame;
                    ctx.fillRect(x, y, w, h);
                    ctx.strokeRect(x + frame / 2, y + frame / 2, w - frame, h - frame);
                    if (spec.clocks === 0) {
                      ctx.fillStyle = "#1c1c1c";
                      ctx.fillRect(x + w / 2 - h * 0.09, y + h / 2 - h * 0.035, h * 0.18, h * 0.07);
                    }
                  }}
                />
                {spec.clocks > 0 ? (
                  <Pad top={rowH * 0.2} bottom={rowH * 0.2} right={rowH * 0.2}>
                    <Horizontal>
                      <Spacer />
                      {Array.from({ length: spec.clocks }, (_, i) => (
                        <Pad key={i} size={rowH * 0.66} left={rowH * 0.1} right={rowH * 0.1}>
                          <Image image={clockIconArt} />
                        </Pad>
                      ))}
                    </Horizontal>
                  </Pad>
                ) : (
                  <Layered>{[]}</Layered>
                )}
              </Layered>
            </Horizontal>
          </Vertical>
        </Pad>
        <Raw
          cb={(ctx, x, y, w, h) => {
            // The card's rounded cut edge.
            ctx.strokeStyle = "#d4d1c8";
            ctx.lineWidth = Math.max(2, W * 0.006);
            ctx.beginPath();
            ctx.roundRect(x + 1, y + 1, w - 2, h - 2, W * 0.05);
            ctx.stroke();
          }}
        />
      </Layered>
    );
  }
}

// Card backs: the real backs — the title over a photograph of an early motor car in the
// deck's colour, and the neutral deck's black back with the gold title (mod files 125–133).
export class CardBack extends ParameterizedCanvas {
  playerColor: PlayerColor | "neutral" = "neutral";
  width = 300;
  height = 420;

  render() {
    return <Image image={cardBackArt(this.playerColor)} fill />;
  }
}

