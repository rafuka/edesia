import { createClient } from "@/lib/supabase/server";
import type { Restaurant } from "@/lib/types";

/**
 * Returns the restaurant owned by the currently authenticated user, or null.
 */
export async function getCurrentRestaurant(): Promise<Restaurant | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("restaurants")
    .select("*")
    .eq("owner_id", user.id)
    .single();

  return data ?? null;
}

/**
 * Resolves the current user's restaurant id for use in Server Actions,
 * enforcing authentication. Returns an error result if not signed in or no
 * restaurant exists.
 */
export async function requireRestaurantId(): Promise<
  { id: string } | { error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data } = await supabase
    .from("restaurants")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (!data) return { error: "No restaurant found for this account." };
  return { id: data.id };
}
