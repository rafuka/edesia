"use server";

import { cookies } from "next/headers";
import {
  MENU_SESSION_COOKIE,
  type MenuSession,
  verifyMenuSessionToken,
} from "@/lib/menu-session";
import { createAdminClient } from "@/lib/supabase/admin";

type CallResult = { ok: true } | { ok: false; error: string };

/**
 * Returns the diner's live table session if the signed cookie is valid, matches
 * `slug`, and hasn't expired — otherwise null. This is the gate for every public
 * write: no valid scan-derived cookie, no presence/waiter-call row.
 */
async function activeSession(slug: string): Promise<MenuSession | null> {
  const token = (await cookies()).get(MENU_SESSION_COOKIE)?.value;
  const session = token ? await verifyMenuSessionToken(token) : null;
  if (!session || session.slug !== slug || session.exp <= Date.now()) {
    return null;
  }
  return session;
}

async function restaurantIdForSlug(
  admin: ReturnType<typeof createAdminClient>,
  slug: string,
): Promise<string | null> {
  const { data } = await admin
    .from("restaurants")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  return data?.id ?? null;
}

/**
 * Marks the diner's table as "present" (menu open). Called periodically by the
 * menu page while the tab is open; the dashboard shows a green dot for any table
 * seen within TABLE_PRESENCE_TTL_SECONDS.
 */
export async function heartbeat(slug: string): Promise<void> {
  const session = await activeSession(slug);
  if (!session) return;

  const admin = createAdminClient();
  const restaurantId = await restaurantIdForSlug(admin, slug);
  if (!restaurantId) return;

  await admin.from("table_presence").upsert(
    {
      restaurant_id: restaurantId,
      table_number: session.table,
      last_seen: new Date().toISOString(),
    },
    { onConflict: "restaurant_id,table_number" },
  );
}

/**
 * Raises a "call a waiter" request for the diner's table. Idempotent while a
 * call is still unresolved, so repeated taps don't stack duplicate rows.
 */
export async function callWaiter(slug: string): Promise<CallResult> {
  const session = await activeSession(slug);
  if (!session) {
    return {
      ok: false,
      error: "Your session has expired. Please scan the QR code again.",
    };
  }

  const admin = createAdminClient();
  const restaurantId = await restaurantIdForSlug(admin, slug);
  if (!restaurantId) {
    return { ok: false, error: "Restaurant not found." };
  }

  const { data: existing } = await admin
    .from("waiter_calls")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .eq("table_number", session.table)
    .is("resolved_at", null)
    .limit(1)
    .maybeSingle();

  if (!existing) {
    const { error } = await admin.from("waiter_calls").insert({
      restaurant_id: restaurantId,
      table_number: session.table,
    });
    if (error) return { ok: false, error: error.message };
  }

  return { ok: true };
}
