
-- shops
create table public.shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  vapi_assistant_id text unique,
  twilio_number text,
  owner_name text,
  owner_cell text,
  owner_email text,
  status text default 'pilot' check (status in ('pilot','paid','churned')),
  onboarded_date date,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- calls
create table public.calls (
  id uuid primary key default gen_random_uuid(),
  vapi_call_id text unique not null,
  shop_id uuid references public.shops(id) on delete cascade,
  started_at timestamptz,
  duration_sec integer,
  caller_phone text,
  recording_url text,
  transcript text,
  was_lead_captured boolean default false,
  was_faq_only boolean default false,
  flagged_for_review boolean default false,
  reviewed_by_operator boolean default false,
  created_at timestamptz default now()
);

-- leads
create table public.leads (
  id bigserial primary key,
  shop_id uuid references public.shops(id) on delete cascade,
  call_id uuid references public.calls(id) on delete set null,
  caller_name text,
  caller_phone text,
  vehicle text,
  problem text,
  urgency text check (urgency in ('emergency','today','this_week','flexible')),
  callback_window text,
  status text default 'new' check (status in ('new','called_back','converted','lost')),
  created_at timestamptz default now()
);

create index on public.calls (shop_id, started_at desc);
create index on public.leads (shop_id, created_at desc);
create index on public.calls (flagged_for_review, reviewed_by_operator) where flagged_for_review = true;

alter table public.shops enable row level security;
alter table public.calls enable row level security;
alter table public.leads enable row level security;

-- helper: is_operator from JWT user_metadata
create or replace function public.is_operator()
returns boolean
language sql
stable
as $$
  select coalesce(
    ((auth.jwt() -> 'user_metadata' ->> 'is_operator')::boolean),
    false
  );
$$;

-- shops policies
create policy "owners read own shop" on public.shops
  for select to authenticated
  using (user_id = auth.uid() or public.is_operator());

-- calls policies
create policy "owners read own shop calls" on public.calls
  for select to authenticated
  using (
    public.is_operator()
    or shop_id in (select id from public.shops where user_id = auth.uid())
  );

create policy "operators update calls" on public.calls
  for update to authenticated
  using (public.is_operator())
  with check (public.is_operator());

-- leads policies
create policy "owners read own shop leads" on public.leads
  for select to authenticated
  using (
    public.is_operator()
    or shop_id in (select id from public.shops where user_id = auth.uid())
  );

create policy "owners update own shop leads" on public.leads
  for update to authenticated
  using (
    public.is_operator()
    or shop_id in (select id from public.shops where user_id = auth.uid())
  )
  with check (
    public.is_operator()
    or shop_id in (select id from public.shops where user_id = auth.uid())
  );
