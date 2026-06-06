"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteSection } from "@/app/dashboard/menu/actions";
import { ItemCard } from "@/components/menu/item-card";
import { ItemDialog } from "@/components/menu/item-dialog";
import { SectionDialog } from "@/components/menu/section-dialog";
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
import type { MenuSectionWithItems } from "@/lib/types";

export function SectionCard({
  section,
}: {
  section: MenuSectionWithItems;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const items = section.menu_items ?? [];

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteSection(section.id);
    setDeleting(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Section deleted");
    setConfirmOpen(false);
    router.refresh();
  }

  return (
    <section className="rounded-xl border bg-background">
      <div className="flex items-start justify-between gap-2 border-b px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{section.name}</h2>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {items.length} {items.length === 1 ? "item" : "items"}
            </span>
          </div>
          {section.description && (
            <p className="mt-1 text-sm text-muted-foreground">
              {section.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <SectionDialog
            sectionId={section.id}
            initialName={section.name}
            initialDescription={section.description}
            trigger={
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Pencil className="h-4 w-4" />
                <span className="sr-only">Edit section</span>
              </Button>
            }
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete section</span>
          </Button>
        </div>
      </div>

      <div className="space-y-3 p-4">
        {items.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <p className="py-2 text-sm text-muted-foreground">
            No items yet. Add your first one.
          </p>
        )}

        <ItemDialog
          sectionId={section.id}
          trigger={
            <Button variant="outline" size="sm" className="w-full">
              <Plus className="mr-2 h-4 w-4" /> Add item
            </Button>
          }
        />
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{section.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes the section and all {items.length} of its items.
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
    </section>
  );
}
