import type { ReactNode } from "react";
import RoomBuilderScrollUnlock from "./RoomBuilderScrollUnlock";
import CommandRoomReturnButton from "./CommandRoomReturnButton";
import RoomBuilderAIFormAssistant from "./RoomBuilderAIFormAssistant";
import RoomGuideLiveInputMirror from "./RoomGuideLiveInputMirror";

export default function RoomBuilderLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <RoomBuilderScrollUnlock />
      <CommandRoomReturnButton />
      <RoomBuilderAIFormAssistant />
      <RoomGuideLiveInputMirror />
      <style>{`
        aside:has(img[src="/ai-helper-woman.svg"]) > div[class~="-mt-[84px]"] {
          margin-top: -42px !important;
        }

        @media (min-width: 1024px) {
          .rc-room-builder-workspace {
            width: calc(100vw - 600px) !important;
            max-width: calc(100vw - 600px) !important;
            padding-right: 0 !important;
            box-sizing: border-box !important;
          }
          .rc-room-builder-workspace > main {
            width: 100% !important;
            max-width: 100% !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
            box-sizing: border-box !important;
          }
        }
      `}</style>
      <div className="rc-room-builder-workspace w-full">{children}</div>
    </>
  );
}
