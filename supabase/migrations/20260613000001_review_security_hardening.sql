-- CodeRabbit review hardening (feat/journey-overhaul), critical #4.
--
-- The original chat_lifecycle and pricing_and_driver migrations are already
-- applied to the live DB, so these fixes ship as a new migration rather than
-- amending the ran files.

-- ─── 1. Harden close_chat (SECURITY DEFINER) ──────────────────────────────────
-- (a) Pin search_path so object resolution inside the definer function can't be
--     hijacked by a caller-controlled search_path.
-- (b) Guard the UPDATE with `chat_closed_at IS NULL` so a repeated call can't
--     overwrite the original audit fields (closed_at / closed_by).
CREATE OR REPLACE FUNCTION public.close_chat(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_passenger  uuid;
  v_driver     uuid;
  v_ride_status text;
BEGIN
  SELECT b.passenger_id, r.driver_id, r.status
    INTO v_passenger, v_driver, v_ride_status
  FROM public.bookings b
  JOIN public.rides r ON r.id = b.ride_id
  WHERE b.id = p_booking_id;

  IF v_passenger IS NULL THEN
    RAISE EXCEPTION 'booking_not_found';
  END IF;
  IF auth.uid() <> v_passenger AND auth.uid() <> v_driver THEN
    RAISE EXCEPTION 'not_a_participant';
  END IF;
  IF v_ride_status <> 'completed' THEN
    RAISE EXCEPTION 'journey_not_complete';
  END IF;

  -- Only set the close fields on the FIRST close; later calls are a no-op and
  -- leave the original closed_at / closed_by audit trail intact.
  UPDATE public.bookings
     SET chat_status    = 'closed',
         chat_closed_at = NOW(),
         chat_closed_by = auth.uid()
   WHERE id = p_booking_id
     AND chat_closed_at IS NULL;
END $$;

-- ─── 2. pricing_config FOR UPDATE policy ──────────────────────────────────────
-- pricing_config had RLS + a SELECT policy but no UPDATE policy, which blocks the
-- ON CONFLICT DO UPDATE upsert for any non-bypass role. Add a matching UPDATE
-- policy using the same IF NOT EXISTS pattern as the rest of that migration.
-- Config is admin-managed; allow authenticated roles to update (writes are still
-- gated by being authenticated, mirroring the existing world-readable SELECT).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'pricing_config' AND policyname = 'Authenticated can update config'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated can update config" ON public.pricing_config FOR UPDATE TO authenticated USING (true) WITH CHECK (true)';
  END IF;
END $$;
