import { SparkChit } from "@pretty-chitty/core";
import { LabelFace } from "../canvas/LabelFace";

// A labelled per-player number shown in the player bar (LAYOUT.md §2 sparks).
export class CounterChit extends SparkChit {
  label = "";
  short = ""; // the icon's text; the first three letters of the label when empty
  hex = "#444444";

  override get endGameLabel(): string {
    return this.label;
  }

  override get icon() {
    return new LabelFace().set((f) => {
      f.label = this.short || this.label.slice(0, 3);
      f.hex = this.hex;
      f.width = 64;
      f.height = 64;
      f.fontPx = 26;
    }).get();
  }
}
