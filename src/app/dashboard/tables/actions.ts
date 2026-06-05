"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRestaurantId } from "@/lib/restaurant";

type ActionResult = { error?: string };

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
