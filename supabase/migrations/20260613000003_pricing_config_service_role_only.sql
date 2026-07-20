-- Security fix (feat/journey-overhaul): pricing config/rates are admin/service
-- managed ONLY. No end user (authenticated or anon) may write them.
--
-- A prior review migration (20260613000001) added a FOR UPDATE policy on
-- pricing_config scoped TO authenticated, on the theory that an ON CONFLICT DO
-- UPDATE upsert needed it. That was wrong on two counts:
--   1. The only writer of pricing_config/pricing_rates is the migration seed,
--      which runs as `postgres` (BYPASSRLS) — and any future admin write would
--      use `service_role` (also BYPASSRLS). No end-user session ever writes
--      these tables (the app reads rates from constants/pricingRates.ts, not the
--      DB), so the policy was never actually needed.
--   2. `TO authenticated USING (true) WITH CHECK (true)` let ANY logged-in user
--      rewrite global pricing via a direct PostgREST call — a privilege-escalation
--      hole (a driver could zero out fees / inflate rates).
--
-- Fix: drop the authenticated UPDATE policy. With RLS on and no write policy for
-- authenticated/anon, all writes by those roles are denied; service_role and
-- postgres continue to write because they BYPASS RLS. The SELECT policies (read
-- rates/config) are intentionally left in place.

-- 1. Remove the over-permissive authenticated write policy.
DROP POLICY IF EXISTS "Authenticated can update config" ON public.pricing_config;

-- 2. Make the "service_role only" write intent explicit + self-documenting.
--    These are belt-and-suspenders: service_role already bypasses RLS, so they
--    grant nothing new — but they document that writes are service-managed and
--    guard against a future change that turns on FORCE ROW LEVEL SECURITY.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'pricing_config' AND policyname = 'Service role manages config'
  ) THEN
    EXECUTE 'CREATE POLICY "Service role manages config" ON public.pricing_config FOR ALL TO service_role USING (true) WITH CHECK (true)';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'pricing_rates' AND policyname = 'Service role manages rates'
  ) THEN
    EXECUTE 'CREATE POLICY "Service role manages rates" ON public.pricing_rates FOR ALL TO service_role USING (true) WITH CHECK (true)';
  END IF;
END $$;
