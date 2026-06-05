export type MediaType = "image" | "video";

export interface Restaurant {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

export interface MenuItem {
  id: string;
  section_id: string;
  name: string;
  description: string | null;
  price: number | null;
  media_url: string | null;
  media_type: MediaType | null;
  position: number;
  created_at: string;
}

export interface MenuSection {
  id: string;
  restaurant_id: string;
  name: string;
  position: number;
  created_at: string;
}

/** A section with its items, as rendered in the menu editor. */
export interface MenuSectionWithItems extends MenuSection {
  menu_items: MenuItem[];
}

export interface RestaurantTable {
  id: string;
  restaurant_id: string;
  number: number;
  created_at: string;
}
