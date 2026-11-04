import { Mesh, MeshPhongMaterial, PlaneGeometry } from "three";
import { Chit, ChitRenderSpec, Ordered, OrderedOutlet } from "@pretty-chitty/core";
import { FactoryTile } from "./FactoryTile";
import { SpecIndicator } from "./SpecIndicator";

// One player's build catalogue (UX6): the "Add" entries — one per kind they may build
// this year, with how many are left — and the choices of the Add spec picker. It hangs off the
// root and is in no panel, so these pieces exist only in galleries and can never catch a click
// on the table. A player's build turn locks it along with their own panel.
export class Catalogue extends Chit {
  playerId = "";
  @Ordered entries = new OrderedOutlet<FactoryTile>();
  @Ordered previews = new OrderedOutlet<SpecIndicator>();

  render(spec: ChitRenderSpec): void {
    spec.object = new Mesh(new PlaneGeometry(0.01, 0.01), new MeshPhongMaterial({ transparent: true, opacity: 0 }));
    spec.worthSlidingToPanelToShowChange = false;
  }
}
