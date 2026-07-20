-- ─────────────────────────────────────────────────────────────────────────────
-- Safety suite: live journey tracking, per-journey nominated contacts,
-- tokenised web tracking links, and auditable safety alerts (SOS / off-course
-- / signal-lost).
--
-- Design notes:
--  * rides.status gains 'in_progress' — a journey the driver has started.
--  * journey_contacts is the per-journey nominated contact (2A-c): one row per
--    participant per journey. The profile's nominated_contact jsonb remains as
--    the DEFAULT that pre-fills this table; all tracking/alerting reads the
--    journey's contact, never the profile's.
--  * trip_locations: driver location samples during an in-progress journey.
--  * trip_alerts: append-only audit of every safety alert (no UPDATE/DELETE
--    policies — rows are immutable to app users).
--  * get_tracking_snapshot(token): SECURITY DEFINER read for contacts WITHOUT
--    the app (tokenised web link). Token expires after trip end.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. rides.status: allow 'in_progress'
ALTER TABLE public.rides DROP CONSTRAINT IF EXISTS rides_status_check;
ALTER TABLE public.rides ADD CONSTRAINT rides_status_check
  CHECK (status IN ('active', 'full', 'in_progress', 'completed', 'cancelled'));

-- 2. Per-journey nominated contact
CREATE TABLE IF NOT EXISTS public.journey_contacts (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id          UUID        NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  user_id          UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  contact_name     TEXT        NOT NULL,
  contact_phone    TEXT        NOT NULL,
  contact_user_id  UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  tracking_token   UUID        NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  token_expires_at TIMESTAMPTZ,          -- NULL while journey not completed
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ride_id, user_id)              -- one nominated contact per participant per journey
);

ALTER TABLE public.journey_contacts ENABLE ROW LEVEL SECURITY;

-- Owner: full control of their own journey contact rows
CREATE POLICY "Journey contact owner all" ON public.journey_contacts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- An htwa-user nominated contact can see journeys they are the contact for
CREATE POLICY "Nominated app-user contact can read" ON public.journey_contacts
  FOR SELECT USING (auth.uid() = contact_user_id);

CREATE INDEX IF NOT EXISTS journey_contacts_ride_idx ON public.journey_contacts (ride_id);
CREATE INDEX IF NOT EXISTS journey_contacts_contact_user_idx ON public.journey_contacts (contact_user_id);

-- 3. Live location samples
CREATE TABLE IF NOT EXISTS public.trip_locations (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ride_id     UUID        NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  lat         DOUBLE PRECISION NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lng         DOUBLE PRECISION NOT NULL CHECK (lng BETWEEN -180 AND 180),
  heading     REAL,
  speed_mps   REAL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trip_locations_ride_time_idx
  ON public.trip_locations (ride_id, recorded_at DESC);

ALTER TABLE public.trip_locations ENABLE ROW LEVEL SECURITY;

-- Only the journey's driver may publish location, and only while in progress
CREATE POLICY "Driver inserts own trip locations" ON public.trip_locations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rides r
      WHERE r.id = ride_id AND r.driver_id = auth.uid() AND r.status = 'in_progress'
    )
  );

-- Readable by: the driver, booked (confirmed) passengers, and any htwa-user
-- nominated contact for that journey
CREATE POLICY "Trip participants and contacts read locations" ON public.trip_locations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.rides r
            WHERE r.id = ride_id AND r.driver_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.bookings b
               WHERE b.ride_id = trip_locations.ride_id
                 AND b.passenger_id = auth.uid() AND b.status = 'confirmed')
    OR EXISTS (SELECT 1 FROM public.journey_contacts jc
               WHERE jc.ride_id = trip_locations.ride_id
                 AND jc.contact_user_id = auth.uid()
                 AND (jc.token_expires_at IS NULL OR jc.token_expires_at > now()))
  );

-- Realtime: broadcast inserts on trip_locations
ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_locations;

-- 4. Safety alerts (append-only audit)
CREATE TABLE IF NOT EXISTS public.trip_alerts (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id    UUID        NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  raised_by  UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  alert_type TEXT        NOT NULL CHECK (alert_type IN ('sos', 'off_course', 'signal_lost')),
  lat        DOUBLE PRECISION CHECK (lat IS NULL OR lat BETWEEN -90 AND 90),
  lng        DOUBLE PRECISION CHECK (lng IS NULL OR lng BETWEEN -180 AND 180),
  detail     TEXT,
  channels   JSONB       NOT NULL DEFAULT '[]'::jsonb,  -- e.g. ["sms","push"] — how it was delivered
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trip_alerts_ride_idx ON public.trip_alerts (ride_id, created_at DESC);

ALTER TABLE public.trip_alerts ENABLE ROW LEVEL SECURITY;

-- A trip participant may raise an alert about their own journey.
-- No UPDATE/DELETE policies: the audit trail is immutable to app users.
CREATE POLICY "Participant raises alert" ON public.trip_alerts
  FOR INSERT WITH CHECK (
    auth.uid() = raised_by
    AND (
      EXISTS (SELECT 1 FROM public.rides r
              WHERE r.id = ride_id AND r.driver_id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.bookings b
                 WHERE b.ride_id = trip_alerts.ride_id
                   AND b.passenger_id = auth.uid() AND b.status = 'confirmed')
    )
  );

-- Readable by the raiser and by htwa-user nominated contacts of the journey
CREATE POLICY "Raiser and contacts read alerts" ON public.trip_alerts
  FOR SELECT USING (
    auth.uid() = raised_by
    OR EXISTS (SELECT 1 FROM public.journey_contacts jc
               WHERE jc.ride_id = trip_alerts.ride_id
                 AND jc.contact_user_id = auth.uid())
  );

-- Realtime for in-app contact alerting
ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_alerts;

-- 5. Token expiry: when a journey completes, start the tracking-token clock
--    (contacts keep access briefly to see "journey completed", then links die).
CREATE OR REPLACE FUNCTION public.expire_journey_tracking_tokens()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status IN ('completed', 'cancelled') AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE public.journey_contacts
       SET token_expires_at = now() + interval '2 hours'
     WHERE ride_id = NEW.id AND token_expires_at IS NULL;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS rides_expire_tracking_tokens ON public.rides;
CREATE TRIGGER rides_expire_tracking_tokens
  AFTER UPDATE OF status ON public.rides
  FOR EACH ROW EXECUTE FUNCTION public.expire_journey_tracking_tokens();

-- 6. Tokenised web tracking snapshot — for nominated contacts WITHOUT the app.
--    Validates the token, enforces expiry, and returns only what the tracking
--    page needs. SECURITY DEFINER + anon-executable by design; the unguessable
--    uuid token is the credential.
CREATE OR REPLACE FUNCTION public.get_tracking_snapshot(p_token uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_contact  public.journey_contacts%ROWTYPE;
  v_ride     public.rides%ROWTYPE;
  v_driver   TEXT;
  v_traveller TEXT;
  v_loc      jsonb;
  v_alerts   jsonb;
BEGIN
  SELECT * INTO v_contact FROM public.journey_contacts WHERE tracking_token = p_token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_token');
  END IF;
  IF v_contact.token_expires_at IS NOT NULL AND v_contact.token_expires_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'expired');
  END IF;

  SELECT * INTO v_ride FROM public.rides WHERE id = v_contact.ride_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_token');
  END IF;

  SELECT full_name INTO v_driver FROM public.users WHERE id = v_ride.driver_id;
  SELECT full_name INTO v_traveller FROM public.users WHERE id = v_contact.user_id;

  SELECT to_jsonb(t) INTO v_loc FROM (
    SELECT lat, lng, heading, speed_mps, recorded_at
    FROM public.trip_locations
    WHERE ride_id = v_ride.id
    ORDER BY recorded_at DESC
    LIMIT 1
  ) t;

  SELECT COALESCE(jsonb_agg(to_jsonb(a) ORDER BY a.created_at DESC), '[]'::jsonb)
    INTO v_alerts
    FROM (
      SELECT alert_type, lat, lng, detail, created_at
      FROM public.trip_alerts
      WHERE ride_id = v_ride.id
      ORDER BY created_at DESC
      LIMIT 20
    ) a;

  RETURN jsonb_build_object(
    'ok', true,
    'trip', jsonb_build_object(
      'status',             v_ride.status,
      'from_location',      v_ride.from_location,
      'to_location',        v_ride.to_location,
      'from_coords',        v_ride.from_coords,
      'to_coords',          v_ride.to_coords,
      'departure_datetime', v_ride.departure_datetime,
      'estimated_duration_seconds', v_ride.estimated_duration_seconds
    ),
    'traveller_name',  v_traveller,
    'driver_name',     v_driver,
    'contact_name',    v_contact.contact_name,
    'last_location',   v_loc,
    'alerts',          v_alerts
  );
END $$;

-- The token IS the credential — callable without an authenticated session.
REVOKE ALL ON FUNCTION public.get_tracking_snapshot(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.get_tracking_snapshot(uuid) TO anon, authenticated;
