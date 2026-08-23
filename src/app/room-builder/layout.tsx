import type { ReactNode } from "react";
import RoomBuilderScrollUnlock from "./RoomBuilderScrollUnlock";
import CommandRoomReturnButton from "./CommandRoomReturnButton";
import RoomBuilderAIFormAssistant from "./RoomBuilderAIFormAssistant";

export default function RoomBuilderLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{`
        aside.fixed textarea::placeholder {
          color: transparent !important;
        }

        aside.fixed form > div:last-child {
          display: none !important;
        }

        aside.fixed form {
          height: 70px !important;
          min-height: 70px !important;
          max-height: 70px !important;
          padding: 0 10px !important;
          border-top: 1px solid rgba(215, 182, 77, 0.28) !important;
          display: block !important;
        }

        aside.fixed form > div:first-child {
          position: relative !important;
          height: 70px !important;
          min-height: 70px !important;
          max-height: 70px !important;
          display: grid !important;
          grid-template-columns: 30px 36px minmax(0, 1fr) 40px !important;
          grid-template-rows: 34px 34px !important;
          column-gap: 7px !important;
          row-gap: 0 !important;
          align-items: center !important;
          padding: 1px 2px !important;
          border-radius: 0 !important;
          background: transparent !important;
        }

        aside.fixed form textarea {
          grid-column: 1 / -1 !important;
          grid-row: 1 !important;
          width: 100% !important;
          height: 32px !important;
          min-height: 32px !important;
          max-height: 32px !important;
          padding: 7px 4px 3px !important;
          margin: 0 !important;
          overflow: hidden !important;
          line-height: 20px !important;
          font-size: 13px !important;
        }

        aside.fixed form > div:first-child::before {
          content: "📎";
          grid-column: 1 !important;
          grid-row: 2 !important;
          width: 28px !important;
          height: 28px !important;
          display: grid !important;
          place-items: center !important;
          font-size: 16px !important;
          color: #d7b64d !important;
          border: 1px solid rgba(215, 182, 77, 0.35) !important;
          border-radius: 50% !important;
          box-sizing: border-box !important;
        }

        aside.fixed form > div:first-child::after {
          content: "▂▅▃▇▆▂▅▇▃▆▂▅▃▇▆▂▅▃";
          grid-column: 3 !important;
          grid-row: 2 !important;
          min-width: 0 !important;
          height: 28px !important;
          display: flex !important;
          align-items: center !important;
          overflow: hidden !important;
          white-space: nowrap !important;
          letter-spacing: 2px !important;
          font-size: 15px !important;
          line-height: 1 !important;
          color: #d7b64d !important;
          opacity: 0.72 !important;
        }

        aside.fixed form button[type="button"] {
          grid-column: 2 !important;
          grid-row: 2 !important;
          width: 30px !important;
          height: 30px !important;
          min-width: 30px !important;
          min-height: 30px !important;
          margin: 0 !important;
          align-self: center !important;
          justify-self: center !important;
        }

        aside.fixed form button[type="submit"] {
          grid-column: 4 !important;
          grid-row: 2 !important;
          width: 32px !important;
          height: 32px !important;
          min-width: 32px !important;
          min-height: 32px !important;
          margin: 0 !important;
          align-self: center !important;
          justify-self: end !important;
        }
      `}</style>
      <RoomBuilderScrollUnlock />
      <CommandRoomReturnButton />
      <RoomBuilderAIFormAssistant />
      {children}
    </>
  );
}
