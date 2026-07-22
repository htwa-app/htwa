-- CodeRabbit PR #32 triage — two real findings against driver_verifications.
--
-- 1. Notify trigger was filtered on "UPDATE OF status", but
--    submitDriverVerification()'s resubmission upsert never includes `status`
--    in its column list (status is reset to 'pending' by a SEPARATE BEFORE
--    trigger, driver_verifications_owner_resets_status). Postgres's column-
--    filtered UPDATE OF triggers match on the firing statement's own target
--    list, not on values changed by another trigger — so this fired on fresh
--    submissions (INSERT) but silently never fired on resubmissions after a
--    rejection. Jordan was missing exactly the review-worthy case. Fix:
--    drop the column filter and rely on the function body's own
--    OLD.status IS DISTINCT FROM 'pending' check, which already gates
--    correctly on the actual before/after values.
-- 2. The ntfy payload included the driver's email address. ntfy.sh's free
--    tier has no auth (the topic name is the only protection — see
--    BLOCKERS-FOR-JORDAN.md item 7, an already-disclosed, deliberate interim
--    tradeoff pending a proper transactional-email key). Trimming the email
--    out of the payload reduces what a topic leak would expose, with no new
--    credentials needed — unlike replacing the whole channel, which stays
--    pending Jordan's action per item 7.
CREATE OR REPLACE FUNCTION public.notify_driver_verification_pending()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_name TEXT;
BEGIN
  IF NEW.status = 'pending' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'pending') THEN
    SELECT full_name INTO v_name FROM public.users WHERE id = NEW.user_id;

    PERFORM net.http_post(
      url := 'https://ntfy.sh/',
      body := jsonb_build_object(
        'topic', 'htwa-driver-review-3b0ae5a0413c639d095a',
        'title', 'htwa: driver verification pending review',
        'message', coalesce(v_name, 'A driver') ||
                   ' submitted ' || NEW.car_colour || ' ' || NEW.car_make || ' ' || NEW.car_model ||
                   ' ' || NEW.car_registration || ' for review.',
        'priority', 4,
        'tags', jsonb_build_array('car'),
        'click', 'https://supabase.com/dashboard/project/adrwtjlphjrnrrqjkbfk/editor'
      ),
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS driver_verifications_notify_pending ON public.driver_verifications;
CREATE TRIGGER driver_verifications_notify_pending
  AFTER INSERT OR UPDATE ON public.driver_verifications
  FOR EACH ROW EXECUTE FUNCTION public.notify_driver_verification_pending();

-- 3. Ownership hardening on the three photo-path columns: require each path
--    to be scoped under its own user_id (matches how every upload in
--    services/driverVerification.ts already writes paths — `${userId}/...` —
--    so this is a defense-in-depth constraint, not a behaviour change; the
--    one existing row already conforms, confirmed before adding this).
ALTER TABLE public.driver_verifications
  ADD CONSTRAINT driver_verifications_licence_path_owned
    CHECK (licence_photo_path LIKE user_id::text || '/%'),
  ADD CONSTRAINT driver_verifications_selfie_path_owned
    CHECK (selfie_photo_path LIKE user_id::text || '/%'),
  ADD CONSTRAINT driver_verifications_car_path_owned
    CHECK (car_photo_path LIKE user_id::text || '/%');
