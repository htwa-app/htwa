-- ─────────────────────────────────────────────────────────────────────────────
-- Push notification to Jordan when a driver_verifications row enters review.
--
-- Interim solution (hands-on round-2 follow-up): MailerLite (the key already
-- in 1Password) turned out NOT to support single transactional email sends —
-- that's a separate product (MailerSend) we don't have credentials for. Until
-- Jordan sets up a proper transactional-email key, this pushes a free ntfy.sh
-- notification instead, straight from a DB trigger via pg_net (no Edge
-- Function needed — ntfy's publish endpoint takes a plain HTTP POST).
--
-- CAVEAT: ntfy.sh's free tier has no auth — the topic name IS the only
-- protection. Anyone who learns it can read these alerts (driver name/email/
-- car details) or post fake ones. Treat the topic as lightly sensitive, same
-- trade-off as an unauthenticated webhook URL. Replace with a real
-- transactional-email trigger once a proper key exists (see BLOCKERS item 7).
--
-- Fires on: fresh submission (INSERT) and resubmission after rejection
-- (UPDATE ... status back to 'pending', forced by the existing
-- driver_verification_owner_resets_status trigger). Never fires on
-- service-role approve/reject — those set status to something other than
-- 'pending'.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.notify_driver_verification_pending()
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
        'title', 'htwa: driver verification pending review',
        'message', coalesce(v_name, 'A driver') || ' (' || coalesce(v_email, 'no email on file') ||
                   ') submitted ' || NEW.car_colour || ' ' || NEW.car_make || ' ' || NEW.car_model ||
                   ' ' || NEW.car_registration || ' for review.',
        'priority', 4,
        'tags', jsonb_build_array('car')
      ),
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS driver_verifications_notify_pending ON public.driver_verifications;
CREATE TRIGGER driver_verifications_notify_pending
  AFTER INSERT OR UPDATE OF status ON public.driver_verifications
  FOR EACH ROW EXECUTE FUNCTION public.notify_driver_verification_pending();
