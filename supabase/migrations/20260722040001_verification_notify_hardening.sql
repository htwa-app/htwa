-- CodeRabbit PR #33 finding: the identity-verification notify trigger has the
-- same bug already fixed for driver_verifications in migration 20260722020001
-- (PR #32) — AFTER INSERT OR UPDATE OF status never fires on a resubmission,
-- since submitIdentityVerification()'s upsert doesn't include `status` in its
-- column list (a separate BEFORE trigger, verification_owner_resets_status,
-- resets it to 'pending' independently). Same fix: drop the column filter and
-- rely on the function body's own value-based check. Also trims the user's
-- email out of the ntfy payload for the same PII-reduction reason as before.
CREATE OR REPLACE FUNCTION public.notify_identity_verification_pending()
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
        'title', 'htwa: identity verification pending review',
        'message', coalesce(v_name, 'A user') || ' submitted ID verification for review.',
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
  AFTER INSERT OR UPDATE ON public.verification
  FOR EACH ROW EXECUTE FUNCTION public.notify_identity_verification_pending();
