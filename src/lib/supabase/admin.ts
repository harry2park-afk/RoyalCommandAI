import { createClient as createSupabaseClient } from "@supabase/supabase-js";

type SupabaseAdminEnv = Record<string, string | undefined>;

export type SupabaseAdminConfig = {
  url: string;
  serviceRoleKey: string;
};

export function getSupabaseAdminConfig(env: SupabaseAdminEnv = process.env): SupabaseAdminConfig {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase server admin client is not configured");
  }

  return { url, serviceRoleKey };
}

export function createAdminClient() {
  const { url, serviceRoleKey } = getSupabaseAdminConfig();

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
