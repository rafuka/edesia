import type { Metadata } from "next";
import { cookies } from "next/headers";
import { MenuExpired } from "@/components/menu/menu-expired";
import { PublicMenu } from "@/components/menu/public-menu";
import {
  MENU_SESSION_COOKIE,
  isMenuSessionActive,
  verifyMenuSessionToken,
} from "@/lib/menu-session";
import { createClient } from "@/lib/supabase/server";
import type { MenuSectionWithItems } from "@/lib/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("restaurants")
    .select("name")
    .eq("slug", slug)
    .maybeSingle();

  return { title: data?.name ? `${data.name} — Menu` : "Menu" };
}

export default async function PublicMenuPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Validate the diner's table session. Missing / expired / tampered -> ask them
  // to scan the QR code again.
  const cookieStore = await cookies();
  const token = cookieStore.get(MENU_SESSION_COOKIE)?.value;
  const session = token ? await verifyMenuSessionToken(token) : null;

  if (!session || !isMenuSessionActive(session, slug)) {
    return <MenuExpired />;
  }

  const supabase = await createClient();
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, name")
    .eq("slug", slug)
    .maybeSingle();

  if (!restaurant) {
    return <MenuExpired variant="not-found" />;
  }

  const { data: sections } = await supabase
    .from("menu_sections")
    .select("*, menu_items(*)")
    .eq("restaurant_id", restaurant.id)
    .order("position", { ascending: true })
    .order("position", { referencedTable: "menu_items", ascending: true });

  return (
    <PublicMenu
      restaurantName={restaurant.name}
      tableNumber={session.table}
      sections={(sections as MenuSectionWithItems[] | null) ?? []}
    />
  );
}
