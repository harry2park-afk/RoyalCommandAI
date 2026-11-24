"use client";
import {useSyncExternalStore} from "react";
const query="(min-width: 761px)";
function subscribe(change:()=>void){const media=window.matchMedia(query);media.addEventListener("change",change);return()=>media.removeEventListener("change",change);}
export function useWideRoomLayout(){return useSyncExternalStore(subscribe,()=>window.matchMedia(query).matches,()=>false);}
