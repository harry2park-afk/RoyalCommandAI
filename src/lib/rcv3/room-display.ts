import type {Button} from "./cloud-state";

// The chat panel is always present below the room. Keep saved chat buttons for
// editing and future restoration, but do not show a duplicate empty shortcut.
export function visibleRoomButtons(buttons:Button[],background:string,editing:boolean,toolboxManager:boolean) {
  return buttons.filter(button => (toolboxManager || button.capability!=="toolbox") && (background || editing || button.capability!=="chat"));
}

export function showRoomCanvas(buttons:Button[],background:string,editing:boolean,placing:boolean) {
  return buttons.length>0 || Boolean(background) || editing || placing;
}
