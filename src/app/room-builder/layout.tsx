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
          margin-top: -15px !important;
        }
        aside:has(img[src="/ai-helper-woman.svg"]) img[src="/ai-helper-woman.svg"] {
          transform: translateY(-10px);
        }
        aside:has(img[src="/ai-helper-woman.svg"]) div:has(> img[src="/ai-helper-woman.svg"])::after {
          content: "";
          position: absolute;
          left: 27%;
          right: 27%;
          bottom: 13px;
          height: 2px;
          border-radius: 999px;
          background: linear-gradient(90deg, transparent, #d8b548 12%, #f1d66a 50%, #d8b548 88%, transparent);
          box-shadow: 0 0 4px rgba(241, 214, 106, 0.35);
          pointer-events: none;
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
