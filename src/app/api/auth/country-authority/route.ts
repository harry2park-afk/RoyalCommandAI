import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { FIRST_WAVE_COUNTRY_CODES, getCurrentUser } from "@/lib/auth";
import { logger } from "@/lib/logger";
import {
  isCountryAuthorityAdmin,
  isCountryAuthorityEnabled,
  requestedCountryMatchesAssignment,
} from "@/lib/security/country-authority";
import {
  STEP_UP_COOKIE,
  verifyStepUpToken,
} from "@/lib/security/step-up";
import { createAdminClient } from "@/lib/supabase/admin";

const bodySchema = z.object({
  targetUserId: z.string().uuid(),
  countryCode: z.enum(FIRST_WAVE_COUNTRY_CODES),
});

export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // This server-side kill switch is OFF by default. Country assignment must not
  // become available merely because service-role credentials exist.
  if (!isCountryAuthorityEnabled()) {
    return NextResponse.json(
      {
        error: "Country authority workflow is disabled",
        code: "COUNTRY_AUTHORITY_DISABLED",
      },
      { status: 503 },
    );
  }

  // Do not trust profiles.role here while profile-role authority is still a
  // launch blocker. Use a server-only user-id allowlist instead.
  if (!isCountryAuthorityAdmin(actor.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const cookieStore = await cookies();
  if (!verifyStepUpToken(cookieStore.get(STEP_UP_COOKIE)?.value, actor.id)) {
    return NextResponse.json(
      { error: "Step-up verification required", code: "STEP_UP_REQUIRED" },
      { status: 403 },
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.getUserById(
      parsed.data.targetUserId,
    );
    if (error || !data.user) {
      logger.warn("auth.country_authority.target_lookup_failed", {
        actorUserId: actor.id,
        targetUserId: parsed.data.targetUserId,
        countryCode: parsed.data.countryCode,
      });
      return NextResponse.json({ error: "Target user not found" }, { status: 404 });
    }

    // First-wave assignment is intentionally conservative: the country written
    // to app_metadata must exactly match the country the target user requested
    // at signup. Existing users without a request stay unassigned until a
    // separate, reviewed migration/onboarding path is approved.
    if (!requestedCountryMatchesAssignment(data.user, parsed.data.countryCode)) {
      return NextResponse.json(
        {
          error: "Requested country does not match assignment",
          code: "COUNTRY_REQUEST_MISMATCH",
        },
        { status: 409 },
      );
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(
      parsed.data.targetUserId,
      {
        app_metadata: {
          ...(data.user.app_metadata || {}),
          country_code: parsed.data.countryCode,
        },
      },
    );
    if (updateError) {
      logger.error("auth.country_authority.assignment_failed", {
        actorUserId: actor.id,
        targetUserId: parsed.data.targetUserId,
        countryCode: parsed.data.countryCode,
      });
      return NextResponse.json(
        { error: "Country assignment failed" },
        { status: 500 },
      );
    }

    logger.info("auth.country_authority.assigned", {
      actorUserId: actor.id,
      targetUserId: parsed.data.targetUserId,
      countryCode: parsed.data.countryCode,
    });
    return NextResponse.json({ ok: true, countryCode: parsed.data.countryCode });
  } catch (error) {
    logger.error("auth.country_authority.failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Country authority workflow unavailable" },
      { status: 503 },
    );
  }
}
