import { getCurrentUser } from "@/lib/auth";
import CreateRoomExperience from "./CreateRoomExperience";

export default async function UniversalCreateRoomPage() {
  const user = await getCurrentUser();

  return (
    <CreateRoomExperience
      customer={{
        id: user?.id || "",
        fullName: user?.fullName || "",
        email: user?.email || "",
        defaultLanguage: user?.defaultLanguage || "en",
        phone: "",
        address: "",
      }}
    />
  );
}
