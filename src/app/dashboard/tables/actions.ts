"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRestaurantId } from "@/lib/restaurant";
import { TABLE_PRESENCE_TTL_SECONDS } from "@/lib/menu-session";

type ActionResult = { error?: string };

/** Table numbers with a live menu session (green) and an open waiter call (orange). */
export type TableActivity = { sessions: number[]; calls: number[] };

const TABLES_PATH = "/dashboard/tables";
const MAX_BULK = 100;

/**
 * Bulk-creates `count` dining tables, numbered sequentially starting after the
 * restaurant's current highest table number.
 */
export async function addTables(count: number): Promise<ActionResult> {
  if (!Number.isInteger(count) || count < 1) {
    return { error: "Enter how many tables to add (at least 1)." };
  }
  if (count > MAX_BULK) {
    return { error: `You can add at most ${MAX_BULK} tables at once.` };
  }

  const restaurant = await requireRestaurantId();
  if ("error" in restaurant) return restaurant;

  const supabase = await createClient();

  // Continue numbering after the current highest table.
  const { data: highest } = await supabase
    .from("restaurant_tables")
    .select("number")
    .eq("restaurant_id", restaurant.id)
    .order("number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const start = (highest?.number ?? 0) + 1;
  const rows = Array.from({ length: count }, (_, i) => ({
    restaurant_id: restaurant.id,
    number: start + i,
  }));

  const { error } = await supabase.from("restaurant_tables").insert(rows);
  if (error) return { error: error.message };

  revalidatePath(TABLES_PATH);
  return {};
}

/**
 * Current live activity for the owner's tables: which have a menu session open
 * (presence seen within the TTL) and which have an unresolved waiter call. Polled
 * by the dashboard to drive the status dots.
 */
export async function getTableActivity(): Promise<TableActivity> {
  const restaurant = await requireRestaurantId();
  if ("error" in restaurant) return { sessions: [], calls: [] };

  const supabase = await createClient();
  const since = new Date(
    Date.now() - TABLE_PRESENCE_TTL_SECONDS * 1000,
  ).toISOString();

  const [presence, calls] = await Promise.all([
    supabase
      .from("table_presence")
      .select("table_number")
      .eq("restaurant_id", restaurant.id)
      .gt("last_seen", since),
    supabase
      .from("waiter_calls")
      .select("table_number")
      .eq("restaurant_id", restaurant.id)
      .is("resolved_at", null),
  ]);

  const unique = (rows: { table_number: number }[] | null) => [
    ...new Set((rows ?? []).map((r) => r.table_number)),
  ];

  return { sessions: unique(presence.data), calls: unique(calls.data) };
}

/** Marks every open waiter call for a table as resolved (waiter acknowledged). */
export async function resolveWaiterCall(
  tableNumber: number,
): Promise<ActionResult> {
  const restaurant = await requireRestaurantId();
  if ("error" in restaurant) return restaurant;

  const supabase = await createClient();
  const { error } = await supabase
    .from("waiter_calls")
    .update({ resolved_at: new Date().toISOString() })
    .eq("restaurant_id", restaurant.id)
    .eq("table_number", tableNumber)
    .is("resolved_at", null);

  if (error) return { error: error.message };
  return {};
}
