-- Change 2: a driver cannot advertise two journeys whose time windows overlap.
--
-- A journey's window is [departure_datetime, window_end), where
--   window_end = departure + estimated_duration + 30-minute buffer.
-- The client computes window_end from the Google Routes API duration; this
-- trigger is the AUTHORITATIVE server-side guard. Two windows overlap iff
--   newStart < existingEnd AND existingStart < newEnd.
--
-- Only journeys where the user is the DRIVER count (passenger bookings are a
-- different table). Rows missing window_end (legacy, or a client that couldn't
-- estimate duration) fall back to a conservative 6h30m window so the check
-- over-blocks rather than letting overlaps through.

ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS estimated_duration_seconds INTEGER;
ALTER TABLE public.rides ADD COLUMN IF NOT EXISTS window_end TIMESTAMPTZ;

-- Conservative fallback window = 6h drive + 30m buffer (matches
-- FALLBACK_DURATION_SECONDS + OVERLAP_BUFFER_SECONDS in utils/journeyWindow.ts).
CREATE OR REPLACE FUNCTION public.check_driver_journey_overlap()
RETURNS TRIGGER AS $$
DECLARE
  conflict RECORD;
  new_end  TIMESTAMPTZ;
BEGIN
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_driver_journey_overlap ON public.rides;
CREATE TRIGGER trg_check_driver_journey_overlap
  BEFORE INSERT ON public.rides
  FOR EACH ROW EXECUTE FUNCTION public.check_driver_journey_overlap();
