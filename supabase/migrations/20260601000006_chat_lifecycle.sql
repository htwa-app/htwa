-- Change 3: chat lifecycle + retention.
--
-- 3A RETENTION — chat history must NEVER be deletable (safeguarding / dispute
--    record, retained read-only forever).
--    The messages FKs were ON DELETE CASCADE, which would destroy chat history
--    when a booking or user was removed. We switch BOTH to ON DELETE RESTRICT so
--    no booking/user with messages can be hard-deleted out from under the record.
--    Normal flows are unaffected: bookings/rides are CANCELLED via a status
--    change (never DELETEd), and account deletion must ANONYMISE the users row
--    in place (scrub PII, keep the row) rather than DELETE it — see PROGRESS.md.
--    No FOR DELETE policy exists on messages and none is added, so with RLS on,
--    deletes are denied for all non-service clients.

ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_booking_id_fkey;
ALTER TABLE public.messages
  ADD CONSTRAINT messages_booking_id_fkey
  FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE RESTRICT;

ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE public.messages
  ADD CONSTRAINT messages_sender_id_fkey
  FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE RESTRICT;

-- 3B LIFECYCLE — chat state lives on the booking (a chat is 1:1 with a booking,
--    so a separate table would add no value). A chat is OPEN once the driver
--    ACCEPTS the booking (booking.status -> 'confirmed'); it can be CLOSED only
--    after the journey is complete.
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS chat_status TEXT NOT NULL DEFAULT 'open'
  CHECK (chat_status IN ('open', 'closed'));
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS chat_closed_at TIMESTAMPTZ;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS chat_closed_by UUID
  REFERENCES public.users(id) ON DELETE SET NULL;

-- Completion-gated close. SECURITY DEFINER so it can read rides/bookings; it
-- still verifies the caller is a participant and the journey is completed.
CREATE OR REPLACE FUNCTION public.close_chat(p_booking_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_passenger  uuid;
  v_driver     uuid;
  v_ride_status text;
BEGIN
  SELECT b.passenger_id, r.driver_id, r.status
    INTO v_passenger, v_driver, v_ride_status
  FROM public.bookings b
  JOIN public.rides r ON r.id = b.ride_id
  WHERE b.id = p_booking_id;

  IF v_passenger IS NULL THEN
    RAISE EXCEPTION 'booking_not_found';
  END IF;
  IF auth.uid() <> v_passenger AND auth.uid() <> v_driver THEN
    RAISE EXCEPTION 'not_a_participant';
  END IF;
  IF v_ride_status <> 'completed' THEN
    RAISE EXCEPTION 'journey_not_complete';
  END IF;

  UPDATE public.bookings
     SET chat_status    = 'closed',
         chat_closed_at = NOW(),
         chat_closed_by = auth.uid()
   WHERE id = p_booking_id;
END $$;

-- 3C INSERT GATE — no message may be inserted unless the booking is accepted
--    (chat is open from acceptance) AND chat_status is still 'open'. Recreate the
--    existing insert policy with the extra conditions.
DROP POLICY IF EXISTS "Booking participants can insert messages" ON public.messages;
CREATE POLICY "Booking participants can insert messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND (SELECT status      FROM public.bookings WHERE id = booking_id) = 'confirmed'
    AND (SELECT chat_status FROM public.bookings WHERE id = booking_id) = 'open'
    AND (
      auth.uid() = (SELECT passenger_id FROM public.bookings WHERE id = booking_id)
      OR auth.uid() = (
        SELECT r.driver_id FROM public.bookings b
        JOIN public.rides r ON r.id = b.ride_id
        WHERE b.id = booking_id
      )
    )
  );
