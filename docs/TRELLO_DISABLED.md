# Trello integration — disabled

Trello integration is **intentionally disabled** for this project and must
not be re-introduced (see project memory: `Constraints: Trello integration
forbidden`).

## Current state (2026-05-22)

- Edge functions `trello-push` and `trello-sync` have been **removed** from
  the codebase and **undeployed** from Lovable Cloud.
- Their entries in `supabase/config.toml` have been removed.
- Secrets `TRELLO_API_KEY` and `TRELLO_TOKEN` have been deleted from the
  project. Do not restore them.
- Frontend stub `src/lib/trelloPush.ts` is a no-op kept only so existing
  call sites in `src/context/PostsContext.tsx` compile. It performs no
  network requests.

## Database columns (kept, dormant)

These columns still exist because they hold **legacy data** imported from
Trello before the integration was disabled. They are not written to by any
active code path and are safe to leave in place:

- `posts.trello_card_id`  (6 rows populated of 219)
- `columns.trello_list_id` (2 rows populated of 36)
- `clients.trello_board_id` (1 row populated of 7)

Do **not** drop these columns without an explicit data migration: doing so
would lose the link between those legacy rows and their original Trello
provenance.

## If Trello is ever needed again

Open an issue first. Re-enabling requires explicit approval because the
constraint is recorded in project memory.
