import React, { useEffect, useRef, useState } from "react";
import { DropdownChit, ImageSpec } from "@pretty-chitty/core";
import {
  CAPACITY_MAX,
  CarType,
  carTypeLabel,
  carTypes,
  Dimension,
  dimensionHex,
  dimensionLabel,
  dimensions,
  GANTT_PUNCH_CLOCK,
  saleBonus,
  Segment,
  station,
  STATIONS,
  stepHex,
  TRACK_SLOTS,
  trackSlotStation,
  WINDOW_DIMENSIONS,
} from "../consts";
import { stationArt } from "../art";
import { dealerBrochure } from "../phases/phase4PrintBrochures";
import type { Root } from "./Root";
import type { Player } from "./Player";

// The player aid (references/player-aid.md): the box's reference sheet made live. Every number
// is read through the rules' own functions (dealerBrochure, accessibleSlots, segmentPrice,
// engineeringOrder). Phase 3 is simultaneous, so the aid cannot be refreshed from a prompt: the
// body watches the table while it is open and redraws when its facts change.

const PHASES: { name: string; order: string; what: string }[] = [
  { name: "Research", order: "Engineering order", what: "One step per research department: any marker, or your own assembly capacity." },
  { name: "Set focus", order: "Most Gantt charts first", what: "Take an open focus slot (spending your Gantt charts) or pass and keep them." },
  { name: "Build factory", order: "Everyone at once", what: "Add stations, mainlines, dealerships and departments; then place a floor expansion." },
  { name: "Print sales brochures", order: "Automatic", what: "Planning departments add Gantt charts; each dealer publishes specs and a window size." },
  { name: "Sell, sell, sell!", order: "Sales order, in rounds", what: "Place a window or use one, and sell to every buyer you can supply in one niche." },
  { name: "Finish?", order: "Automatic", what: "The game ends if the timecard has flipped, or after year 7." },
  { name: "Advance expectations", order: "Automatic", what: "The obsolete track leaves (its minimum rises); the most innovative off-board track enters." },
  { name: "Grow demand", order: "Engineering order", what: "Play a card face down on a quadrant; sparks bring buyers; neutral cards add more." },
];

function Icon({ image, h = 18, title }: { image: ImageSpec; h?: number; title?: string }) {
  const b = image.primary.bounds;
  const s = h / b.height;
  return (
    <span className="aid-ic" title={title} style={{ width: Math.round(b.width * s), height: h }}>
      <img src={image.primary.file} alt={title ?? ""} style={{ left: -b.x * s, top: -b.y * s, transform: `scale(${s})` }} />
    </span>
  );
}

const Dim = ({ d, n }: { d: Dimension; n?: number | string }) => (
  <span className="aid-dim" style={{ background: dimensionHex(d) }}>
    {dimensionLabel(d)}
    {n !== undefined ? ` ${n}` : ""}
  </span>
);

interface Facts {
  ready: boolean;
  year: number;
  phase: number;
  me?: {
    wealth: number;
    rank: number;
    players: number;
    focusSlot?: number;
    gantt: number;
    ganttPerYear: number;
    capacity: number;
    research: number;
    expansionsPlaced: number;
    expansionsLeft: number;
    playable: number;
    hand: number;
    dealers: { name: string; size: string; specs: Record<Dimension, number>; types: CarType[]; short: Dimension[] }[];
    tracks: { d: Dimension; mine: number; own: number[]; patents: number[] }[];
  };
  axes: { d: Dimension; min: number }[];
  minSpecs: { d: Dimension; v: number }[];
  prices: { seg: Segment; price?: number; buyers: Record<CarType, number> }[];
  timecard: number;
  flipped: boolean;
  standings: { name: string; wealth: number; focus?: number }[];
}

function facts(root: Root, playerId: string): Facts {
  const m = root.market;
  const players = root.players.copy();
  const ready = !!m && m.niches.length > 0 && !!root.clock && root.clock.timecard.length > 0;
  const base: Facts = { ready, year: root.year, phase: root.playerAid.phase, axes: [], minSpecs: [], prices: [], timecard: 0, flipped: false, standings: [] };
  if (!ready) return base;
  if (m.bottomTrack) base.axes.push({ d: m.bottomAxis.dimension, min: m.bottomAxis.min });
  if (m.leftTrack) base.axes.push({ d: m.leftAxis.dimension, min: m.leftAxis.min });
  base.minSpecs = dimensions.filter((d) => m.minSpec(d) > 0).map((d) => ({ d, v: m.minSpec(d) }));
  for (const seg of [4, 3, 2, 1] as Segment[]) {
    const buyers: Record<CarType, number> = { car: 0, sports: 0, truck: 0 };
    for (const n of m.niches.filter((x) => x.segment() === seg)) for (const t of carTypes) buyers[t] += n.buyersOf(t).length;
    base.prices.push({ seg, price: m.segmentPrice(seg), buyers });
  }
  base.timecard = root.clock.timecardValue();
  base.flipped = root.clock.timecardFlipped();
  // P6.4: most wealth; ties to the higher sales focus.
  base.standings = players
    .map((p) => ({ name: p.name ?? p.playerColor, wealth: p.wealth.value, focus: root.office.focusSlot(p.playerId) ?? root.office.historicalSlot(p.playerId) }))
    .sort((a, b) => b.wealth - a.wealth || (b.focus ?? 0) - (a.focus ?? 0));
  const me = players.find((p) => p.playerId === playerId) as Player | undefined;
  if (!me) return base;
  const f = me.factory;
  const placed = f.placedTiles();
  const count = (k: string, t?: string) => placed.filter((x) => x.kind === k && (!t || x.departmentType === t)).length;
  const access = root.accessibleSlots(me);
  base.me = {
    wealth: me.wealth.value,
    rank: root.office.engineeringRank(me, players),
    players: players.length,
    focusSlot: root.office.focusSlot(me.playerId),
    gantt: me.gantt.value,
    ganttPerYear: count("department", "planning"),
    capacity: me.capacity.value,
    research: count("department", "research"),
    expansionsPlaced: f.expansionsPlaced,
    expansionsLeft: f.expansionsLeft,
    playable: me.hand.cards.filter((c) => c.spec().year <= f.expansionsPlaced).length,
    hand: me.hand.cards.length,
    dealers: placed
      .filter((t) => t.kind === "dealership")
      .map((d) => {
        const b = dealerBrochure(f, d, m);
        return { name: d.label(), size: b.size, specs: b.specs, types: b.types, short: dimensions.filter((x) => b.specs[x] < m.minSpec(x)) };
      }),
    tracks: root.allTracks().map((t) => {
      const mine = t.positionOf(me.playerId);
      const own: number[] = [];
      const patents: number[] = [];
      for (let s = 1; s <= TRACK_SLOTS; s++) {
        if (mine >= s) own.push(s);
        else if (access.has(`${t.dimension}:${s}`)) patents.push(s);
      }
      return { d: t.dimension, mine, own, patents };
    }),
  };
  return base;
}

function Body({ aid, playerId }: { aid: PlayerAid; playerId: string }) {
  const box = useRef<HTMLDivElement>(null);
  const read = () => {
    const root = aid.parent as unknown as Root | undefined;
    return root ? facts(root, playerId) : ({ ready: false } as Facts);
  };
  const [json, setJson] = useState(() => JSON.stringify(read()));
  useEffect(() => {
    const id = setInterval(() => {
      if (!box.current || box.current.getBoundingClientRect().bottom <= 0) return; // closed: parked above the screen
      setJson(JSON.stringify(read()));
    }, 300);
    return () => clearInterval(id);
  });
  const x: Facts = JSON.parse(json);
  return (
    <div ref={box} className="aid">
      <style>{CSS}</style>
      <div className="aid-cols">
        <div className="stack">
          <section className="o1">
            <h3>The year</h3>
            <ol className="aid-phases">
              {PHASES.map((p, i) => (
                <li key={p.name} className={i + 1 === x.phase ? "now" : ""}>
                  <b>{p.name}</b> <i>{p.order}</i>
                  <span className="why">{p.what}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
        <div className="stack">
          {x.me && (
            <section className="o2">
              <h3>Right now, for you</h3>
              <table className="aid-kv">
                <tbody>
                  <tr><td>Wealth</td><td><b>${x.me.wealth}</b></td></tr>
                  <tr><td>Engineering rank</td><td>{x.me.rank} of {x.me.players}{x.me.rank === 1 ? ": patents give you anything another player researched" : x.me.rank < x.me.players ? `: patents give you slots ${x.me.rank} others have reached` : ": your own research only"}</td></tr>
                  <tr><td>Gantt charts</td><td>{x.me.gantt} <span className="why">(+{x.me.ganttPerYear} a year; reaching {GANTT_PUNCH_CLOCK} punches the clock)</span></td></tr>
                  <tr><td>Research actions</td><td>{x.me.research} a year</td></tr>
                  <tr><td>Assembly capacity</td><td>{x.me.capacity} car{x.me.capacity === 1 ? "" : "s"} per mainline a year{x.me.capacity >= CAPACITY_MAX ? " (the most)" : ""}</td></tr>
                  <tr><td>Floor expansions</td><td>{x.me.expansionsPlaced} placed, {x.me.expansionsLeft} left</td></tr>
                  <tr><td>Market cards</td><td>{x.me.playable} of {x.me.hand} playable <span className="why">(a card's year ≤ expansions placed)</span></td></tr>
                </tbody>
              </table>
              {x.me.dealers.length > 0 && (
                <>
                  <h4>Your dealers would publish</h4>
                  {x.me.dealers.map((d) => (
                    <div key={d.name} className="aid-dealer">
                      <b>{d.name}</b>{" "}
                      {d.size === "none" ? (
                        <span className="bad">no window{d.short.length ? `: short of ${d.short.map(dimensionLabel).join(", ")}` : ": no mainline"}</span>
                      ) : (
                        <span>
                          {WINDOW_DIMENSIONS[d.size as "S"].w}×{WINDOW_DIMENSIONS[d.size as "S"].h} window, {d.types.map(carTypeLabel).join(" and ")}
                        </span>
                      )}
                      <div className="chips">{dimensions.filter((k) => d.specs[k] > 0).map((k) => <Dim key={k} d={k} n={d.specs[k]} />)}</div>
                    </div>
                  ))}
                </>
              )}
            </section>
          )}
          {x.ready && (
            <section className="o3">
              <h3>If the game ended now</h3>
              <ol className="aid-standings">
                {x.standings.map((s) => (
                  <li key={s.name}>
                    {s.name} <b>${s.wealth}</b>
                  </li>
                ))}
              </ol>
              <p className="why">Most wealth wins; a tie goes to the higher sales focus. The game ends after year 7, or sooner once the timecard flips: it is on <b>{x.timecard}</b>{x.flipped ? " (flipped: this is the last year)" : ""}.</p>
            </section>
          )}
        </div>
        <div className="stack">
          {x.ready && (
            <section className="o4">
              <h3>The market</h3>
              <div className="chips">
                {x.axes.map((a) => <Dim key={a.d} d={a.d} n={`${a.min}–${a.min + 3}`} />)}
              </div>
              <p className="why">Each niche asks the specs on its row and column. Off-board dimensions only ask their minimum:</p>
              <div className="chips">{x.minSpecs.length ? x.minSpecs.map((s) => <Dim key={s.d} d={s.d} n={`min ${s.v}`} />) : <i>no minimums yet</i>}</div>
              <table className="aid-prices">
                <thead><tr><th>Segment</th><th>Price</th><th>Cars</th><th>Sports</th><th>Trucks</th></tr></thead>
                <tbody>
                  {x.prices.map((p) => (
                    <tr key={p.seg}>
                      <td>{["", "I (cheapest)", "II", "III", "IV (dearest)"][p.seg]}</td>
                      <td>{p.price ? `$${p.price}` : "—"}</td>
                      {carTypes.map((t) => <td key={t}>{p.buyers[t] || ""}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="why">A buyer pays the segment's price; trucks +${saleBonus("truck")}, sports cars +${saleBonus("sports")}.</p>
            </section>
          )}
          {x.me && (
            <section className="o5">
              <h3>Your technology access</h3>
              <table className="aid-access">
                <tbody>
                  {x.me.tracks.map((t) => (
                    <tr key={t.d}>
                      <td><Dim d={t.d} /></td>
                      <td>
                        {Array.from({ length: TRACK_SLOTS }, (_, i) => i + 1).map((s) => {
                          const st = station(trackSlotStation(t.d, s));
                          const cls = t.own.includes(s) ? "own" : t.patents.includes(s) ? "patent" : "none";
                          return (
                            <span key={s} className={`slot ${cls}`} title={`${st.label} (${s})`}>
                              <Icon image={stationArt[st.id]} h={20} title={st.label} />
                            </span>
                          );
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="why">Bright: your own research. Ringed: through patents. Dim: not yet.</p>
            </section>
          )}
        </div>
      </div>
      <section className="wide">
        <h3>Technology stations</h3>
        <div className="aid-stations">
          {STATIONS.map((s) => (
            <div key={s.id} className="st">
              <Icon image={stationArt[s.id]} h={30} title={s.label} />
              <div>
                <b>{s.label}</b> <span className="step" style={{ background: stepHex(s.step), color: s.step === "C" || s.step === "D" ? "#fff" : "#222" }}>{s.step}</span> {s.footprint.w}×{s.footprint.h}
                <div className="chips">{s.slots.map((sl) => <Dim key={`${sl.dimension}${sl.slot}`} d={sl.dimension} n={sl.slot} />)}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const CSS = `
.aid{container-type:inline-size;font-size:13px;line-height:1.35;color:#222}
.aid h3{font-family:'Roboto Slab',Georgia,serif;font-size:15px;margin:0 0 6px}
.aid h4{font-size:12px;margin:8px 0 4px;text-transform:uppercase;letter-spacing:.04em;color:#555}
.aid section{background:#f4f1ea;border-radius:8px;padding:10px 12px}
.aid-cols{display:grid;grid-template-columns:1fr;gap:10px}
.stack{display:flex;flex-direction:column;gap:10px}
@container (min-width:720px){.aid-cols{grid-template-columns:1fr 1fr}}
@container (min-width:1080px){.aid-cols{grid-template-columns:1fr 1.1fr 1.1fr}}
@container (max-width:719px){.stack{display:contents}.o2{order:1}.o1{order:2}.o3{order:3}.o4{order:4}.o5{order:5}.why{display:none}}
.aid .wide{margin-top:10px}
.aid-phases{margin:0;padding-left:20px}
.aid-phases li{margin:2px 0}
.aid-phases li.now{background:#ffe9b0;border-radius:4px}
.aid-phases i{color:#666;font-size:12px}
.aid-phases .why{display:block;color:#444}
.aid-kv td{padding:1px 8px 1px 0;vertical-align:top}
.aid-kv td:first-child{color:#555;white-space:nowrap}
.why{color:#555}
.chips{display:flex;flex-wrap:wrap;gap:3px;margin:3px 0}
.aid-dim{display:inline-block;color:#fff;border-radius:3px;padding:0 5px;font-size:12px;font-weight:600}
.aid-dealer{margin:4px 0}
.bad{color:#a12}
.aid-prices{border-collapse:collapse;margin-top:6px}
.aid-prices td,.aid-prices th{padding:1px 8px 1px 0;text-align:left;font-size:12px}
.aid-access td{padding:2px 6px 2px 0}
.slot{display:inline-block;margin-right:3px;border-radius:3px;padding:1px}
.slot.own{outline:2px solid #2c7a3d}
.slot.patent{outline:2px dashed #2c56b8}
.slot.none{opacity:.3}
.aid-ic{display:inline-block;position:relative;overflow:hidden;vertical-align:-.25em}
.aid-ic img{position:absolute;max-width:none;width:auto;height:auto;transform-origin:0 0;display:block}
.aid-stations{columns:3 220px;column-gap:14px}
.aid-stations .st{display:flex;gap:8px;align-items:flex-start;break-inside:avoid;margin-bottom:6px}
.step{display:inline-block;border-radius:3px;padding:0 4px;font-weight:700;font-size:11px}
.aid-standings{margin:0 0 4px;padding-left:20px}
`;

export class PlayerAid extends DropdownChit {
  public year = 0; // 0 during setup (S10)
  public phase = 0; // 0 during setup: no phase highlighted

  renderLabel() {
    return this.year === 0 ? "Setup" : `Year ${this.year} · ${PHASES[this.phase - 1]?.name ?? ""}`;
  }

  renderBody(playerId: string) {
    return <Body aid={this} playerId={playerId} />;
  }
}
