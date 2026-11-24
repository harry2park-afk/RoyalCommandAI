import { NextResponse } from "next/server";
import { getAvailableProviderIds, isProviderConfigured, listConnectors } from "@/lib/ai/connectors";
import { PROVIDER_LABELS } from "@/lib/ai/types";
import { isDemoMode } from "@/lib/utils";

export async function GET() {
  const connectors = listConnectors().map((c) => {
    const configured = isProviderConfigured(c.id);
    return {
      id: c.id,
      name: PROVIDER_LABELS[c.id],
      configured,
      available: configured || isDemoMode(),
    };
  });

  return NextResponse.json({
    demoMode: isDemoMode(),
    availableProviderIds: getAvailableProviderIds(),
    connectors,
  });
}
