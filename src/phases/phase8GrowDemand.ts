import { Chit, Turn } from "@pretty-chitty/core";
import { Root } from "../chits/Root";
import { decide } from "../decide";
import { Player } from "../chits/Player";
import { Card } from "../chits/Card";
import { HandButton } from "../ButtonLibrary";
import { Car, Spark } from "../chits/Niche";
import { CarType, carTypes, Quadrant, QUADRANTS, SPARK_BUYER_CAP } from "../consts";
import { byQuadrant, carCounts } from "../logText";

type T = Turn<any, Player, Root>;

// "3 :car: sparks": a card's sparks counted by type.
function sparkWords(sparks: { type: CarType; count: number }[]): string {
  const n: Partial<Record<CarType, number>> = {};
  for (const sp of sparks) n[sp.type] = (n[sp.type] ?? 0) + sp.count;
  const total = sparks.reduce((k, sp) => k + sp.count, 0);
  return `${carCounts(n)} spark${total === 1 ? "" : "s"}`;
}

// Phase 8 — Grow demand (RULES.md P8).
export async function executeGrowDemand(root: Root, turn: T): Promise<void> {
  const market = root.market;
  const players = root.players.copy();
  const quadrantName = (q: Quadrant) => ["I", "II", "III", "IV"][q - 1];
  const topLayer = (q: Quadrant) => Math.max(0, ...market.played.filter((c) => c.quadrant === q).map((c) => c.layer));
  const putDown = (card: Card, q: Quadrant) => {
    card.quadrant = q;
    card.revealed = false;
    card.stack = market.played.filter((c) => c.quadrant === q).length;
    card.layer = topLayer(q) + 1;
    market.played.add(card);
  };

  // P8.8's neutral cards are dealt face down to their quadrants before anyone plays (developer):
  // nobody sees them until they turn, so drawing them first changes nothing but the table, where
  // they lie beside the players' cards and turn with them.
  const neutral: Card[] = [];
  for (const q of [2, 3, ...Array<Quadrant>(Math.max(0, players.length - 2)).fill(1)] as Quadrant[]) {
    const card = await market.neutralDeck.draw();
    if (!card) break;
    putDown(card, q);
    neutral.push(card);
  }
  if (neutral.length) turn.log(`The neutral deck deals ${neutral.length} card${neutral.length === 1 ? "" : "s"} face down`);
  turn.flush();

  // P8.1–P8.4: in engineering order each player plays one card face down next to a quadrant.
  for (const player of root.engineeringOrder()) {
    const playable = player.hand.cards.filter((c) => c.spec().year <= player.factory.expansionsPlaced); // P8.3
    if (playable.length === 0) {
      turn.log(`${player.logKey} has no card they may play yet`); // Q15
      continue;
    }
    await turn.createTurn([root, player], player, async (t) => {
      let card: Card | undefined;
      await decide(t, player, [
        Chit.pick(playable, (c) => { card = c; })
          .message("play a market growth card")
          .help("A card may be played once you have placed at least as many floor expansions as its year number. Its sparks will seed buyers in the quadrant you choose.")
          .focus(player)
          .toggleButton(new HandButton())
          .ai("grow.card"),
      ]);
      for (const q of market.quadrantTargets.copy()) q.active = true;
      await decide(t, player, [
        Chit.pick(market.quadrantTargets, (q) => putDown(card!, q.quadrant))
          .message("choose a quadrant for the card")
          .help("The card's 4×4 grid maps straight onto the quadrant: its top-left cell is the quadrant's top-left niche.")
          .context(card)
          .focus(market)
          .ai("grow.quadrant"),
      ]);
      for (const q of market.quadrantTargets.copy()) q.active = false;
      t.log(`${player.logKey} plays a card face down on quadrant ${quadrantName(card!.quadrant as Quadrant)}`);
      t.flush();
    });
  }

  // What flew out of a card: once it has landed it is pointed back at its niche, since the card
  // is discarded (a reload must not name a chit that is gone).
  const flown: { chit: Spark | Car; home: Chit }[] = [];
  // P8.5, P8.6: quadrant by quadrant, each card turns over and its sparks fly out of it onto
  // their niches, and its punch clocks move the timecard. The neutral cards turn last: they
  // bring buyers, not sparks, and those come after the sparks' (P8.8).
  for (const q of [1, 2, 3, 4] as Quadrant[]) {
    const here = market.played.filter((c) => c.quadrant === q);
    const origin = QUADRANTS.find((s) => s.quadrant === q)!;
    for (const card of [...here.filter((c) => c.ownerId), ...here.filter((c) => !c.ownerId)]) {
      card.revealed = true;
      card.layer = topLayer(q) + 1; // it turns over on top of the pile
      turn.flush();
      if (!card.ownerId) continue;
      const s = card.spec();
      for (const sp of s.sparks) {
        const niche = market.niche(origin.row0 + sp.row - 1, origin.col0 + sp.col - 1);
        // C32: a marker shows one or two sparks; top up a single, then add more markers.
        let left = sp.count;
        const single = niche.sparks.find((x) => x.carType === sp.type && x.count === 1);
        if (single && left > 0) { single.count = 2; left -= 1; }
        while (left > 0) {
          const n = Math.min(2, left) as 1 | 2;
          const spark = new Spark().set((x) => { x.carType = sp.type; x.count = n; x.parentFallback = card; }); // out of the card
          niche.sparks.add(spark);
          flown.push({ chit: spark, home: niche });
          left -= n;
        }
      }
      if (s.clocks) root.clock.punch(s.clocks);
      const owner = players.find((p) => p.playerId === card.ownerId);
      turn.log(`${owner?.logKey ?? "A player"}'s card adds ${s.sparks.length ? sparkWords(s.sparks) : "no sparks"} to quadrant ${quadrantName(q)}${s.clocks ? ` and moves the timecard down ${s.clocks}` : ""}`);
      turn.flush();
    }
  }

  // P8.7: every spark generates a buyer, up to the cap per spark; each rises out of its spark.
  let generated = 0;
  const born: Partial<Record<CarType, number>> = {};
  for (const niche of market.niches.copy()) {
    for (const type of carTypes) {
      const sparks = niche.sparksOf(type);
      if (!sparks) continue;
      const add = Math.max(0, Math.min(sparks, SPARK_BUYER_CAP * sparks - niche.buyersOf(type).length));
      const from = niche.sparks.find((x) => x.carType === type) ?? niche;
      for (let i = 0; i < add; i++) {
        const car = new Car().set((c) => { c.carType = type; c.parentFallback = from; });
        niche.buyers.add(car);
        flown.push({ chit: car, home: niche });
      }
      generated += add;
      born[type] = (born[type] ?? 0) + add;
    }
  }
  if (generated) turn.log(`Sparks bring ${carCounts(born)} new buyer${generated === 1 ? "" : "s"} to the market`);
  turn.flush();

  // P8.8: the neutral cards' buyers, each driving off its card (they ignore the spark cap).
  const placed: { quadrant: number; type: CarType; n: number }[] = [];
  for (const card of neutral) {
    const q = card.quadrant as Quadrant;
    const origin = QUADRANTS.find((s) => s.quadrant === q)!;
    for (const sp of card.spec().sparks) {
      const niche = market.niche(origin.row0 + sp.row - 1, origin.col0 + sp.col - 1);
      for (let i = 0; i < sp.count; i++) {
        const car = new Car().set((c) => { c.carType = sp.type as CarType; c.parentFallback = card; });
        niche.buyers.add(car);
        flown.push({ chit: car, home: niche });
      }
      placed.push({ quadrant: q, type: sp.type as CarType, n: sp.count });
    }
  }
  if (placed.length) turn.log(`Neutral cards place ${byQuadrant(placed)}`);
  turn.flush();

  // P8.4: the players' cards are discarded for good; P8.9: the neutral cards go back and the
  // deck is shuffled. P8.10: prices.
  for (const f of flown) f.chit.parentFallback = f.home;
  for (const card of market.played.filter((c) => !!c.ownerId)) card.removeFromParent();
  for (const card of neutral) { card.revealed = false; card.quadrant = 0; card.stack = 0; card.layer = 0; }
  market.neutralDeck.discard(neutral);
  market.neutralDeck.shuffle();
  market.repriceSegments();
  turn.flush();
}

// Draw one neutral card per listed quadrant, place its buyer there, then reshuffle the deck.
export async function drawNeutralBuyers(root: Root, turn: T, quadrants: Quadrant[], flush = true): Promise<void> {
  const market = root.market;
  const drawn: Card[] = [];
  const placed: { quadrant: number; type: CarType; n: number }[] = [];
  for (const q of quadrants) {
    const card = await root.market.neutralDeck.draw();
    if (!card) break;
    drawn.push(card);
    const origin = QUADRANTS.find((s) => s.quadrant === q)!;
    for (const sp of card.spec().sparks) {
      const niche = market.niche(origin.row0 + sp.row - 1, origin.col0 + sp.col - 1);
      for (let i = 0; i < sp.count; i++) niche.buyers.add(new Car().set((c) => { c.carType = sp.type as CarType; c.parentFallback = market.neutralDeck; })); // out of the neutral deck
      placed.push({ quadrant: q, type: sp.type as CarType, n: sp.count });
    }
  }
  if (placed.length) turn.log(`Neutral cards place ${byQuadrant(placed)}`);
  root.market.neutralDeck.discard(drawn);
  root.market.neutralDeck.shuffle(); // P8.9
  if (flush) turn.flush(); // at game setup the whole table appears in one first frame
}
