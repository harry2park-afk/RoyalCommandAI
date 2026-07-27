import { NextResponse } from "next/server";
import { getAvailableProviderIds, listConnectors } from "@/lib/ai/connectors";
import { PROVIDER_LABELS } from "@/lib/ai/types";
import { isDemoMode } from "@/lib/utils";

export async function GET() {
  const connectors = listConnectors().map((c) => ({
    id: c.id,
    name: PROVIDER_LABELS[c.id],
    configured: c.isConfigured(),
    available: c.isConfigured() || isDemoMode(),
  }));

  return NextResponse.json({
    demoMode: isDemoMode(),
    availableProviderIds: getAvailableProviderIds(),
    connectors,
  });
}
