"use client";

import Image from "next/image";
import { X } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { MenuItem } from "@/lib/types";

function formatPrice(price: number | null): string | null {
  if (price == null) return null;
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(price);
}

/**
 * A single menu item on the public menu. Tapping it opens a full-screen
 * (on mobile) detail view with the media enlarged so diners can see the
 * dish, its description and price clearly.
 */
export function PublicMenuItem({ item }: { item: MenuItem }) {
  const price = formatPrice(item.price);
  const hasMedia = Boolean(item.media_url);

  return (
    <Dialog>
      <DialogTrigger
        render={
          <button
            type="button"
            className="-mx-2 flex w-full gap-4 rounded-lg px-2 py-2 text-left outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring"
          >
            {item.media_url && item.media_type === "image" ? (
              <span className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                <Image
                  src={item.media_url}
                  alt={item.name}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              </span>
            ) : item.media_url && item.media_type === "video" ? (
              <span className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                <video
                  src={item.media_url}
                  className="h-full w-full object-cover"
                  muted
                  playsInline
                />
              </span>
            ) : null}

            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-3">
                <span className="font-medium">{item.name}</span>
                {price && (
                  <span className="shrink-0 text-sm font-medium tabular-nums text-muted-foreground">
                    {price}
                  </span>
                )}
              </span>
              {item.description && (
                <span className="mt-1 line-clamp-2 block text-sm text-muted-foreground">
                  {item.description}
                </span>
              )}
            </span>
          </button>
        }
      />

      <DialogContent
        showCloseButton={false}
        className="flex h-dvh max-h-dvh w-full max-w-full translate-x-0 translate-y-0 top-0 left-0 flex-col gap-0 overflow-hidden rounded-none p-0 sm:left-1/2 sm:top-1/2 sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl"
      >
        <DialogClose
          render={
            <button
              type="button"
              className="absolute right-3 top-3 z-10 flex size-9 items-center justify-center rounded-full bg-black/50 text-white outline-none backdrop-blur transition-colors hover:bg-black/70 focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <X className="size-5" />
              <span className="sr-only">Close</span>
            </button>
          }
        />

        {hasMedia && (
          <div className="relative h-[55vh] w-full shrink-0 bg-black sm:h-[360px]">
            {item.media_type === "image" && item.media_url ? (
              <Image
                src={item.media_url}
                alt={item.name}
                fill
                sizes="(min-width: 640px) 512px, 100vw"
                className="object-contain"
              />
            ) : item.media_type === "video" && item.media_url ? (
              <video
                src={item.media_url}
                className="h-full w-full object-contain"
                controls
                playsInline
                autoPlay
                muted
              />
            ) : null}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex items-start justify-between gap-3">
            <DialogTitle className="text-lg leading-snug font-semibold">
              {item.name}
            </DialogTitle>
            {price && (
              <span className="shrink-0 text-base font-medium tabular-nums">
                {price}
              </span>
            )}
          </div>
          {item.description && (
            <DialogDescription className="mt-2 text-sm whitespace-pre-line text-muted-foreground">
              {item.description}
            </DialogDescription>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
