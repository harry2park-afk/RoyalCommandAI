import RoomPage from "../../rooms/[id]/page";

export default function RCAExactRoomPage() {
  return (
    <>
      <style>{`
        .royal-room-main main > div.fixed:first-of-type > div:first-child > h1 {
          font-size: 0 !important;
          margin-left: 32px !important;
        }
        .royal-room-main main > div.fixed:first-of-type > div:first-child > h1::after {
          content: "RCA Room" !important;
          font-family: "Times New Roman", serif !important;
          font-size: 20px !important;
          font-weight: 600 !important;
          line-height: 1 !important;
          color: #f4f0e7 !important;
          white-space: nowrap !important;
        }
      `}</style>
      <RoomPage />
    </>
  );
}
