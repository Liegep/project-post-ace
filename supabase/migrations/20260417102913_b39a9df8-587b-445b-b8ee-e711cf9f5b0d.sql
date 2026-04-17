-- ============================================================
-- AUTOMATED STORAGE CLEANUP SYSTEM
-- ============================================================

-- Helper function: extract storage paths from a list of public URLs
CREATE OR REPLACE FUNCTION public.extract_media_storage_paths(urls text[])
RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  result text[] := ARRAY[]::text[];
  u text;
  marker text := '/storage/v1/object/public/media/';
  idx int;
  path text;
BEGIN
  IF urls IS NULL THEN
    RETURN result;
  END IF;

  FOREACH u IN ARRAY urls LOOP
    IF u IS NULL OR u = '' THEN
      CONTINUE;
    END IF;
    idx := position(marker IN u);
    IF idx > 0 THEN
      path := substring(u FROM idx + length(marker));
      -- strip query string if any
      IF position('?' IN path) > 0 THEN
        path := substring(path FROM 1 FOR position('?' IN path) - 1);
      END IF;
      path := replace(path, '%20', ' ');
      IF path <> '' AND NOT (path = ANY(result)) THEN
        result := array_append(result, path);
      END IF;
    END IF;
  END LOOP;

  RETURN result;
END;
$$;

-- Trigger function: when a post is deleted, remove its media from storage
CREATE OR REPLACE FUNCTION public.delete_post_media_files()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  all_urls text[];
  paths text[];
  p text;
BEGIN
  all_urls := COALESCE(OLD.media_urls, ARRAY[]::text[]);
  IF OLD.image_url IS NOT NULL AND OLD.image_url <> '' THEN
    all_urls := array_append(all_urls, OLD.image_url);
  END IF;

  paths := public.extract_media_storage_paths(all_urls);

  IF array_length(paths, 1) > 0 THEN
    FOREACH p IN ARRAY paths LOOP
      DELETE FROM storage.objects
      WHERE bucket_id = 'media' AND name = p;
    END LOOP;
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_delete_post_media_files ON public.posts;
CREATE TRIGGER trg_delete_post_media_files
BEFORE DELETE ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.delete_post_media_files();

-- Function: list orphaned files in 'media' bucket (not referenced anywhere)
CREATE OR REPLACE FUNCTION public.list_orphaned_media_files(older_than_hours int DEFAULT 24)
RETURNS TABLE(name text, size bigint, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
BEGIN
  RETURN QUERY
  WITH referenced AS (
    SELECT unnest(public.extract_media_storage_paths(
      COALESCE(p.media_urls, ARRAY[]::text[]) ||
      CASE WHEN p.image_url IS NOT NULL AND p.image_url <> '' THEN ARRAY[p.image_url] ELSE ARRAY[]::text[] END
    )) AS path
    FROM public.posts p
    UNION
    SELECT unnest(public.extract_media_storage_paths(
      COALESCE(cp.media_urls, ARRAY[]::text[])
    )) AS path
    FROM public.calendar_posts cp
    UNION
    SELECT unnest(public.extract_media_storage_paths(ARRAY[ba.file_url])) AS path
    FROM public.brief_attachments ba
    UNION
    SELECT unnest(public.extract_media_storage_paths(ARRAY[ia.file_url])) AS path
    FROM public.invoice_attachments ia
  )
  SELECT
    o.name,
    COALESCE((o.metadata->>'size')::bigint, 0) AS size,
    o.created_at
  FROM storage.objects o
  WHERE o.bucket_id = 'media'
    AND o.created_at < (now() - make_interval(hours => older_than_hours))
    AND NOT EXISTS (SELECT 1 FROM referenced r WHERE r.path = o.name);
END;
$$;

-- Function: delete orphaned files (returns count deleted)
CREATE OR REPLACE FUNCTION public.delete_orphaned_media_files(older_than_hours int DEFAULT 24)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  deleted_count int := 0;
  rec record;
BEGIN
  FOR rec IN SELECT name FROM public.list_orphaned_media_files(older_than_hours) LOOP
    DELETE FROM storage.objects WHERE bucket_id = 'media' AND name = rec.name;
    deleted_count := deleted_count + 1;
  END LOOP;
  RETURN deleted_count;
END;
$$;

-- Restrict execution of cleanup functions to admins
REVOKE ALL ON FUNCTION public.list_orphaned_media_files(int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_orphaned_media_files(int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_orphaned_media_files(int) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_orphaned_media_files(int) TO service_role;