-- Backfill: reapply color to posts that have legacy "alteracao_solicitada" tag
-- but lost their orange label due to the previous tagIdToName resolution bug.
UPDATE public.posts
SET client_label = 'color:#f59e0b'
WHERE 'alteracao_solicitada' = ANY(tags)
  AND client_label = 'pendente';

-- Same for legacy "alterado" tag → green
UPDATE public.posts
SET client_label = 'color:#22c55e'
WHERE 'alterado' = ANY(tags)
  AND client_label = 'pendente'
  AND NOT ('alteracao_solicitada' = ANY(tags));