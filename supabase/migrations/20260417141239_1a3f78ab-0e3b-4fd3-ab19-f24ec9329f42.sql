-- Remove Trello-imported tag IDs from posts.tags arrays
UPDATE public.posts
SET tags = ARRAY(
  SELECT t FROM unnest(tags) AS t
  WHERE t !~ '^[a-f0-9]{24}$'
)
WHERE EXISTS (
  SELECT 1 FROM unnest(tags) AS t WHERE t ~ '^[a-f0-9]{24}$'
);

-- Delete the Trello tags themselves
DELETE FROM public.tags
WHERE id ~ '^[a-f0-9]{24}$';