-- CodeRabbit review (feat/journey-overhaul PR #27, 17 July run): services/bookings.ts's
-- restoreRideSeats did a SELECT of seats_available/seats_total/status, computed the
-- new value in JS, then a separate UPDATE — a classic read-modify-write race.
-- Two concurrent restores on the SAME ride (e.g. two different passengers on the
-- same journey cancelling around the same time) could both read the same starting
-- seats_available and each write back total+1 instead of total+2, silently losing
-- a seat restoration.
--
-- Fix: do the whole read-modify-write as ONE UPDATE statement (mirrors book_ride's
-- existing pattern of doing the check-and-write atomically). Postgres row-locks the
-- row for the duration of an UPDATE, so concurrent restores on the same ride now
-- serialise instead of racing.

CREATE OR REPLACE FUNCTION public.restore_ride_seats(p_ride_id uuid, p_seats int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.rides
     SET seats_available = LEAST(seats_total, seats_available + p_seats),
         status = CASE WHEN status = 'full' THEN 'active' ELSE status END
   WHERE id = p_ride_id;
END $$;
