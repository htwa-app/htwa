-- Stage 53: messages table for in-app chat between driver and passenger

CREATE TABLE IF NOT EXISTS public.messages (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  UUID        NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  sender_id   UUID        NOT NULL REFERENCES public.users(id)    ON DELETE CASCADE,
  content     TEXT        NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Only participants in the booking can read/write messages
CREATE POLICY "Booking participants can view messages"
  ON public.messages FOR SELECT
  USING (
    auth.uid() = sender_id
    OR auth.uid() = (
      SELECT passenger_id FROM public.bookings WHERE id = booking_id
    )
    OR auth.uid() = (
      SELECT r.driver_id FROM public.bookings b
      JOIN public.rides r ON r.id = b.ride_id
      WHERE b.id = booking_id
    )
  );

CREATE POLICY "Booking participants can insert messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND (
      auth.uid() = (
        SELECT passenger_id FROM public.bookings WHERE id = booking_id
      )
      OR auth.uid() = (
        SELECT r.driver_id FROM public.bookings b
        JOIN public.rides r ON r.id = b.ride_id
        WHERE b.id = booking_id
      )
    )
  );
