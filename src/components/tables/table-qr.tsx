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
 */
export function TableQR({ slug, number }: { slug: string; number: number }) {
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
    <li className="flex flex-col items-center gap-3 rounded-xl border bg-card p-4 text-center">
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
