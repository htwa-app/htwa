-- ─────────────────────────────────────────────────────────────────────────────
-- Verification disclosure + waiver flow (2A) + refund plumbing.
--
--  * bookings.payment_intent_id — recorded by the create-payment-intent Edge
--    Function so refunds never need a Stripe metadata search.
--  * verification.selfie_url — the LIVE-CAPTURED selfie from verification
--    (never the ID document image); shown to booked passengers only.
--  * account_flags — service-role-only review queue (e.g. driver-mismatch
--    reports). RLS enabled with NO policies: app users can neither read nor
--    write; only Edge Functions (service role) touch it.
--  * waiver_acceptances — immutable record of Journey Verification & Safety
--    Responsibility Acknowledgment acceptances (both roles).
--  * get_driver_disclosure(ride_id) — the "Verify your driver" panel data,
--    gated server-side to that journey's booked passengers.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Refund plumbing
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_intent_id TEXT;

-- 2. Verified selfie photo (live-captured during verification)
ALTER TABLE public.verification ADD COLUMN IF NOT EXISTS selfie_url TEXT;

-- 3. Account flags (service-role only)
CREATE TABLE IF NOT EXISTS public.account_flags (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  flag_type  TEXT        NOT NULL,
  detail     TEXT,
  raised_by  UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  resolved   BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.account_flags ENABLE ROW LEVEL SECURITY;
-- Deliberately NO policies: service-role access only.

-- 4. Waiver acceptances (immutable; one per user+journey+role+version)
CREATE TABLE IF NOT EXISTS public.waiver_acceptances (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  ride_id          UUID        REFERENCES public.rides(id) ON DELETE SET NULL,
  booking_id       UUID        REFERENCES public.bookings(id) ON DELETE SET NULL,
  role             TEXT        NOT NULL CHECK (role IN ('driver', 'passenger')),
  document_version TEXT        NOT NULL,
  accepted_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS waiver_acceptances_user_idx ON public.waiver_acceptances (user_id);
CREATE INDEX IF NOT EXISTS waiver_acceptances_ride_idx ON public.waiver_acceptances (ride_id);

ALTER TABLE public.waiver_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User records own waiver acceptance" ON public.waiver_acceptances
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User reads own waiver acceptances" ON public.waiver_acceptances
  FOR SELECT USING (auth.uid() = user_id);
-- No UPDATE/DELETE policies: acceptances are immutable evidence.

-- 5. Driver disclosure for booked passengers ("Verify your driver" panel).
--    Returns identity + vehicle details ONLY when the caller holds a
--    pending/confirmed booking on the journey (or is the driver themselves,
--    for preview). Never publicly readable.
CREATE OR REPLACE FUNCTION public.get_driver_disclosure(p_ride_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ride    public.rides%ROWTYPE;
  v_user    public.users%ROWTYPE;
  v_selfie  TEXT;
  v_vehicle jsonb;
BEGIN
  SELECT * INTO v_ride FROM public.rides WHERE id = p_ride_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  IF auth.uid() IS NULL OR (
       auth.uid() <> v_ride.driver_id
       AND NOT EXISTS (
         SELECT 1 FROM public.bookings b
         WHERE b.ride_id = p_ride_id
           AND b.passenger_id = auth.uid()
           AND b.status IN ('pending', 'confirmed')
       )
     ) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'forbidden');
  END IF;

  SELECT * INTO v_user FROM public.users WHERE id = v_ride.driver_id;
  SELECT selfie_url INTO v_selfie FROM public.verification WHERE user_id = v_ride.driver_id;
  SELECT vehicle_details INTO v_vehicle FROM public.profiles WHERE user_id = v_ride.driver_id;

  RETURN jsonb_build_object(
    'ok', true,
    'driver', jsonb_build_object(
      'full_name',  v_user.full_name,
      'gender',     v_user.gender,
      'selfie_url', v_selfie
    ),
    'vehicle', COALESCE(v_vehicle, '{}'::jsonb)
  );
END $$;

REVOKE ALL ON FUNCTION public.get_driver_disclosure(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_driver_disclosure(uuid) TO authenticated;

-- 6. Verification selfies storage bucket + policies.
--    Path convention: {userId}/selfie-{version}.jpg
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-selfies', 'verification-selfies', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Selfie owner insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'verification-selfies'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "Selfie owner update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'verification-selfies'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "Selfie owner delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'verification-selfies'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
-- Read: the owner, plus passengers holding a live booking on any journey
-- driven by the selfie's owner (the disclosure panel's image fetch).
CREATE POLICY "Selfie readable by owner and booked passengers" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'verification-selfies'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.bookings b
        JOIN public.rides r ON r.id = b.ride_id
        WHERE b.passenger_id = auth.uid()
          AND b.status IN ('pending', 'confirmed')
          AND r.driver_id::text = (storage.foldername(name))[1]
      )
    )
  );
