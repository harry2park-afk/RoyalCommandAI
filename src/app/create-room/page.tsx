import { getCurrentUser } from "@/lib/auth";
import FirstMeetingWindowV2 from "./FirstMeetingWindowV2";

export default async function UniversalCreateRoomPage() {
  const user = await getCurrentUser();

  return (
    <FirstMeetingWindowV2
      customer={{
        id: user?.id || "",
        fullName: user?.fullName || "",
        defaultLanguage: user?.defaultLanguage || "en",
        countryCode: user?.countryCode || "",
      }}
    />
  );
}
