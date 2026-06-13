-- CodeRabbit review (feat/journey-overhaul), IMPORTANT cluster:
-- the journey-overlap guard only fired BEFORE INSERT, so editing an existing
-- ride's departure / driver / status could create an overlap unchecked. Recreate
-- it to fire BEFORE INSERT OR UPDATE.
--
-- Atomicity: take a transaction-level advisory lock keyed on driver_id at the
-- start of the check so two concurrent inserts/updates for the SAME driver can't
-- both pass the overlap test before either commits. The lock is per-driver and
-- auto-released at transaction end, so it's low-risk and doesn't serialise
-- unrelated drivers.

CREATE OR REPLACE FUNCTION public.check_driver_journey_overlap()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  conflict RECORD;
  new_end  TIMESTAMPTZ;
BEGIN
  -- Only active journeys participate in the overlap rule; skip the (locked) check
  -- entirely for non-active rows so cancelling/completing a ride is never blocked.
  IF NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;

  -- Serialise overlap checks per-driver for atomicity against concurrent writes.
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.driver_id::text, 0));

  new_end := COALESCE(NEW.window_end, NEW.departure_datetime + INTERVAL '6 hours 30 minutes');

  SELECT r.id, r.from_location, r.to_location, r.departure_datetime,
         COALESCE(r.window_end, r.departure_datetime + INTERVAL '6 hours 30 minutes') AS w_end
    INTO conflict
  FROM public.rides r
  WHERE r.driver_id = NEW.driver_id
    AND r.id <> NEW.id
    AND r.status = 'active'
    AND NEW.departure_datetime < COALESCE(r.window_end, r.departure_datetime + INTERVAL '6 hours 30 minutes')
    AND r.departure_datetime < new_end
  ORDER BY r.departure_datetime
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'JOURNEY_OVERLAP: overlaps existing journey % (% -> %) departing %',
      conflict.id, conflict.from_location, conflict.to_location, conflict.departure_datetime
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_driver_journey_overlap ON public.rides;
CREATE TRIGGER trg_check_driver_journey_overlap
  BEFORE INSERT OR UPDATE ON public.rides
  FOR EACH ROW EXECUTE FUNCTION public.check_driver_journey_overlap();
