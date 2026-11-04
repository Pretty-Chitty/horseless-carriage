import { Chit, Turn } from "@pretty-chitty/core";
import { Root } from "../chits/Root";
import { decide } from "../decide";
import { Player } from "../chits/Player";
import { PassButton } from "../ButtonLibrary";

type T = Turn<any, Player, Root>;

// Phase 2 — Set focus (RULES.md P2).
export async function executeSetFocus(root: Root, turn: T): Promise<void> {
  const players = root.players.copy();
  const office = root.office;
  // P2.2: most Gantt charts first; ties by higher engineering (lower historical slot).
  const hist = office.historicalOrder(players);
  const order = [...players].sort((a, b) => b.gantt.value - a.gantt.value || hist.indexOf(a) - hist.indexOf(b));
  for (const player of order) {
    const open = office.openFocusSlots(players.length); // P2.4
    if (open.length === 0) continue;
    await turn.createTurn([root], player, async (t) => {
      await decide(t, player, [
        Chit.pick(open, (space) => {
          office.moveTo("focus", player.playerId, space.index); // P2.3
          office.moveTo("gantt", player.playerId, 0);
          player.gantt.value = 0;
          player.focusSlot.value = space.index;
          t.log(`${player.logKey} sets their focus to slot ${space.index}${space.index === 1 ? " (engineering)" : space.index === players.length ? " (sales)" : ""}, spending their Gantt charts`);
        })
          .message("set their focus")
          .help(`Slot 1 is the strongest engineering focus and slot ${players.length} the strongest sales focus. Setting focus returns your Gantt charts to 0; passing keeps them (${player.gantt.value}).`)
          .focus(root.office)
          .ai("focus.slot"),
        new PassButton(() => {
          t.log(`${player.logKey} passes and keeps ${player.gantt.value} Gantt chart${player.gantt.value === 1 ? "" : "s"}`);
        }).pick().message("pass").ai("focus.pass"),
      ]);
      t.flush();
    });
  }
  // P2.5: remaining markers move from the historical track to the open slots, keeping order.
  const left = office.historicalOrder(players).filter((p) => office.focusSlot(p.playerId) === undefined);
  for (const p of left) {
    const slot = office.openFocusSlots(players.length)[0];
    office.moveTo("focus", p.playerId, slot.index);
    p.focusSlot.value = slot.index;
  }
  root.syncOrderSparks(); // P2.6
  turn.flush();
}
