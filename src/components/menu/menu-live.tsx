"use client";

import { useEffect, useState } from "react";
import { BellRing, Check } from "lucide-react";
import { toast } from "sonner";
import { callWaiter, heartbeat } from "@/app/r/[slug]/actions";

const HEARTBEAT_INTERVAL_MS = 45_000;
// How long the button stays in its "notified" state before a diner can call again.
const CALL_COOLDOWN_MS = 30_000;

/**
 * Client-side liveness for the public menu: sends presence heartbeats while the
 * tab is open (so the dashboard shows a green dot for this table), and renders a
 * floating "Call waiter" button that raises a waiter call (orange dot).
 */
export function MenuLive({ slug }: { slug: string }) {
  const [calling, setCalling] = useState(false);
  const [notified, setNotified] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const ping = () => {
      if (!cancelled && document.visibilityState === "visible") {
        void heartbeat(slug);
      }
    };

    ping(); // mark present immediately on load
    const interval = setInterval(ping, HEARTBEAT_INTERVAL_MS);
    document.addEventListener("visibilitychange", ping);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", ping);
    };
  }, [slug]);

  async function handleCall() {
    if (calling || notified) return;
    setCalling(true);
    const result = await callWaiter(slug);
    setCalling(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success("A waiter will be with you shortly.");
    setNotified(true);
    setTimeout(() => setNotified(false), CALL_COOLDOWN_MS);
  }

  return (
    <button
      type="button"
      onClick={handleCall}
      disabled={calling || notified}
      aria-label="Call a waiter"
      className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-lg ring-1 ring-black/5 transition-all hover:bg-primary/90 active:translate-y-px disabled:opacity-100 disabled:cursor-default data-[notified=true]:bg-emerald-600 data-[notified=true]:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      data-notified={notified}
    >
      {notified ? (
        <>
          <Check className="size-4" />
          Waiter notified
        </>
      ) : (
        <>
          <BellRing className="size-4" />
          {calling ? "Calling…" : "Call waiter"}
        </>
      )}
    </button>
  );
}
