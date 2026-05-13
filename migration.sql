-- ============================================================
-- migration.sql — lead-wrangler real Supabase
-- ============================================================
-- STATEMENT SUMMARY (in execution order)
-- --------------------------------------------------------
-- 1. CREATE OR REPLACE FUNCTION public.is_operator()
--       Reads is_operator from JWT user_metadata; returns boolean.
--       Must exist before any policy below can reference it.
--
-- 2. DROP POLICY IF EXISTS "shop_owners_can_view_their_shop" ON public.shops
--    CREATE POLICY "owners read own shop" — shops, SELECT, authenticated
--       USING: user_id = auth.uid() OR public.is_operator()
--
-- 3. DROP POLICY IF EXISTS "shop_owners_can_view_their_calls" ON public.calls
--    CREATE POLICY "owners read own shop calls" — calls, SELECT, authenticated
--       USING: public.is_operator() OR shop_id IN (owner's shops)
--
-- 4. DROP POLICY IF EXISTS "shop_owners_can_view_their_leads" ON public.leads
--    CREATE POLICY "owners read own shop leads" — leads, SELECT, authenticated
--       USING: public.is_operator() OR shop_id IN (owner's shops)
--
-- 5. DROP POLICY IF EXISTS "shop_owners_can_update_their_leads" ON public.leads
--    CREATE POLICY "owners update own shop leads" — leads, UPDATE, authenticated
--       USING: public.is_operator() OR shop_id IN (owner's shops)
--       WITH CHECK: same as USING (was previously null)
--
-- 6. CREATE POLICY "operators update calls" — calls, UPDATE, authenticated
--       USING: public.is_operator()
--       WITH CHECK: public.is_operator()
-- ============================================================

BEGIN;

-- ============================================================
-- 1. Functions
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_operator()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    ((auth.jwt() -> 'user_metadata' ->> 'is_operator')::boolean),
    false
  );
$$;

-- ============================================================
-- 2. Replace owner policies (drop + create pairs)
-- ============================================================

-- shops: owner read
DROP POLICY IF EXISTS "shop_owners_can_view_their_shop" ON public.shops;
CREATE POLICY "owners read own shop"
  ON public.shops
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_operator());

-- calls: owner read
DROP POLICY IF EXISTS "shop_owners_can_view_their_calls" ON public.calls;
CREATE POLICY "owners read own shop calls"
  ON public.calls
  FOR SELECT
  TO authenticated
  USING (
    public.is_operator()
    OR shop_id IN (SELECT id FROM public.shops WHERE user_id = auth.uid())
  );

-- leads: owner read
DROP POLICY IF EXISTS "shop_owners_can_view_their_leads" ON public.leads;
CREATE POLICY "owners read own shop leads"
  ON public.leads
  FOR SELECT
  TO authenticated
  USING (
    public.is_operator()
    OR shop_id IN (SELECT id FROM public.shops WHERE user_id = auth.uid())
  );

-- leads: owner update (also adds the previously-missing WITH CHECK)
DROP POLICY IF EXISTS "shop_owners_can_update_their_leads" ON public.leads;
CREATE POLICY "owners update own shop leads"
  ON public.leads
  FOR UPDATE
  TO authenticated
  USING (
    public.is_operator()
    OR shop_id IN (SELECT id FROM public.shops WHERE user_id = auth.uid())
  )
  WITH CHECK (
    public.is_operator()
    OR shop_id IN (SELECT id FROM public.shops WHERE user_id = auth.uid())
  );

-- ============================================================
-- 3. New operator policy
-- ============================================================

CREATE POLICY "operators update calls"
  ON public.calls
  FOR UPDATE
  TO authenticated
  USING (public.is_operator())
  WITH CHECK (public.is_operator());

COMMIT;

-- ============================================================
-- REVIEW CHECKLIST (verify in Supabase after applying)
-- ============================================================
-- [ ] public.is_operator() appears in Database > Functions
-- [ ] shops has exactly 3 policies:
--       "owners read own shop"           (SELECT, authenticated)
--       "shop_owners_can_update_their_shop" (UPDATE, public) ← unchanged, still here
--       (no others)
-- [ ] calls has exactly 2 policies:
--       "owners read own shop calls"     (SELECT, authenticated)
--       "operators update calls"         (UPDATE, authenticated)
-- [ ] leads has exactly 2 policies:
--       "owners read own shop leads"     (SELECT, authenticated)
--       "owners update own shop leads"   (UPDATE, authenticated)
-- [ ] No policy in any table still shows role = {public}
--       (shop_owners_can_update_their_shop is the one expected exception)
-- [ ] rls_auto_enable() is untouched (still present, still an event trigger)
-- [ ] No rows were inserted, updated, or deleted (this was DDL only)
-- ============================================================
