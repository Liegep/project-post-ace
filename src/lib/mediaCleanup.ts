import { supabase } from "@/integrations/supabase/client";

const STORAGE_MARKER = "/storage/v1/object/public/media/";

export function extractMediaPath(url: string): string | null {
  if (!url) return null;
  const idx = url.indexOf(STORAGE_MARKER);
  if (idx < 0) return null;
  let path = url.substring(idx + STORAGE_MARKER.length);
  const q = path.indexOf("?");
  if (q >= 0) path = path.substring(0, q);
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

/**
 * Deletes from storage every file present in `oldUrls` that is not in `newUrls`.
 * Only removes files that live in our 'media' bucket — external links are ignored.
 */
export async function deleteRemovedMedia(
  oldUrls: string[] = [],
  newUrls: string[] = []
): Promise<number> {
  const newSet = new Set(newUrls.filter(Boolean));
  const removed = oldUrls.filter((u) => u && !newSet.has(u));
  const paths = removed
    .map(extractMediaPath)
    .filter((p): p is string => !!p);

  if (paths.length === 0) return 0;

  const { error } = await supabase.storage.from("media").remove(paths);
  if (error) {
    console.error("Failed to delete removed media files", error);
    return 0;
  }
  return paths.length;
}
