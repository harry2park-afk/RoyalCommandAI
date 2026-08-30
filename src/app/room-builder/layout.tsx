import type { ReactNode } from "react";
import RoomBuilderScrollUnlock from "./RoomBuilderScrollUnlock";
import CommandRoomReturnButton from "./CommandRoomReturnButton";
import RoomBuilderAIFormAssistant from "./RoomBuilderAIFormAssistant";
import RoomGuideLiveInputMirror from "./RoomGuideLiveInputMirror";

const RCA_AUSTRALIA_V2_ROOM_ID = "947e96a7-72b1-4b9c-9230-a29f14e8ea9d";

export default function RoomBuilderLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `(() => {
            const sync = () => {
              const params = new URLSearchParams(window.location.search);
              if (params.get("returnRoom") === "${RCA_AUSTRALIA_V2_ROOM_ID}") {
                document.documentElement.setAttribute("data-rca-australia-v2", "true");
              } else {
                document.documentElement.removeAttribute("data-rca-australia-v2");
              }
            };
            sync();
            window.addEventListener("popstate", sync);
          })();`,
        }}
      />
      <RoomBuilderScrollUnlock />
      <CommandRoomReturnButton />
      <RoomBuilderAIFormAssistant />
      <RoomGuideLiveInputMirror />
      <style>{`
        html[data-rca-australia-v2="true"] aside:has(img[src="/ai-helper-woman.svg"]) > div[class~="-mt-[84px]"] {
          margin-top: -45px !important;
        }
        html[data-rca-australia-v2="true"] aside:has(img[src="/ai-helper-woman.svg"]) img[src="/ai-helper-woman.svg"] {
          transform: translateY(-10px);
        }
        html[data-rca-australia-v2="true"] aside:has(img[src="/ai-helper-woman.svg"]) div:has(> img[src="/ai-helper-woman.svg"])::after {
          content: "";
          position: absolute;
          left: 27%;
          right: 27%;
          bottom: 48px;
          z-index: 20;
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
