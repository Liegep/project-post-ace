ALTER TABLE public.clients
  ADD COLUMN instagram_url text NOT NULL DEFAULT '',
  ADD COLUMN facebook_url text NOT NULL DEFAULT '',
  ADD COLUMN tiktok_url text NOT NULL DEFAULT '',
  ADD COLUMN youtube_url text NOT NULL DEFAULT '',
  ADD COLUMN linkedin_url text NOT NULL DEFAULT '',
  ADD COLUMN twitter_url text NOT NULL DEFAULT '';