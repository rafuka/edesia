import { createClient } from "@/lib/supabase/client";
import { createMediaUploadUrl } from "@/app/dashboard/menu/actions";
import type { MediaType } from "@/lib/types";

export const MEDIA_BUCKET = "menu-media";

export interface UploadedMedia {
  media_url: string;
  media_type: MediaType;
}

/**
 * Uploads an item's image/video to Supabase Storage.
 *
 * A Server Action (reliably authenticated via cookies) issues a one-time
 * signed upload URL scoped to the restaurant's folder; the browser then
 * uploads to it with the token. This avoids relying on the browser client
 * holding a storage session and supports large video files.
 */
export async function uploadMenuMedia(file: File): Promise<UploadedMedia> {
  const signed = await createMediaUploadUrl(file.name);
  if ("error" in signed) throw new Error(signed.error);

  const supabase = createClient();
  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .uploadToSignedUrl(signed.path, signed.token, file, {
      contentType: file.type,
    });

  if (error) throw error;

  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(signed.path);
  const media_type: MediaType = file.type.startsWith("video")
    ? "video"
    : "image";

  return { media_url: data.publicUrl, media_type };
}
