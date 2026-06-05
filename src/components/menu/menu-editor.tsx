"use client";

import { Plus } from "lucide-react";
import { SectionCard } from "@/components/menu/section-card";
import { SectionDialog } from "@/components/menu/section-dialog";
import { Button } from "@/components/ui/button";
import type { MenuSectionWithItems } from "@/lib/types";

export function MenuEditor({
  sections,
}: {
  sections: MenuSectionWithItems[];
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Menu</h1>
          <p className="text-sm text-muted-foreground">
            Organize your menu into sections and items.
          </p>
        </div>
        <SectionDialog
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add section
            </Button>
          }
        />
      </div>

      {sections.length > 0 ? (
        <div className="space-y-6">
          {sections.map((section) => (
            <SectionCard key={section.id} section={section} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <h2 className="text-lg font-semibold">Your menu is empty</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Start by adding a section like “Starters” or “Mains”, then add items
            to it.
          </p>
          <div className="mt-4">
            <SectionDialog
              trigger={
                <Button>
                  <Plus className="mr-2 h-4 w-4" /> Add your first section
                </Button>
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}
