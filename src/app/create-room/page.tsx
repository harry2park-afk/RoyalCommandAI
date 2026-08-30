import { getCurrentUser } from "@/lib/auth";
import FirstMeetingWindow from "./FirstMeetingWindow";

export default async function UniversalCreateRoomPage() {
  const user = await getCurrentUser();

  return (
    <FirstMeetingWindow
      customer={{
        id: user?.id || "",
        fullName: user?.fullName || "",
        defaultLanguage: user?.defaultLanguage || "en",
        countryCode: user?.countryCode || "",
      }}
    />
  );
}
