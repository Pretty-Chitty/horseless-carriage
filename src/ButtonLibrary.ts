import { GameButton, ToggleGalleryButton } from "@pretty-chitty/core";
import CheckIcon from "@mui/icons-material/Check";
import SkipNextIcon from "@mui/icons-material/SkipNext";
import RotateRightIcon from "@mui/icons-material/RotateRight";
import FlipIcon from "@mui/icons-material/Flip";
import UndoIcon from "@mui/icons-material/Undo";
import AddLinkIcon from "@mui/icons-material/AddLink";
import AddBoxIcon from "@mui/icons-material/AddBox";
import ViewModuleIcon from "@mui/icons-material/ViewModule";
import PeopleIcon from "@mui/icons-material/People";
import StyleIcon from "@mui/icons-material/Style";
import PrecisionManufacturingIcon from "@mui/icons-material/PrecisionManufacturing";

// Every button has its own label and its own icon, so no two look alike in the action bar.

export class DoneButton extends GameButton {
  override label = "Done";
  override icon = CheckIcon;
}
export class PassButton extends GameButton {
  override label = "Pass";
  override icon = SkipNextIcon;
}
export class RotateButton extends GameButton {
  override label = "Rotate";
  override icon = RotateRightIcon;
}
export class FlipButton extends GameButton {
  override label = "Flip";
  override icon = FlipIcon;
}
// Removes the selected piece from the floor (it goes back to the stock).
export class TakeBackButton extends GameButton {
  override label = "Take back";
  override icon = UndoIcon;
}
// One button for spec indicators; when the station could take more than one, a picker opens.
export class AddSpecButton extends GameButton {
  override label = "Add spec";
  override icon = AddLinkIcon;
}
// Opens the gallery of components the player can still build (developer decision). It does
// not open by itself on every prompt; the player opens it when they want something.
export class AddItemButton extends ToggleGalleryButton {
  override label = "Add";
  override icon = AddBoxIcon;
  override autoShow = false;
  override toggleSmallSize = 130;
}
// The picker for which spec indicator to add; opens straight away.
export class SpecPickerButton extends ToggleGalleryButton {
  override label = "Specs";
  override icon = ViewModuleIcon;
  override toggleSmallSize = 110;
}
// Which player's marker to move when several share the chosen research space; opens at once.
export class MarkerPickerButton extends ToggleGalleryButton {
  override label = "Markers";
  override icon = PeopleIcon;
  override toggleSmallSize = 90;
}
// The player's hand of market growth cards, shown as a small gallery when playing a card.
export class HandButton extends ToggleGalleryButton {
  override label = "Hand";
  override icon = StyleIcon;
  override toggleSmallSize = 110;
}
// Phase 1: spend a research step on your own assembly capacity (P1.3).
export class CapacityButton extends GameButton {
  override label = "Capacity";
  override icon = PrecisionManufacturingIcon;
}
