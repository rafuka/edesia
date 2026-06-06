import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client authenticated with the service-role key. Bypasses RLS, so it
 * must ONLY be used in trusted server code after the caller has been authorized
 * (e.g. the public menu's cookie-gated server actions). Never import this into a
 * Client Component — the `server-only` guard turns that into a build error.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set — required for table presence and waiter calls.",
    );
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
