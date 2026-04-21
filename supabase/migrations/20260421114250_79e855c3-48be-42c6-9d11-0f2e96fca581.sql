CREATE OR REPLACE FUNCTION public.list_orphaned_media_files(older_than_hours integer DEFAULT 24)
 RETURNS TABLE(name text, size bigint, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'storage'
AS $function$
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
    UNION
    SELECT unnest(public.extract_media_storage_paths(
      COALESCE(sp.media_urls, ARRAY[]::text[])
    )) AS path
    FROM public.social_posts sp
  )
  SELECT
    o.name,
    COALESCE((o.metadata->>'size')::bigint, 0) AS size,
    o.created_at
  FROM storage.objects o
  WHERE o.bucket_id = 'media'
    AND o.created_at < (now() - make_interval(hours => older_than_hours))
    -- PROTECTED PREFIXES: never delete profile avatars, client logos, sticky-note attachments, or app branding
    AND o.name NOT LIKE 'avatars/%'
    AND o.name NOT LIKE 'logos/%'
    AND o.name NOT LIKE 'client_notes/%'
    AND o.name NOT LIKE 'app/%'
    AND o.name NOT LIKE 'branding/%'
    AND NOT EXISTS (SELECT 1 FROM referenced r WHERE r.path = o.name);
END;
$function$;