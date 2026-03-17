

# Admin Invitation & Authentication System

## Current State
The app has **no authentication** — all admin pages are publicly accessible. We need to add auth and an invitation system so only invited users can access the admin area.

## Plan

### 1. Database Setup (Migration)
- Create `admin_invitations` table: `id`, `email`, `invited_by`, `token`, `accepted_at`, `created_at`, `expires_at`
- Create `user_roles` table with `app_role` enum (`admin`) linked to `auth.users`
- Create `has_role()` security definer function
- Add RLS policies: only admins can manage invitations and see other admins

### 2. Auth Pages
- **Login page** (`/login`) — email + password sign-in form
- **Accept Invitation page** (`/accept-invite`) — receives token from email link, lets the invited user set a password and create their account
- Styling consistent with the existing app design

### 3. Protect Admin Routes
- Create an `AuthGuard` component that wraps admin routes
- Checks for authenticated session; redirects to `/login` if not authenticated
- Verifies user has `admin` role via `has_role()` function

### 4. Invitation Edge Function
- `send-admin-invite` edge function that:
  - Generates a unique token
  - Stores the invitation in `admin_invitations`
  - Sends an email with a link to `/accept-invite?token=...`
  - Uses Lovable AI or a simple approach (we'll check email domain setup)
- `accept-admin-invite` edge function that:
  - Validates the token
  - Creates the user account via Supabase Auth admin API
  - Assigns the `admin` role

### 5. Invitation UI in Admin Dashboard
- Add an "Invite Admin" button in the dashboard
- Simple dialog: enter email → send invitation
- Show list of pending/accepted invitations

### 6. First Admin Bootstrap
- Since there are no users yet, we'll need a way to create the first admin. Options:
  - A one-time seed migration that creates the first admin invitation
  - Or: first signup is auto-promoted to admin (with a flag to disable after)

## Technical Details

- Auth state managed via `supabase.auth.onAuthStateChange()` listener
- Session persisted in localStorage (already configured in client)
- Edge functions use `SUPABASE_SERVICE_ROLE_KEY` (already available) to create users and assign roles
- Email sending for invitations will use a simple approach via the edge function (checking email infrastructure availability first)

## Route Changes
```text
/login           → Login page (public)
/accept-invite   → Accept invitation page (public)
/                → Admin Dashboard (protected)
/admin           → Admin Dashboard (protected)
/admin/:slug     → Admin Page (protected)
/client/:slug    → Client Page (stays public)
```

