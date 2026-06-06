import { PublicMenuItem } from "@/components/menu/public-menu-item";
import type { MenuSectionWithItems } from "@/lib/types";

/**
 * Read-only, mobile-first menu shown to a diner after scanning a table's QR
 * code. Items are tappable (see {@link PublicMenuItem}); the session gate lives
 * in the page.
 */
export function PublicMenu({
  restaurantName,
  tableNumber,
  sections,
}: {
  restaurantName: string;
  tableNumber: number;
  sections: MenuSectionWithItems[];
}) {
  const visibleSections = sections.filter((s) => s.menu_items.length > 0);

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">{restaurantName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Table {tableNumber}
        </p>
      </header>

      {visibleSections.length === 0 ? (
        <p className="text-center text-muted-foreground">
          This menu has no items yet.
        </p>
      ) : (
        <div className="space-y-10">
          {visibleSections.map((section) => (
            <section key={section.id}>
              <div className="mb-4 border-b pb-2">
                <h2 className="text-xl font-semibold">{section.name}</h2>
                {section.description && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {section.description}
                  </p>
                )}
              </div>
              <ul className="space-y-1">
                {section.menu_items.map((item) => (
                  <li key={item.id}>
                    <PublicMenuItem item={item} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
