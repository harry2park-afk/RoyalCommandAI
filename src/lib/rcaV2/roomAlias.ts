import {
  verifyRcaBuildTenantContext,
  type RcaTenantContext,
} from "@/lib/rcaV2/tenantContext";

export type ResolvedRoomRoute = {
  requestedId: string;
  roomId: string;
  isRcaAlias: boolean;
};

type TenantVerifier = () => Promise<RcaTenantContext>;

/**
 * Resolve the UI-only `rca` route alias to the server-owned RCA Room UUID.
 *
 * The alias is fail-closed: it resolves only when the existing authenticated
 * Supabase/RLS tenant boundary verifies the configured RCA_BUILD_ROOM_ID.
 * Other Room IDs are returned unchanged.
 */
export async function resolveRoomRouteId(
  requestedId: string,
  verifyTenant: TenantVerifier = verifyRcaBuildTenantContext,
): Promise<ResolvedRoomRoute | null> {
  if (requestedId !== "rca") {
    return { requestedId, roomId: requestedId, isRcaAlias: false };
  }

  const tenant = await verifyTenant();
  if (!tenant.verified || !tenant.roomId) return null;

  return {
    requestedId,
    roomId: tenant.roomId,
    isRcaAlias: true,
  };
}
