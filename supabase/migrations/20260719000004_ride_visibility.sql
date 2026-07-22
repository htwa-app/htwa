-- ─────────────────────────────────────────────────────────────────────────────
-- Ride visibility fixes.
--
-- "Anyone can view active rides" (status = 'active') + "Driver can view own
-- rides" were the ONLY rides SELECT policies — so a passenger with a booking
-- lost all visibility of the journey the moment it left 'active' (went full,
-- started, completed, or was cancelled). That broke My Journeys, ride detail,
-- and the live-trip passenger view for exactly the journeys passengers care
-- about most.
--
-- Also: an htwa-user nominated contact needs to read the journey they are the
-- contact for (in-app live view).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "Booked passenger can view ride" ON public.rides
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.ride_id = id
        AND b.passenger_id = auth.uid()
    )
  );

CREATE POLICY "Journey contact can view ride" ON public.rides
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.journey_contacts jc
      WHERE jc.ride_id = id
        AND jc.contact_user_id = auth.uid()
        AND (jc.token_expires_at IS NULL OR jc.token_expires_at > now())
    )
  );
