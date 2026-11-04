import { setupTable } from "../table";
import { stationArt } from "../art";
import { CameraSpec, Chit, ChitRenderSpec, Ordered, OrderedOutlet, PanelTab } from "@pretty-chitty/core";
import { ResearchTrack } from "./ResearchTrack";
import type { CapacityStrip } from "./ClockBoard";
import type { Root } from "./Root";

// LAYOUT.md §4 "Research": the three off-board tracks stacked in the order phase 7 breaks
// ties by (S6, P7.9). ResearchTrack positions itself from its outlet index. The assembly
// capacity boxes are printed on the office board; `capacity` reaches them for callers.
export class ResearchArea extends Chit {
  @Ordered offBoard = new OrderedOutlet<ResearchTrack>();

  get capacity(): CapacityStrip {
    return (this.parent as Root).office.capacity;
  }

  public get panelTab(): PanelTab {
    return { icon: stationArt.engine, color: "#4f6b3a" };
  }

  render(spec: ChitRenderSpec): void {
    spec.camera = new CameraSpec();
    spec.camera.paddingTop = 6;
    spec.camera.paddingBottom = 6;
    spec.camera.paddingLeft = 6;
    spec.camera.paddingRight = 6;
    spec.worthSlidingToPanelToShowChange = false;
    setupTable(spec);
    spec.summary = "The off-board research tracks. They only set minimum specs until phase 7 brings one back to the market.";
  }
}
