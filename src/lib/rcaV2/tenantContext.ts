import { createClient } from "@/lib/supabase/server";

export type RcaTenantContext = {
  configured: boolean;
  verified: boolean;
  roomId: string | null;
  tenantId: string | null;
  reason?: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function verifyRcaBuildTenantContext(): Promise<RcaTenantContext> {
  const roomId = process.env.RCA_BUILD_ROOM_ID?.trim() || "";
  if (!roomId || !UUID_RE.test(roomId)) {
    return {
      configured: false,
      verified: false,
      roomId: null,
      tenantId: null,
      reason: "RCA_BUILD_ROOM_ID is not configured with a valid server Room UUID.",
    };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("rooms")
      .select("id, household_id")
      .eq("id", roomId)
      .maybeSingle();

    if (error || !data?.id || !data.household_id) {
      return {
        configured: true,
        verified: false,
        roomId,
        tenantId: null,
        reason: "The authenticated user cannot verify the configured RCA BUILD Room/Tenant boundary.",
      };
    }

    return {
      configured: true,
      verified: true,
      roomId: data.id,
      tenantId: data.household_id,
    };
  } catch {
    return {
      configured: true,
      verified: false,
      roomId,
      tenantId: null,
      reason: "Tenant Room verification failed closed.",
    };
  }
}
