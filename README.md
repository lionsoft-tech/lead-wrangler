# {PRODUCT_NAME} — Shop Owner Dashboard

The dashboard is the shop owner's system of record for AI-receptionist callbacks.
Mobile-first, single-purpose: who do I call back, in what order, right now.

## Stack

- Vite + React + TypeScript (TanStack Start template)
- TanStack Router (file-based) for navigation
- Tailwind CSS v4 + shadcn/ui
- TanStack Query for data + cache
- Supabase (via Lovable Cloud) for auth + data
- date-fns for relative timestamps
- sonner for toasts

> Note: this template ships with TanStack Router rather than React Router DOM.
> Routing structure (`/`, `/login`, `/leads/:id`, `/operator/flagged`,
> `/operator/shops/:shopId`) matches the spec exactly.

## Backend dependencies (handle outside Lovable)

The following backend tasks are NOT solved by the frontend code and need to be
handled separately. The frontend assumes these are in place:

1. **Operator visibility across shops.** RLS policies must grant SELECT on all
   `shops`, `calls`, and `leads` rows to users where
   `auth.jwt() -> 'user_metadata' ->> 'is_operator' = 'true'`.
   *(Already shipped in this Cloud backend via the `public.is_operator()` helper.
   If you swap to your own Supabase project, port that helper + policies.)*
2. **Operator update permission on `calls.reviewed_by_operator`** requires an
   RLS UPDATE policy gated on the same metadata flag. Same status as above.
3. **The `is_operator` flag is set manually** in `auth.users.raw_user_meta_data`
   via the Supabase admin console: `{ "is_operator": true }`.
4. **Lead/call ingestion** — calls and leads are inserted server-side by the
   Vapi webhook. The frontend never INSERTs.
5. **Magic-link email delivery** — make sure SMTP is configured in the Cloud
   backend. By default Lovable Cloud uses a shared sender that works for
   testing; configure your own SMTP for production.

## Branding placeholder

Every visible product-name string is the literal token `{PRODUCT_NAME}`.
Do a project-wide find-and-replace once the name is finalized. The favicon and
any logo asset are also placeholders — replace `public/favicon.ico` when ready.

## Verification checklist

Walk through these in the running app:

1. App boots at `/` and redirects unauthenticated visitors to `/login`.
2. Login sends a magic link via Supabase; clicking it lands on `/` authenticated.
3. `/` shows the shop name as a heading and only that shop's leads (network tab
   should show `shop_id=eq.<id>` filter; RLS enforces it server-side too).
4. Sort: a manually inserted `emergency` lead from yesterday appears above a
   `today` lead from 10 minutes ago.
5. Status filter defaults to "Active"; date filter defaults to "All time".
6. Tapping a card navigates to `/leads/:id` with all fields populated and the
   transcript collapsed.
7. On mobile (375px), the phone number is a large tappable button and `tel:`
   opens the dialer.
8. Changing the status dropdown writes to Supabase and persists on return.
9. Setting status to "Converted" plays the celebration animation + toast.
10. Sign out from the avatar dropdown returns to `/login` and clears session.
11. With `is_operator: true` in user_metadata, `/` renders the operator home
    with a shop selector instead of the owner home.
12. `/operator/flagged` renders the queue and "Mark reviewed" optimistically
    removes a row.
