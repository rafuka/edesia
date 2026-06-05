import Image from "next/image";
import type { MenuSectionWithItems } from "@/lib/types";

function formatPrice(price: number | null): string | null {
  if (price == null) return null;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(price);
}

/**
 * Read-only, mobile-first menu shown to a diner after scanning a table's QR
 * code. Purely presentational — the session gate lives in the page.
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
              <h2 className="mb-4 border-b pb-2 text-xl font-semibold">
                {section.name}
              </h2>
              <ul className="space-y-5">
                {section.menu_items.map((item) => {
                  const price = formatPrice(item.price);
                  return (
                    <li key={item.id} className="flex gap-4">
                      {item.media_url && item.media_type === "image" ? (
                        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                          <Image
                            src={item.media_url}
                            alt={item.name}
                            fill
                            sizes="96px"
                            className="object-cover"
                          />
                        </div>
                      ) : item.media_url && item.media_type === "video" ? (
                        <video
                          src={item.media_url}
                          className="h-24 w-24 shrink-0 rounded-lg bg-muted object-cover"
                          muted
                          playsInline
                          controls
                        />
                      ) : null}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <h3 className="font-medium">{item.name}</h3>
                          {price && (
                            <span className="shrink-0 text-sm font-medium tabular-nums text-muted-foreground">
                              {price}
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
