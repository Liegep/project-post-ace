CREATE INDEX IF NOT EXISTS idx_social_posts_scheduler_due
ON public.social_posts (platform, scheduled_at)
WHERE status IN ('approved', 'scheduled');