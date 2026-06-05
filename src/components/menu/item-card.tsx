"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, ImageOff } from "lucide-react";
import { toast } from "sonner";
import { deleteItem } from "@/app/dashboard/menu/actions";
import { ItemDialog } from "@/components/menu/item-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { MenuItem } from "@/lib/types";

export function ItemCard({ item }: { item: MenuItem }) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteItem(item.id);
    setDeleting(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Item deleted");
    setConfirmOpen(false);
    router.refresh();
  }

  const price =
    item.price != null
      ? new Intl.NumberFormat(undefined, {
          style: "currency",
          currency: "USD",
        }).format(item.price)
      : null;

  return (
    <div className="flex gap-3 rounded-lg border bg-card p-3">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
        {item.media_type === "image" && item.media_url ? (
          <Image
            src={item.media_url}
            alt={item.name}
            fill
            sizes="80px"
            className="object-cover"
          />
        ) : item.media_type === "video" && item.media_url ? (
          <video src={item.media_url} className="h-full w-full object-cover" muted />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ImageOff className="h-5 w-5" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-medium">{item.name}</p>
            {price && (
              <p className="text-sm font-medium text-muted-foreground">{price}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <ItemDialog
              sectionId={item.section_id}
              item={item}
              trigger={
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Pencil className="h-4 w-4" />
                  <span className="sr-only">Edit item</span>
                </Button>
              }
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Delete item</span>
            </Button>
          </div>
        </div>
        {item.description && (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {item.description}
          </p>
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{item.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the item from your menu.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
