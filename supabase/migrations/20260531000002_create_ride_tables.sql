-- Stage 30: rides + bookings tables with RLS policies

-- ─── rides ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.rides (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id         UUID        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  from_location     TEXT        NOT NULL,
  from_coords       JSONB,                      -- { lat, lng }
  to_location       TEXT        NOT NULL,
  to_coords         JSONB,
  departure_datetime TIMESTAMPTZ NOT NULL,
  seats_total       INTEGER     NOT NULL CHECK (seats_total BETWEEN 1 AND 8),
  seats_available   INTEGER     NOT NULL,
  cost_per_seat     DECIMAL(10,2) NOT NULL,
  currency          TEXT        NOT NULL CHECK (currency IN ('EUR', 'GBP')),
  distance_km       DECIMAL(10,2),
  women_only        BOOLEAN     NOT NULL DEFAULT false,
  status            TEXT        NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'full', 'completed', 'cancelled')),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── bookings ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.bookings (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id       UUID    NOT NULL REFERENCES public.rides(id) ON DELETE CASCADE,
  passenger_id  UUID    NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  seats_booked  INTEGER NOT NULL DEFAULT 1,
  status        TEXT    NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'confirmed', 'declined', 'cancelled')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ride_id, passenger_id)
);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.rides    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Rides: anyone authenticated can view active rides (search)
CREATE POLICY "Anyone can view active rides"
  ON public.rides FOR SELECT
  USING (status = 'active');

-- Rides: driver can see all their own rides regardless of status
CREATE POLICY "Driver can view own rides"
  ON public.rides FOR SELECT
  USING (auth.uid() = driver_id);

-- Rides: only the driver can insert
CREATE POLICY "Driver can insert rides"
  ON public.rides FOR INSERT
  WITH CHECK (auth.uid() = driver_id);

-- Rides: only the driver can update their own ride
CREATE POLICY "Driver can update own ride"
  ON public.rides FOR UPDATE
  USING (auth.uid() = driver_id);

-- Bookings: passenger can see their own bookings
CREATE POLICY "Passenger can view own bookings"
  ON public.bookings FOR SELECT
  USING (auth.uid() = passenger_id);

-- Bookings: driver can see bookings on their rides
CREATE POLICY "Driver can view bookings on own rides"
  ON public.bookings FOR SELECT
  USING (
    auth.uid() = (
      SELECT driver_id FROM public.rides WHERE id = ride_id
    )
  );

-- Bookings: passenger can insert their own booking
CREATE POLICY "Passenger can insert booking"
  ON public.bookings FOR INSERT
  WITH CHECK (auth.uid() = passenger_id);

-- Bookings: passenger can cancel (update status) their own booking
CREATE POLICY "Passenger can update own booking"
  ON public.bookings FOR UPDATE
  USING (auth.uid() = passenger_id);

-- Bookings: driver can accept/decline bookings on their rides
CREATE POLICY "Driver can update bookings on own rides"
  ON public.bookings FOR UPDATE
  USING (
    auth.uid() = (
      SELECT driver_id FROM public.rides WHERE id = ride_id
    )
  );

-- ─── Women-only enforcement ────────────────────────────────────────────────────
-- Passengers can only book women-only rides if their gender is 'female'.
-- Add gender column to users table (used in Stage 52 as well).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'users'
      AND column_name  = 'gender'
  ) THEN
    ALTER TABLE public.users ADD COLUMN gender TEXT CHECK (gender IN ('female', 'male', 'non_binary', 'prefer_not_to_say'));
  END IF;
END $$;

-- Women-only booking enforcement at DB level:
-- A booking INSERT is only allowed if the ride is NOT women_only,
-- OR if the passenger's gender is 'female'.
DROP POLICY IF EXISTS "Passenger can insert booking" ON public.bookings;
CREATE POLICY "Passenger can insert booking"
  ON public.bookings FOR INSERT
  WITH CHECK (
    auth.uid() = passenger_id
    AND (
      -- Either the ride is open to everyone
      NOT EXISTS (
        SELECT 1 FROM public.rides r
        WHERE r.id = ride_id AND r.women_only = true
      )
      OR
      -- Or the passenger is female
      EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid() AND u.gender = 'female'
      )
    )
  );
