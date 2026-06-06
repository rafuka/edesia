"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { MediaType } from "@/lib/types";

type ActionResult = { error?: string };
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const MENU_PATH = "/dashboard/menu";
const MEDIA_BUCKET = "menu-media";

/** Extracts the storage object path from a public media URL, or null. */
function storagePathFromPublicUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${MEDIA_BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length));
}

/** Best-effort removal of a media object; never blocks the main operation. */
async function removeMediaByUrl(
  supabase: SupabaseServerClient,
  url: string | null | undefined,
): Promise<void> {
  if (!url) return;
  const path = storagePathFromPublicUrl(url);
  if (!path) return;
  await supabase.storage.from(MEDIA_BUCKET).remove([path]);
}

/** Resolve the current user's restaurant id, enforcing auth. */
async function requireRestaurantId(): Promise<
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

// ------------------------------ Media --------------------------------

/**
 * Issues a one-time signed upload URL for an item's media, scoped to the
 * caller's restaurant folder. The upload itself is authorized by the returned
 * token, so the browser does not need an authenticated storage session.
 */
export async function createMediaUploadUrl(
  fileName: string,
): Promise<{ path: string; token: string } | { error: string }> {
  const restaurant = await requireRestaurantId();
  if ("error" in restaurant) return restaurant;

  const ext =
    fileName.includes(".") && !fileName.endsWith(".")
      ? fileName.split(".").pop()
      : "bin";
  const path = `${restaurant.id}/${crypto.randomUUID()}.${ext}`;

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("menu-media")
    .createSignedUploadUrl(path);

  if (error) return { error: error.message };
  return { path: data.path, token: data.token };
}

// ----------------------------- Sections ------------------------------

export async function addSection(
  name: string,
  description?: string | null,
): Promise<ActionResult> {
  const trimmed = name.trim();
  if (!trimmed) return { error: "Section name is required." };

  const restaurant = await requireRestaurantId();
  if ("error" in restaurant) return restaurant;

  const supabase = await createClient();

  // Append to the end of the current ordering.
  const { count } = await supabase
    .from("menu_sections")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurant.id);

  const { error } = await supabase.from("menu_sections").insert({
    restaurant_id: restaurant.id,
    name: trimmed,
    description: description?.trim() || null,
    position: count ?? 0,
  });

  if (error) return { error: error.message };
  revalidatePath(MENU_PATH);
  return {};
}

export async function updateSection(
  sectionId: string,
  name: string,
  description?: string | null,
): Promise<ActionResult> {
  const trimmed = name.trim();
  if (!trimmed) return { error: "Section name is required." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("menu_sections")
    .update({ name: trimmed, description: description?.trim() || null })
    .eq("id", sectionId);

  if (error) return { error: error.message };
  revalidatePath(MENU_PATH);
  return {};
}

export async function deleteSection(sectionId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("menu_sections")
    .delete()
    .eq("id", sectionId);

  if (error) return { error: error.message };
  revalidatePath(MENU_PATH);
  return {};
}

// ------------------------------- Items --------------------------------

export interface ItemInput {
  name: string;
  description?: string | null;
  price?: number | null;
  media_url?: string | null;
  media_type?: MediaType | null;
}

export async function addItem(
  sectionId: string,
  input: ItemInput,
): Promise<ActionResult> {
  const name = input.name.trim();
  if (!name) return { error: "Item name is required." };

  const supabase = await createClient();

  const { count } = await supabase
    .from("menu_items")
    .select("id", { count: "exact", head: true })
    .eq("section_id", sectionId);

  const { error } = await supabase.from("menu_items").insert({
    section_id: sectionId,
    name,
    description: input.description?.trim() || null,
    price: input.price ?? null,
    media_url: input.media_url ?? null,
    media_type: input.media_type ?? null,
    position: count ?? 0,
  });

  if (error) return { error: error.message };
  revalidatePath(MENU_PATH);
  return {};
}

export async function updateItem(
  itemId: string,
  input: ItemInput,
): Promise<ActionResult> {
  const name = input.name.trim();
  if (!name) return { error: "Item name is required." };

  const supabase = await createClient();

  // Capture the existing media so we can clean it up if it changed.
  const { data: existing } = await supabase
    .from("menu_items")
    .select("media_url")
    .eq("id", itemId)
    .single();

  const nextMediaUrl = input.media_url ?? null;
  const { error } = await supabase
    .from("menu_items")
    .update({
      name,
      description: input.description?.trim() || null,
      price: input.price ?? null,
      media_url: nextMediaUrl,
      media_type: input.media_type ?? null,
    })
    .eq("id", itemId);

  if (error) return { error: error.message };

  // The replaced/removed file is now orphaned — delete it.
  if (existing?.media_url && existing.media_url !== nextMediaUrl) {
    await removeMediaByUrl(supabase, existing.media_url);
  }

  revalidatePath(MENU_PATH);
  return {};
}

export async function deleteItem(itemId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("menu_items")
    .select("media_url")
    .eq("id", itemId)
    .single();

  const { error } = await supabase.from("menu_items").delete().eq("id", itemId);
  if (error) return { error: error.message };

  await removeMediaByUrl(supabase, existing?.media_url);

  revalidatePath(MENU_PATH);
  return {};
}
