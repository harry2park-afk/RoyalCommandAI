import { createClient } from "@/lib/supabase/server";

export type RcaBuildAuthState = {
  supabaseConfigured: boolean;
  authenticatedUserVerified: boolean;
  userId: string | null;
  reason?: string;
};

export function isSupabaseAuthConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(url) && Boolean(anonKey) && !url?.includes("your-project");
}

export async function verifyRcaBuildAuthenticatedUser(): Promise<RcaBuildAuthState> {
  if (!isSupabaseAuthConfigured()) {
    return {
      supabaseConfigured: false,
      authenticatedUserVerified: false,
      userId: null,
      reason: "Supabase authentication is not configured.",
    };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    const user = data.user;

    if (error || !user) {
      return {
        supabaseConfigured: true,
        authenticatedUserVerified: false,
        userId: null,
        reason: "No verified authenticated user is available for RCA BUILD.",
      };
    }

    return {
      supabaseConfigured: true,
      authenticatedUserVerified: true,
      userId: user.id,
    };
  } catch {
    return {
      supabaseConfigured: true,
      authenticatedUserVerified: false,
      userId: null,
      reason: "Authenticated-user verification failed closed.",
    };
  }
}
