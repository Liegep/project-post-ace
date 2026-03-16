
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS trello_card_id text DEFAULT NULL;
ALTER TABLE public.columns ADD COLUMN IF NOT EXISTS trello_list_id text DEFAULT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS posts_trello_card_id_unique ON public.posts (trello_card_id) WHERE trello_card_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS columns_trello_list_id_unique ON public.columns (trello_list_id) WHERE trello_list_id IS NOT NULL;
