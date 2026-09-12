import IndependentAIRooms from "../[id]/IndependentAIRooms";
import { notFound } from "next/navigation";
import { DomainRuntimeProvider } from "@/components/DomainRuntimeProvider";
import { getServerDomainRuntimeContext } from "@/lib/runtime/serverDomainContext";
import { toPublicDomainRuntimeContext } from "@/config/countryResolver";

export const metadata = {
  title: "Royal Command AI — Independent Rooms",
};

export default async function RCAIndependentRoomsPage() {
  const runtimeContext = await getServerDomainRuntimeContext();
  if (!runtimeContext) notFound();
  return (
    <DomainRuntimeProvider value={toPublicDomainRuntimeContext(runtimeContext)}>
      <IndependentAIRooms roomId="rca" />
    </DomainRuntimeProvider>
  );
}
