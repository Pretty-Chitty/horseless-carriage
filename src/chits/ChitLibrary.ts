import { IChitLibrary } from "@pretty-chitty/core";

import { Card } from "./Card";
import { Hand } from "./Card";
import { NeutralDeck } from "./Card";
import { Catalogue } from "./Catalogue";
import { Timecard } from "./ClockBoard";
import { ClockBoard } from "./ClockBoard";
import { CapacityStrip } from "./ClockBoard";
import { CounterChit } from "./CounterChit";
import { DropTarget } from "./DropTarget";
import { Factory } from "./Factory";
import { FactoryTile } from "./FactoryTile";
import { FloorTile } from "./FloorTile";
import { MarketBoard } from "./MarketBoard";
import { SpecAxis } from "./MarketPieces";
import { MarketWindow } from "./MarketPieces";
import { WindowTarget } from "./MarketPieces";
import { QuadrantTarget } from "./MarketPieces";
import { MinSpecMarker } from "./MarketPieces";
import { ObsolescenceMarker } from "./MarketPieces";
import { Car } from "./Niche";
import { Spark } from "./Niche";
import { Niche } from "./Niche";
import { OfficeSpace } from "./OfficeSpace";
import { PlanningOffice } from "./PlanningOffice";
import { Player } from "./Player";
import { PlayerAid } from "./PlayerAid";
import { ReachZone } from "./ReachZone";
import { ResearchArea } from "./ResearchArea";
import { BrandPiece } from "./ResearchTrack";
import { TrackSlot } from "./ResearchTrack";
import { InnovationIndicator } from "./ResearchTrack";
import { ResearchTrack } from "./ResearchTrack";
import { Root } from "./Root";
import { SpecCube } from "./SpecCube";
import { SpecIndicator } from "./SpecIndicator";
import { SupplyStack } from "./SupplyArea";
import { SupplyArea } from "./SupplyArea";

export const ChitLibrary: IChitLibrary<Player, Root> = {
  Card,
  Hand,
  NeutralDeck,
  Catalogue,
  Timecard,
  ClockBoard,
  CapacityStrip,
  CounterChit,
  DropTarget,
  Factory,
  FactoryTile,
  FloorTile,
  MarketBoard,
  SpecAxis,
  MarketWindow,
  WindowTarget,
  QuadrantTarget,
  MinSpecMarker,
  ObsolescenceMarker,
  Car,
  Spark,
  Niche,
  OfficeSpace,
  PlanningOffice,
  Player,
  PlayerAid,
  ReachZone,
  ResearchArea,
  BrandPiece,
  TrackSlot,
  InnovationIndicator,
  ResearchTrack,
  Root,
  SpecCube,
  SpecIndicator,
  SupplyStack,
  SupplyArea,
};
