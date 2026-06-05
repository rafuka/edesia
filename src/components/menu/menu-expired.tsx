import { QrCode } from "lucide-react";

/**
 * Shown when a diner reaches the public menu without a live table session —
 * either the 20-minute window lapsed, or the link is unknown. The fix in both
 * cases is to (re)scan the QR code at the table.
 */
export function MenuExpired({
  variant = "expired",
}: {
  variant?: "expired" | "not-found";
}) {
  const notFound = variant === "not-found";

  return (
    <main className="flex min-h-[80vh] flex-col items-center justify-center px-6 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-muted">
        <QrCode className="size-8 text-muted-foreground" />
      </div>
      <h1 className="mt-6 text-xl font-semibold">
        {notFound ? "Menu not found" : "Session expired"}
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {notFound
          ? "This menu link doesn’t exist. Please check the QR code on your table."
          : "Your menu session has ended. Please scan the QR code on your table again to view the menu."}
      </p>
    </main>
  );
}
