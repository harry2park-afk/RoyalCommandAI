/** Browser playback gain only; never changes provider audio or microphone input. */
export function clampVolume(value:number){return Number.isFinite(value)?Math.max(0,Math.min(1,value)):0;}
