"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addSection, updateSection } from "@/app/dashboard/menu/actions";
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
import { Textarea } from "@/components/ui/textarea";

interface SectionDialogProps {
  /** Provide a sectionId to edit; omit to create a new section. */
  sectionId?: string;
  initialName?: string;
  initialDescription?: string | null;
  trigger: React.ReactElement;
}

export function SectionDialog({
  sectionId,
  initialName,
  initialDescription,
  trigger,
}: SectionDialogProps) {
  const router = useRouter();
  const isEdit = Boolean(sectionId);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "");
    if (!name) {
      toast.error("Section name is required.");
      return;
    }

    setSubmitting(true);
    try {
      const result = isEdit
        ? await updateSection(sectionId!, name, description)
        : await addSection(name, description);

      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(isEdit ? "Section saved" : "Section added");
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
          <DialogTitle>{isEdit ? "Edit section" : "Add section"}</DialogTitle>
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
          <div className="space-y-2">
            <Label htmlFor="section-description">
              Description{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Textarea
              id="section-description"
              name="description"
              defaultValue={initialDescription ?? ""}
              rows={3}
              placeholder="A short note shown under the section heading."
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : isEdit ? "Save" : "Add section"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
