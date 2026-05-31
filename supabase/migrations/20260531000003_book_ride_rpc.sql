-- Stage 36: atomic seat booking RPC.
-- Locks the ride row, checks availability, upserts the booking, decrements seats,
-- and flips the ride to 'full' when no seats remain — all in one transaction.
CREATE OR REPLACE FUNCTION public.book_ride(p_ride_id uuid, p_passenger_id uuid, p_seats int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF (SELECT seats_available FROM rides WHERE id = p_ride_id FOR UPDATE) < p_seats THEN
    RAISE EXCEPTION 'not_enough_seats';
  END IF;
  INSERT INTO bookings (ride_id, passenger_id, seats_booked, status)
    VALUES (p_ride_id, p_passenger_id, p_seats, 'pending')
    ON CONFLICT (ride_id, passenger_id) DO UPDATE SET status='pending', seats_booked=p_seats;
  UPDATE rides SET
    seats_available = seats_available - p_seats,
    status = CASE WHEN seats_available - p_seats = 0 THEN 'full' ELSE 'active' END
  WHERE id = p_ride_id;
END $$;
