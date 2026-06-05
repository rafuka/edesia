import { MenuEditor } from "@/components/menu/menu-editor";
import { getCurrentRestaurant } from "@/lib/restaurant";
import { createClient } from "@/lib/supabase/server";
import type { MenuSectionWithItems } from "@/lib/types";

export default async function MenuPage() {
  const restaurant = await getCurrentRestaurant();
  if (!restaurant) return null; // dashboard layout already guards auth

  const supabase = await createClient();
  const { data: sections } = await supabase
    .from("menu_sections")
    .select("*, menu_items(*)")
    .eq("restaurant_id", restaurant.id)
    .order("position", { ascending: true })
    .order("position", { referencedTable: "menu_items", ascending: true });

  return (
    <MenuEditor sections={(sections as MenuSectionWithItems[] | null) ?? []} />
  );
}
