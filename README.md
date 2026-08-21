# LionSoft

An AI voice agent that answers the phone for independent auto repair shops and turns each call into a structured callback record in a dashboard.

## The problem

At an independent auto repair shop, the people who answer the phone are usually the same people working on cars. When the bays are full, the phone rings unanswered. A missed call is not a deferred job, it is a lost one, because the caller dials the next shop on the list and books there instead. Shops rarely learn how much work they lose this way, since a call nobody answered leaves no record anywhere.

## How it works

A call to the shop's number arrives at Twilio, which hands the audio stream to Vapi. Vapi runs the voice agent that talks to the caller, holding a conversation rather than reading out a phone tree, and gathers what the shop needs in order to call back: who is calling, how to reach them, and what is wrong with the vehicle. The record that lands in the dashboard holds a callback number, a description of the problem with the vehicle, an urgency signal, and the full transcript.

When the call ends, Vapi posts the result to a webhook that writes the record into Supabase server-side. The transcript is stored next to the structured fields, so the shop can read what the caller actually said instead of trusting a summary. The dashboard never inserts call data itself, it only reads and updates, which keeps ingestion in one place and out of the browser.

The shop owner opens a React and TypeScript dashboard, built mobile-first because the person checking it is usually standing in a bay rather than sitting at a desk. It answers one question: who do I call back, in what order, right now. Tapping a phone number opens the dialer. After the callback the owner sets a status, which writes straight back to Supabase. Row-level security on every table means a shop can only ever read its own rows, enforced by the database rather than by the frontend.

## Stack

- **Twilio** receives the inbound call and provides the phone number.
- **Vapi** runs the conversational voice agent and posts each completed call to a webhook.
- **Supabase** stores shops, calls, and leads, handles magic-link auth, and enforces per-shop access through row-level security policies.
- **React, TypeScript, and Vite** for the dashboard, on the TanStack Start template.
- **TanStack Router** for file-based routing, **TanStack Query** for data fetching and caching.
- **Tailwind CSS v4 and shadcn/ui** for the interface.

## What I built, and what I did not

Solo build. I wrote the Twilio and Vapi call ingestion path, the Supabase schema and its row-level security policies (including the operator role that grants cross-shop access), and the dashboard.

It was never commercialized. No paying shops, no production call traffic, no pilot deployment. It is an MVP that demonstrates the architecture end to end and stops there. Parts of it are deliberately unfinished, and the build notes below list them. Product naming, for one, is still a placeholder token throughout the application code.

## Build notes

Engineering detail for anyone reading the code.

### Backend work handled outside the frontend

The frontend assumes the following are in place. None of it is solved by the application code.

- **Operator visibility across shops.** Row-level security policies must grant `SELECT` on all `shops`, `calls`, and `leads` rows to users where `auth.jwt() -> 'user_metadata' ->> 'is_operator' = 'true'`. This is already present in the current Cloud backend via the `public.is_operator()` helper. Porting the project to a different Supabase instance means porting that helper and its policies too.
- **Operator update permission.** Writing to `calls.reviewed_by_operator` needs an RLS `UPDATE` policy gated on the same metadata flag. Same status as above.
- **The `is_operator` flag** is set by hand in `auth.users.raw_user_meta_data` through the Supabase admin console: `{ "is_operator": true }`.
- **Lead and call ingestion.** Rows are inserted server-side by the Vapi webhook. The frontend never inserts.
- **Magic-link email delivery.** SMTP has to be configured in the Cloud backend. Lovable Cloud's shared sender is fine for testing, but a real deployment needs its own SMTP.

### Routing

This template uses TanStack Router rather than React Router DOM. The route structure (`/`, `/login`, `/leads/:id`, `/operator/flagged`, `/operator/shops/:shopId`) matches the original spec.

### Branding placeholder

Every visible product-name string in the application code is still the literal token `{PRODUCT_NAME}`. Finalizing the name means a project-wide find and replace. The favicon and logo assets are placeholders as well, so `public/favicon.ico` needs replacing at the same time.

### Known limitations

Operator access is gated on an `is_operator` flag stored in `user_metadata`. That field is writable by the user through `supabase.auth.updateUser`, so an authenticated user can set it on themselves, which means the check is not a real authorization boundary. The correct place for the flag is `app_metadata`, which only server-side code can write. This is a known issue in the current implementation and it has not been corrected.

### Verification checklist

Walked manually in the running app.

- Unauthenticated visitors are redirected to `/login`, and a magic link authenticates and lands on `/`.
- A signed-in owner sees only their own shop's leads. The request carries a `shop_id=eq.<id>` filter, and RLS enforces the same restriction server-side.
- Leads written server-side by the Vapi webhook appear in the dashboard with no client-side insert.
- Changing a lead's status writes to Supabase and persists on return.
- With `is_operator: true` in user metadata, `/` renders the operator home with a shop selector, and Mark reviewed on `/operator/flagged` removes a row.
