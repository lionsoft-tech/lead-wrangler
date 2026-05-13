create or replace function public.is_operator()
returns boolean language sql stable
set search_path = public
as $$
  select coalesce(((auth.jwt() -> 'user_metadata' ->> 'is_operator')::boolean), false);
$$;