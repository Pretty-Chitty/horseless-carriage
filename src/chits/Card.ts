import { BoxGeometry, Mesh, MeshPhongMaterial, PlaneGeometry } from "three";
import { CardMesh, Chit, ChitRenderSpec, GameDeckChit, HiddenPropertySerializationRule, Ordered, OrderedOutlet } from "@pretty-chitty/core";
import { playerHex, outlineFor, TABLE_Z, FLOOR_THICKNESS, BOARD_THICKNESS, CARD_H, CARD_W, CardSpec, NEUTRAL_DECK, MARKET_EDGE, PLAYER_DECK, PlayerColor, Quadrant, AXIS_HEIGHT, TRACK_HEIGHT, flipLift } from "../consts";
import { CardBack, CardFace } from "../canvas/CardFace";
import { MarketBoard } from "./MarketBoard";

// The gap between the board's corner and a played card's (both ways).
const CARD_GAP = 0.1;

export function cardSpecOf(id: string): CardSpec {
  const c = [...PLAYER_DECK, ...NEUTRAL_DECK].find((x) => x.id === id);
  if (!c) throw new Error(`unknown card ${id}`);
  return c;
}

// A market growth card (C33, C34). In a hand it is hidden from everyone but its owner; played
// face down next to a quadrant it stays hidden until phase 8 reveals it (P8.2, P8.5).
export class Card extends Chit {
  cardId = "P1";
  playerColor: PlayerColor | "neutral" = "neutral";
  ownerId = "";
  quadrant: Quadrant | 0 = 0; // where it was played
  stack = 0; // its place in that quadrant's pile, from the bottom (set when it goes down)
  layer = 0; // its height in the pile: each card put down or turned over lies above the ones before
  revealed = false;

  override functionallyIdentical(): boolean {
    return false;
  }

  spec(): CardSpec {
    return cardSpecOf(this.cardId);
  }

  override hiddenPropertiesForSerialization(playerIds: string[]): HiddenPropertySerializationRule[] | undefined {
    if (this.parent instanceof Hand) return [{ fields: ["cardId"], playerIds: playerIds.filter((id) => id !== this.ownerId) }];
    if (this.parent instanceof MarketBoard && !this.revealed) return [{ fields: ["cardId"], playerIds: playerIds.filter((id) => id !== this.ownerId) }];
    if (this.parent instanceof NeutralDeck) return [{ fields: ["cardId"], playerIds }];
    return undefined;
  }

  render(spec: ChitRenderSpec): void {
    const back = new CardBack().set((b) => (b.playerColor = this.playerColor)).material;
    const hidden = !this.cardId;
    const front = hidden ? back : new CardFace().set((f) => { f.cardId = this.cardId; f.playerColor = this.playerColor; }).material;
    spec.object = new CardMesh(CARD_W, CARD_H, front, back);
    spec.object.castShadow = true;
    spec.highlight.color = this.parent instanceof MarketBoard && !this.revealed ? outlineFor(this.playerColor === "neutral" ? "#1a1a1a" : playerHex(this.playerColor)) : outlineFor("#f6f4ee");
    spec.showDetailsOnLongPress = true;
    spec.zLiftRotationMultiplier = flipLift(CARD_W / 2); // turned over on the table when revealed
    if (this.parent instanceof Hand) {
      // Inside the deck box; the gallery shows the faces.
      spec.offsetZ = -0.4;
    } else if (this.parent instanceof MarketBoard) {
      // Face down just off the quadrant's outer corner (P8.2), diagonally from the board's corner,
      // so it reads as that quadrant's card and not as part of the track beside it (developer).
      // A quadrant's cards pile outward, each a little further from the board, so each shows.
      const q = this.quadrant || 1;
      const left = q === 1 || q === 3;
      const bottom = q === 1 || q === 2;
      const n = Math.min(this.stack, 5);
      spec.offsetX = (left ? -1 : 1) * (MARKET_EDGE + CARD_GAP + CARD_W / 2);
      spec.offsetY = (bottom ? -1 : 1) * (MARKET_EDGE + CARD_GAP + CARD_H / 2 + n * 0.45);
      spec.offsetZ = -BOARD_THICKNESS / 2 + 0.02 + this.layer * 0.04; // on the table beside the board, each higher than the last
      if (!this.revealed) spec.rotateY = Math.PI;
    }
    // A visible card's face says everything (sparks, year, clocks), so it carries no caption
    // or text under it in galleries; only a face-down card needs words.
    if (hidden) spec.summary = "A face-down market growth card.";
    // Galleries size items from these: a card shown at its own proportions, large enough to
    // read in a full-screen gallery (the inline gallery scales it down to fit).
    spec.galleryPreferredWidth = 300;
    spec.galleryPreferredHeight = 420;
  }
}

// A player's hand of market growth cards (C33), kept as a face-down deck in the main floor's
// loading bay (developer decision). The deck itself is the clickable thing: clicking it opens
// the cards as a gallery. The cards lie inside it, out of sight.
export class Hand extends Chit {
  @Ordered cards = new OrderedOutlet<Card>();
  playerColor: PlayerColor | "neutral" = "neutral";
  x = 0; // kept in step by Factory.syncHand: the centre of the main floor's loading bay
  y = 0;

  render(spec: ChitRenderSpec): void {
    const depth = 0.05 + this.cards.length * 0.025;
    const back = new CardBack().set((b) => (b.playerColor = this.playerColor)).material;
    const side = new MeshPhongMaterial({ color: "#f2efe6" });
    spec.object = new Mesh(new BoxGeometry(CARD_W, CARD_H, depth), [side, side, side, side, back, side]);
    spec.object.castShadow = true;
    spec.highlight.color = outlineFor(this.playerColor === "neutral" ? "#1a1a1a" : playerHex(this.playerColor));
    spec.showDetailsOnLongPress = true;
    spec.offsetX = this.x;
    spec.offsetY = -this.y;
    spec.offsetZ = TABLE_Z + FLOOR_THICKNESS; // on the floor's bay
    spec.showChildrenAsGallery();
    spec.summary = `Your market growth cards: ${this.cards.length} left. Click to look through them.`;
    spec.shortSummary = `${this.cards.length} cards`;
  }
}


// The neutral market growth deck (C34, M20): a finite deck drawn from in setup and phase 8,
// reshuffled whole after each use (P8.9).
export class NeutralDeck extends GameDeckChit<Card> {
  render(spec: ChitRenderSpec): void {
    const count = this.stages.reduce((n, s) => n + s.chits.length, 0);
    const face = new CardBack().set((b) => (b.playerColor = "neutral")).material;
    spec.object = new Mesh(new PlaneGeometry(CARD_W, CARD_H), face);
    // On the table to the right of the bottom track, clear of quadrant II's played cards.
    spec.offsetX = MARKET_EDGE + 2.5 + CARD_W / 2;
    spec.offsetY = -MARKET_EDGE - AXIS_HEIGHT - TRACK_HEIGHT / 2 - 0.4;
    spec.offsetZ = -BOARD_THICKNESS / 2 + 0.005;
    spec.summary = `The neutral market growth deck: ${count} card${count === 1 ? "" : "s"} that place spontaneous buyers.`;
  }
}
