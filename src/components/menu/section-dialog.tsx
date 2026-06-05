"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addSection, renameSection } from "@/app/dashboard/menu/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SectionDialogProps {
  /** Provide a sectionId to rename; omit to create a new section. */
  sectionId?: string;
  initialName?: string;
  trigger: React.ReactElement;
}

export function SectionDialog({
  sectionId,
  initialName,
  trigger,
}: SectionDialogProps) {
  const router = useRouter();
  const isRename = Boolean(sectionId);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = String(new FormData(e.currentTarget).get("name") ?? "").trim();
    if (!name) {
      toast.error("Section name is required.");
      return;
    }

    setSubmitting(true);
    try {
      const result = isRename
        ? await renameSection(sectionId!, name)
        : await addSection(name);

      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(isRename ? "Section renamed" : "Section added");
      setOpen(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isRename ? "Rename section" : "Add section"}</DialogTitle>
          <DialogDescription>
            Sections group items on your menu (e.g. Starters, Mains, Drinks).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="section-name">Name</Label>
            <Input
              id="section-name"
              name="name"
              defaultValue={initialName ?? ""}
              required
              autoFocus
              placeholder="Starters"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : isRename ? "Save" : "Add section"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
