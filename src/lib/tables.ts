/**
 * The page a diner lands on after scanning a table's QR code. The public,
 * diner-facing menu is built in a later phase; until then this stays the single
 * source of truth for the link a table's QR encodes, so the route only has to
 * change in one place.
 */
export function tableMenuPath(slug: string, tableNumber: number): string {
  return `/r/${slug}?table=${tableNumber}`;
}
