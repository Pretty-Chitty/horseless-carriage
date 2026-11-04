import { Chit, Turn } from "@pretty-chitty/core";
import { Root } from "../chits/Root";
import { decide } from "../decide";
import { CapacityButton, MarkerPickerButton } from "../ButtonLibrary";
import { Player } from "../chits/Player";
import { BrandPiece, ResearchTrack, TrackSlot } from "../chits/ResearchTrack";
import { CAPACITY_MAX, CAPACITY_PUNCH_CLOCK, TRACK_PUNCH_CLOCK_SLOTS, TRACK_SLOTS, dimensionLabel } from "../consts";

type T = Turn<any, Player, Root>;

// Phase 1 — Research (RULES.md P1).
export async function executeResearch(root: Root, turn: T): Promise<void> {
  const players = root.players.copy();
  // P1.1: highest engineering focus first. All focus markers sit on the historical track now.
  for (const player of root.office.historicalOrder(players)) {
    const actions = player.factory.placedTiles().filter((t) => t.kind === "department" && t.departmentType === "research").length; // P1.2
    if (actions === 0) continue;
    await turn.createTurn([root], player, async (t) => {
      const moved = new Set<Chit>(); // P1.4: never the same marker twice by one player
      let raisedCapacity = false; // …nor their capacity marker
      for (let n = 1; n <= actions; n++) {
        // P1.3: own assembly capacity (a button: capacity is a spark, not a piece on the table),
        // if not at the end (P1.5) and not raised already this turn (P1.4)…
        const canRaise = !raisedCapacity && player.capacity.value < CAPACITY_MAX;
        // …or any research marker on any track, own or another player's.
        const options: Chit[] = [];
        for (const track of root.allTracks()) for (const m of track.markers()) if (!moved.has(m) && m.position < TRACK_SLOTS) options.push(m);
        if (options.length === 0 && !canRaise) {
          t.log(`${player.logKey} has no research marker left to advance`);
          break;
        }
        // The player picks a research slot; when several markers there could move, a small
        // gallery asks which one (developer decision).
        const spaces = [...new Set(options.map((o) => o.parent as Chit))];
        let chosenSpace: Chit | undefined;
        let raise = false;
        await decide(t, player, [
          spaces.length > 0 &&
            Chit.pick(spaces, (sp) => { chosenSpace = sp; })
              .message(`advance a research marker (${n} of ${actions})`)
              .help("One step per research department. You may move any marker on any research track, including another player's, or raise your own assembly capacity — but never the same marker twice yourself. Slots with a punch clock move the timecard down.")
              .focus([root.market, root.research, root.office])
              .ai("research.space"),
          canRaise && new CapacityButton(() => { raise = true; }).pick().message("raise their assembly capacity").ai("research.capacity"),
        ]);
        if (raise) {
          raisedCapacity = true;
          const next = player.capacity.value + 1;
          root.office.moveTo("capacity", player.playerId, next);
          player.capacity.value = next;
          t.log(`${player.logKey} raises their assembly capacity to ${next}`);
          if (next === CAPACITY_PUNCH_CLOCK) root.clock.punch(); // P1.6
          t.flush();
          continue;
        }
        const here = options.filter((o) => o.parent === chosenSpace);
        let chosen: Chit = here[0];
        if (here.length > 1) {
          await decide(t, player, [
            Chit.pick(here, (m) => { chosen = m; })
              .message("choose whose marker to advance")
              .context(chosenSpace)
              .toggleButton(new MarkerPickerButton())
              .ai("research.marker"),
          ]);
        }
        moved.add(chosen);
        const piece = chosen as BrandPiece;
        const track = piece.parent!.parent as ResearchTrack;
        track.advance(piece);
        const owner = players.find((p) => p.playerId === piece.playerId)!;
        t.log(`${player.logKey} advances ${owner === player ? "their own" : `${owner.logKey}'s`} ${dimensionLabel(track.dimension)} research to ${track.slotLabel(piece.position)}`);
        if (TRACK_PUNCH_CLOCK_SLOTS.includes(piece.position)) root.clock.punch(); // P1.6
        t.flush();
      }
    });
  }
}
