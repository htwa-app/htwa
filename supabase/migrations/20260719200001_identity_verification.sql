-- ─────────────────────────────────────────────────────────────────────────────
-- Universal identity verification: photo ID + DOB for ALL users, not just
-- drivers. Replaces the Phase-15 placeholder (instant self-approve) with a
-- real reviewed flow — same pattern as driver_verifications.
--
-- Rationale (Jordan, 19 Jul): gender is already self-reported at signup and
-- a live selfie is already mandatory, but nothing is actually cross-checked
-- against a real document. This closes that gap for every user — critical
-- for protecting female drivers from unverified passengers, not just the
-- other way around.
--
-- Gating model (Jordan's call): submitting identity verification stays
-- mandatory before using the app at all (routing unchanged — no row yet
-- means id-verify). Once submitted, browsing/search unlock immediately even
-- while pending; booking a seat or posting a journey specifically requires
-- status = 'approved'. No minimum-age enforcement for now — DOB is collected
-- and shown to the reviewer, not enforced as a gate.
--
-- Existing already-verified accounts (id_verified AND selfie_verified under
-- the old boolean model) are grandfathered as 'approved' — the policy change
-- applies going forward, nobody who already passed gets retroactively
-- blocked. Confirmed live: exactly 2 rows, both fully verified.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.verification
  ADD COLUMN IF NOT EXISTS date_of_birth    DATE,
  ADD COLUMN IF NOT EXISTS id_document_path TEXT,
  ADD COLUMN IF NOT EXISTS status           TEXT NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS review_note      TEXT,
  ADD COLUMN IF NOT EXISTS submitted_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS reviewed_at      TIMESTAMPTZ;

-- Grandfather: anyone who already passed the old boolean check is approved
-- under the new model. One-time backfill, not a standing behaviour.
UPDATE public.verification
   SET status = 'approved', reviewed_at = now()
 WHERE id_verified = true AND selfie_verified = true AND status = 'pending';

-- The old booleans are now fully superseded by `status` — drop them rather
-- than carry dead/duplicate state (every consumer updated in this same PR).
ALTER TABLE public.verification
  DROP COLUMN IF EXISTS id_verified,
  DROP COLUMN IF EXISTS selfie_verified;

-- Owner writes are forced back to 'pending' for re-review — identical
-- pattern to driver_verifications. Only service-role (dashboard review) can
-- set approved/rejected.
CREATE OR REPLACE FUNCTION public.verification_owner_resets_status()
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

DROP TRIGGER IF EXISTS verification_owner_pending ON public.verification;
CREATE TRIGGER verification_owner_pending
  BEFORE INSERT OR UPDATE ON public.verification
  FOR EACH ROW EXECUTE FUNCTION public.verification_owner_resets_status();

-- ── Storage: locked-down bucket for the photo-ID document ────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('identity-documents', 'identity-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Identity doc owner insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'identity-documents' AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "Identity doc owner update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'identity-documents' AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "Identity doc owner delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'identity-documents' AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "Identity doc owner read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'identity-documents' AND (storage.foldername(name))[1] = auth.uid()::text
  );
-- No cross-user read policy: review happens with service-role access, same
-- as driver licence/car photos.

-- ── Notify Jordan on submission (reuses the same ntfy topic + click-through
--    added for driver verifications, distinct title so the two are tellable
--    apart in one notification feed) ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_identity_verification_pending()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_name  TEXT;
  v_email TEXT;
BEGIN
  IF NEW.status = 'pending' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'pending') THEN
    SELECT full_name, email INTO v_name, v_email FROM public.users WHERE id = NEW.user_id;

    PERFORM net.http_post(
      url := 'https://ntfy.sh/',
      body := jsonb_build_object(
        'topic', 'htwa-driver-review-3b0ae5a0413c639d095a',
        'title', 'htwa: identity verification pending review',
        'message', coalesce(v_name, 'A user') || ' (' || coalesce(v_email, 'no email on file') ||
                   ') submitted ID verification for review.',
        'priority', 4,
        'tags', jsonb_build_array('bust_in_silhouette'),
        'click', 'https://supabase.com/dashboard/project/adrwtjlphjrnrrqjkbfk/editor'
      ),
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS verification_notify_pending ON public.verification;
CREATE TRIGGER verification_notify_pending
  AFTER INSERT OR UPDATE OF status ON public.verification
  FOR EACH ROW EXECUTE FUNCTION public.notify_identity_verification_pending();

-- ── DB-level booking/posting gates (defense-in-depth, matches driver_verifications) ──

CREATE OR REPLACE FUNCTION public.user_identity_approved(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.verification v WHERE v.user_id = p_user_id AND v.status = 'approved'
  );
$$;
REVOKE ALL ON FUNCTION public.user_identity_approved(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.user_identity_approved(uuid) TO authenticated;

-- book_ride(): passenger must be identity-approved, in addition to every
-- existing guard (women-only, waiver, seats, etc.).
CREATE OR REPLACE FUNCTION public.book_ride(p_ride_id uuid, p_passenger_id uuid, p_seats int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ride public.rides%ROWTYPE;
BEGIN
  IF p_passenger_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF p_seats IS NULL OR p_seats < 1 OR p_seats > 4 THEN
    RAISE EXCEPTION 'invalid_seats';
  END IF;
  IF NOT public.user_identity_approved(p_passenger_id) THEN
    RAISE EXCEPTION 'identity_not_approved';
  END IF;

  SELECT * INTO v_ride FROM public.rides WHERE id = p_ride_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ride_not_found';
  END IF;
  IF v_ride.status <> 'active' THEN
    RAISE EXCEPTION 'ride_not_bookable';
  END IF;
  IF v_ride.departure_datetime <= now() THEN
    RAISE EXCEPTION 'ride_departed';
  END IF;
  IF v_ride.driver_id = p_passenger_id THEN
    RAISE EXCEPTION 'own_ride';
  END IF;

  IF v_ride.women_only AND NOT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = p_passenger_id AND u.gender = 'female'
  ) THEN
    RAISE EXCEPTION 'women_only';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.waiver_acceptances w
    WHERE w.user_id = p_passenger_id
      AND w.ride_id = p_ride_id
      AND w.role = 'passenger'
  ) THEN
    RAISE EXCEPTION 'waiver_required';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.ride_id = p_ride_id
      AND b.passenger_id = p_passenger_id
      AND b.status IN ('pending', 'confirmed')
  ) THEN
    RAISE EXCEPTION 'already_booked';
  END IF;

  IF v_ride.seats_available < p_seats THEN
    RAISE EXCEPTION 'not_enough_seats';
  END IF;

  INSERT INTO public.bookings (ride_id, passenger_id, seats_booked, status)
    VALUES (p_ride_id, p_passenger_id, p_seats, 'pending')
    ON CONFLICT (ride_id, passenger_id) DO UPDATE SET status = 'pending', seats_booked = p_seats;

  UPDATE public.rides SET
    seats_available = seats_available - p_seats,
    status = CASE WHEN seats_available - p_seats = 0 THEN 'full' ELSE 'active' END
  WHERE id = p_ride_id;
END $$;

-- rides INSERT trigger: driver must ALSO be identity-approved, in addition
-- to the existing driver_verifications (car) approval check.
CREATE OR REPLACE FUNCTION public.enforce_driver_verified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF NOT public.user_identity_approved(NEW.driver_id) THEN
    RAISE EXCEPTION 'identity_not_approved';
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

NOTIFY pgrst, 'reload schema';
