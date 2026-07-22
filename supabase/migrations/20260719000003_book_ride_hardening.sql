-- ─────────────────────────────────────────────────────────────────────────────
-- book_ride() hardening.
--
-- book_ride is SECURITY DEFINER, so it BYPASSES the bookings RLS policies —
-- including the women-only INSERT policy from 20260531000002. Until now a
-- crafted RPC call could book a women-only journey regardless of gender, book
-- on someone else's behalf, book a cancelled/departed ride, self-book, or
-- book without accepting the safety waiver. All of those checks now live
-- INSIDE the function, where SECURITY DEFINER can't skip them.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.book_ride(p_ride_id uuid, p_passenger_id uuid, p_seats int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ride public.rides%ROWTYPE;
BEGIN
  -- Identity: callers can only book for themselves.
  IF p_passenger_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF p_seats IS NULL OR p_seats < 1 OR p_seats > 4 THEN
    RAISE EXCEPTION 'invalid_seats';
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

  -- Women-only enforcement (mirrors the RLS policy this function bypasses).
  IF v_ride.women_only AND NOT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = p_passenger_id AND u.gender = 'female'
  ) THEN
    RAISE EXCEPTION 'women_only';
  END IF;

  -- Safety waiver: the passenger must have recorded acceptance for THIS
  -- journey before the booking can exist.
  IF NOT EXISTS (
    SELECT 1 FROM public.waiver_acceptances w
    WHERE w.user_id = p_passenger_id
      AND w.ride_id = p_ride_id
      AND w.role = 'passenger'
  ) THEN
    RAISE EXCEPTION 'waiver_required';
  END IF;

  -- A live booking already holds seats — rebooking would double-decrement.
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
