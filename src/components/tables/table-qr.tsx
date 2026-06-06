"use client";

import { useRef, useSyncExternalStore } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { tableMenuPath } from "@/lib/tables";

// window.location is browser-only. useSyncExternalStore reads it on the client
// while serving "" on the server and during hydration, so the two renders agree
// (no hydration mismatch) without a setState-in-effect.
const subscribe = () => () => {};
function useOrigin() {
  return useSyncExternalStore(
    subscribe,
    () => window.location.origin,
    () => "",
  );
}

/**
 * Renders a table's QR code and lets staff download it as a PNG to print.
 * The encoded link is derived from the restaurant slug and table number, so a
 * table "comes with" a QR the moment it exists — nothing is stored server-side.
 *
 * Live status dots: green when a diner has the menu open (`hasSession`), and a
 * pulsing orange call button when a waiter has been requested (`hasCall`) —
 * clicking it acknowledges/clears the call.
 */
export function TableQR({
  slug,
  number,
  hasSession = false,
  hasCall = false,
  onClearCall,
}: {
  slug: string;
  number: number;
  hasSession?: boolean;
  hasCall?: boolean;
  onClearCall?: (tableNumber: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const origin = useOrigin();

  const value = origin ? `${origin}${tableMenuPath(slug, number)}` : "";

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `${slug}-table-${number}.png`;
    link.click();
  }

  return (
    <li className="relative flex flex-col items-center gap-3 rounded-xl border bg-card p-4 text-center">
      {hasSession && (
        <span
          className="absolute left-2 top-2"
          title="Menu session open"
        >
          <span className="block size-2.5 rounded-full bg-emerald-500 ring-2 ring-card" />
          <span className="sr-only">Menu session open</span>
        </span>
      )}

      {hasCall && (
        <button
          type="button"
          onClick={() => onClearCall?.(number)}
          title="Waiter requested — click to clear"
          className="absolute right-2 top-2 inline-flex size-5 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="absolute inline-flex size-3.5 animate-ping rounded-full bg-orange-400 opacity-75" />
          <span className="relative block size-2.5 rounded-full bg-orange-500 ring-2 ring-card" />
          <span className="sr-only">
            Waiter requested for table {number} — click to clear
          </span>
        </button>
      )}

      <div className="text-xs text-muted-foreground">
        Table{" "}
        <span className="text-sm font-semibold tabular-nums text-foreground">
          {number}
        </span>
      </div>

      <div className="flex size-[136px] items-center justify-center rounded-lg bg-white p-2">
        {value ? (
          <QRCodeCanvas
            ref={canvasRef}
            value={value}
            size={120}
            level="M"
            title={`QR code for table ${number}`}
          />
        ) : (
          <div className="size-full animate-pulse rounded bg-muted" />
        )}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleDownload}
        disabled={!value}
      >
        <Download className="mr-1.5 h-3.5 w-3.5" />
        Download
      </Button>
    </li>
  );
}
