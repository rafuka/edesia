import { getTableActivity } from "@/app/dashboard/tables/actions";
import { TablesManager } from "@/components/tables/tables-manager";
import { getCurrentRestaurant } from "@/lib/restaurant";
import { createClient } from "@/lib/supabase/server";
import type { RestaurantTable } from "@/lib/types";

export default async function TablesPage() {
  const restaurant = await getCurrentRestaurant();
  if (!restaurant) return null; // dashboard layout already guards auth

  const supabase = await createClient();
  const { data: tables } = await supabase
    .from("restaurant_tables")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .order("number", { ascending: true });

  const initialActivity = await getTableActivity();

  return (
    <TablesManager
      slug={restaurant.slug}
      tables={(tables as RestaurantTable[] | null) ?? []}
      initialActivity={initialActivity}
    />
  );
}
