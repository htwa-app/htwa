-- ─────────────────────────────────────────────────────────────────────────────
-- Driver verification (hands-on test round 2, fix #2).
--
-- Before a user can post ANY journey they must complete driver setup:
--   uploads: driving licence photo, live selfie, car photo with visible plate
--   fields:  car make, model, registration, colour
-- and be APPROVED by manual review (same model as student cards).
--
-- Photo routing (matches privacy-policy.md §2.2):
--   - licence + car photos → 'driver-verifications' bucket: owner + service
--     role ONLY, never readable by other users.
--   - the live selfie → existing 'verification-selfies' bucket (already
--     RLS-readable by booked passengers — it IS the disclosure photo).
--
-- Enforcement is DB-level: a BEFORE INSERT trigger on rides rejects drivers
-- without an approved verification (the UI gate is convenience, not the wall).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.driver_verifications (
  user_id            UUID        PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  licence_photo_path TEXT        NOT NULL,
  selfie_photo_path  TEXT        NOT NULL,  -- path in verification-selfies (disclosure photo)
  car_photo_path     TEXT        NOT NULL,
  car_make           TEXT        NOT NULL CHECK (length(trim(car_make)) > 0),
  car_model          TEXT        NOT NULL CHECK (length(trim(car_model)) > 0),
  car_registration   TEXT        NOT NULL CHECK (length(trim(car_registration)) > 0),
  car_colour         TEXT        NOT NULL CHECK (length(trim(car_colour)) > 0),
  status             TEXT        NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'approved', 'rejected')),
  review_note        TEXT,                  -- reviewer feedback on rejection
  submitted_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at        TIMESTAMPTZ
);

ALTER TABLE public.driver_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Driver reads own verification" ON public.driver_verifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Driver submits own verification" ON public.driver_verifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Driver updates own verification" ON public.driver_verifications
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Only the service role can approve/reject: any owner-side write is forced
-- back to 'pending' for re-review (covers both fresh submits and edits).
CREATE OR REPLACE FUNCTION public.driver_verification_owner_resets_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    NEW.status := 'pending';
    NEW.review_note := NULL;
    NEW.reviewed_at := NULL;
    NEW.submitted_at := now();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS driver_verifications_owner_pending ON public.driver_verifications;
CREATE TRIGGER driver_verifications_owner_pending
  BEFORE INSERT OR UPDATE ON public.driver_verifications
  FOR EACH ROW EXECUTE FUNCTION public.driver_verification_owner_resets_status();

-- ── Storage: locked-down bucket for licence + car photos ─────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('driver-verifications', 'driver-verifications', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Driver docs owner insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'driver-verifications' AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "Driver docs owner update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'driver-verifications' AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "Driver docs owner delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'driver-verifications' AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "Driver docs owner read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'driver-verifications' AND (storage.foldername(name))[1] = auth.uid()::text
  );
-- Deliberately NO cross-user read policy: review happens with service access.

-- ── DB-level posting gate ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.enforce_driver_verified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Service role may seed data (tests, admin tooling).
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.driver_verifications dv
    WHERE dv.user_id = NEW.driver_id
      AND dv.status = 'approved'
  ) THEN
    RAISE EXCEPTION 'driver_not_approved';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS rides_require_driver_verification ON public.rides;
CREATE TRIGGER rides_require_driver_verification
  BEFORE INSERT ON public.rides
  FOR EACH ROW EXECUTE FUNCTION public.enforce_driver_verified();

-- ── Disclosure now reads the APPROVED verification record ────────────────────
-- (vehicle facts come from what review actually checked, not the free-form
-- profiles.vehicle_details jsonb; selfie prefers the driver-setup capture.)
CREATE OR REPLACE FUNCTION public.get_driver_disclosure(p_ride_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ride    public.rides%ROWTYPE;
  v_user    public.users%ROWTYPE;
  v_dv      public.driver_verifications%ROWTYPE;
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
  SELECT * INTO v_dv FROM public.driver_verifications
    WHERE user_id = v_ride.driver_id AND status = 'approved';

  IF FOUND THEN
    v_selfie := v_dv.selfie_photo_path;
    v_vehicle := jsonb_build_object(
      'make', v_dv.car_make, 'model', v_dv.car_model,
      'colour', v_dv.car_colour, 'registration', v_dv.car_registration
    );
  ELSE
    -- Legacy fallback (rides posted before the verification gate existed).
    SELECT selfie_url INTO v_selfie FROM public.verification WHERE user_id = v_ride.driver_id;
    SELECT vehicle_details INTO v_vehicle FROM public.profiles WHERE user_id = v_ride.driver_id;
  END IF;

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

NOTIFY pgrst, 'reload schema';
