import {expect,it} from "vitest";
import {visibleRoomButtons,showRoomCanvas} from "./room-display";
import type {Button} from "./cloud-state";

const chat={id:"00000000-0000-4000-8000-000000000001",capability:"chat",label:"My AI",x:8,y:12,width:24,height:12,opacity:1} as Button;
const files={...chat,id:"00000000-0000-4000-8000-000000000002",capability:"files",label:"Files"} as Button;

it("keeps saved chat controls editable while removing the duplicate from ordinary view",()=>{
  const stored=[chat,files];
  expect(visibleRoomButtons(stored,"",false,false)).toEqual([files]);
  expect(visibleRoomButtons(stored,"",true,false)).toEqual(stored);
  expect(visibleRoomButtons(stored,"/room-designs/office.webp",false,false)).toEqual(stored);
  expect(stored).toEqual([chat,files]);
});
it("does not leave a blank canvas when the only saved control is chat",()=>{
  expect(showRoomCanvas(visibleRoomButtons([chat],"",false,false),"",false,false)).toBe(false);
  expect(showRoomCanvas(visibleRoomButtons([chat],"",true,false),"",true,false)).toBe(true);
  expect(showRoomCanvas([],"/room-designs/office.jpg",false,false)).toBe(true);
});
