"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addItem, updateItem, type ItemInput } from "@/app/dashboard/menu/actions";
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
import { uploadMenuMedia } from "@/lib/media";
import type { MediaType, MenuItem } from "@/lib/types";

interface ItemDialogProps {
  sectionId: string;
  item?: MenuItem;
  trigger: React.ReactElement;
}

export function ItemDialog({ sectionId, item, trigger }: ItemDialogProps) {
  const router = useRouter();
  const isEdit = Boolean(item);

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Existing media (edit mode) vs. a newly picked file.
  const [existingUrl, setExistingUrl] = useState<string | null>(
    item?.media_url ?? null,
  );
  const [existingType, setExistingType] = useState<MediaType | null>(
    item?.media_type ?? null,
  );
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  function resetTransient() {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      // Reset back to the item's saved state when closing.
      resetTransient();
      setExistingUrl(item?.media_url ?? null);
      setExistingType(item?.media_type ?? null);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null;
    resetTransient();
    if (picked) {
      setFile(picked);
      setPreviewUrl(URL.createObjectURL(picked));
    }
  }

  function clearMedia() {
    resetTransient();
    setExistingUrl(null);
    setExistingType(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "");
    const priceRaw = String(formData.get("price") ?? "").trim();

    if (!name) {
      toast.error("Item name is required.");
      return;
    }

    let price: number | null = null;
    if (priceRaw !== "") {
      const parsed = Number(priceRaw);
      if (Number.isNaN(parsed) || parsed < 0) {
        toast.error("Enter a valid price.");
        return;
      }
      price = parsed;
    }

    setSubmitting(true);
    try {
      let media_url = existingUrl;
      let media_type = existingType;

      if (file) {
        const uploaded = await uploadMenuMedia(file);
        media_url = uploaded.media_url;
        media_type = uploaded.media_type;
      }

      const payload: ItemInput = { name, description, price, media_url, media_type };
      const result = isEdit
        ? await updateItem(item!.id, payload)
        : await addItem(sectionId, payload);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(isEdit ? "Item updated" : "Item added");
      handleOpenChange(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setSubmitting(false);
    }
  }

  const showImage =
    (previewUrl && file?.type.startsWith("image")) ||
    (!file && existingUrl && existingType === "image");
  const showVideo =
    (previewUrl && file?.type.startsWith("video")) ||
    (!file && existingUrl && existingType === "video");
  const mediaSrc = previewUrl ?? existingUrl ?? undefined;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit item" : "Add item"}</DialogTitle>
          <DialogDescription>
            Add a name, price, description and a main image or video.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={item?.name ?? ""}
              required
              placeholder="Margherita Pizza"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Price</Label>
            <Input
              id="price"
              name="price"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              defaultValue={item?.price ?? ""}
              placeholder="12.50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={item?.description ?? ""}
              rows={3}
              placeholder="Tomato, mozzarella, fresh basil."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="media">Image or video</Label>
            <Input
              ref={fileInputRef}
              id="media"
              type="file"
              accept="image/*,video/*"
              onChange={handleFileChange}
            />
            {mediaSrc && (
              <div className="relative mt-2 overflow-hidden rounded-md border">
                {showImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mediaSrc}
                    alt="Preview"
                    className="h-40 w-full object-cover"
                  />
                )}
                {showVideo && (
                  <video
                    src={mediaSrc}
                    className="h-40 w-full object-cover"
                    controls
                  />
                )}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="absolute right-2 top-2"
                  onClick={clearMedia}
                >
                  Remove
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? "Saving…"
                : isEdit
                  ? "Save changes"
                  : "Add item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
