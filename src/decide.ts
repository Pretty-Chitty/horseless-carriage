import { Turn } from "@pretty-chitty/core";

// Ask the player, then record that they decided. The server waits for the match to change
// after applying a reply; an answer whose only effect is a local variable (Pass, choosing a
// card before its quadrant, Done, dropping a piece where it already lies) would otherwise
// leave that wait hanging and freeze the seat. Bumping a counter on the player guarantees a
// change for every answer. (Engine: ServerPrompts.resolvePrompt awaits match.onChange.)
export async function decide(turn: Turn<any, any, any>, player: { decisions: number }, ...args: Parameters<Turn<any, any, any>["pick"]>): Promise<void> {
  await turn.pick(...args);
  player.decisions += 1;
}
