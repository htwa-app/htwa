-- Block 4: pricing rate config + driver pricing profile + mileage tracking
--
-- pricing_rates / pricing_config seed the same figures used by the pure pricing
-- engine (constants/pricingRates.ts), so they become admin-editable without a
-- code release. driver_pricing_profiles captures tax residence, engine cc,
-- insurance attestations, and the (PLACEHOLDER) declaration acceptance.
-- driver_mileage_increments is the per-driver cumulative-distance log.

-- ─── pricing_rates (admin-editable band table) ────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pricing_rates (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction TEXT    NOT NULL CHECK (jurisdiction IN ('UK', 'ROI')),
  band_index   INTEGER NOT NULL,
  -- ROI only; NULL for UK (rate does not vary by engine size)
  engine_cc    TEXT    CHECK (engine_cc IN ('le1200', 'cc1201to1500', 'ge1501')),
  upper_bound  DECIMAL(12,2) NOT NULL,             -- inclusive band ceiling (km/miles); 1e12 = ∞
  rate         DECIMAL(8,4)  NOT NULL,             -- EUR/km (ROI) or GBP/mile (UK)
  unit         TEXT    NOT NULL CHECK (unit IN ('km', 'mile')),
  currency     TEXT    NOT NULL CHECK (currency IN ('EUR', 'GBP')),
  effective_from DATE  NOT NULL DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── pricing_config (scalar fees) ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pricing_config (
  key         TEXT PRIMARY KEY,
  value       DECIMAL(8,4) NOT NULL,
  description TEXT
);

-- ─── driver_pricing_profiles ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.driver_pricing_profiles (
  user_id                  UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  tax_residence            TEXT NOT NULL CHECK (tax_residence IN ('ROI', 'UK')),
  engine_cc                TEXT NOT NULL CHECK (engine_cc IN ('le1200', 'cc1201to1500', 'ge1501')),
  insurance_cert_confirmed BOOLEAN NOT NULL DEFAULT false,
  notify_insurer_confirmed BOOLEAN NOT NULL DEFAULT false,
  declaration_version      TEXT,
  declaration_accepted_at  TIMESTAMPTZ,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

-- ─── driver_mileage_increments (cumulative annual total log) ───────────────────

CREATE TABLE IF NOT EXISTS public.driver_mileage_increments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  journey_id UUID REFERENCES public.rides(id) ON DELETE SET NULL,
  amount     DECIMAL(10,2) NOT NULL,              -- km (ROI) or miles (UK)
  unit       TEXT NOT NULL CHECK (unit IN ('km', 'mile')),
  source     TEXT NOT NULL CHECK (source IN ('journey', 'manual')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mileage_driver_created
  ON public.driver_mileage_increments (driver_id, created_at);

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.pricing_rates             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_config            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_pricing_profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_mileage_increments ENABLE ROW LEVEL SECURITY;

-- Rate config is world-readable (clients may display the basis), admin-writable only.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pricing_rates' AND policyname = 'Anyone can read rates') THEN
    EXECUTE 'CREATE POLICY "Anyone can read rates" ON public.pricing_rates FOR SELECT USING (true)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pricing_config' AND policyname = 'Anyone can read config') THEN
    EXECUTE 'CREATE POLICY "Anyone can read config" ON public.pricing_config FOR SELECT USING (true)';
  END IF;
END $$;

-- Driver pricing profile: owner-only.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'driver_pricing_profiles' AND policyname = 'Owner reads pricing profile') THEN
    EXECUTE 'CREATE POLICY "Owner reads pricing profile" ON public.driver_pricing_profiles FOR SELECT USING (auth.uid() = user_id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'driver_pricing_profiles' AND policyname = 'Owner inserts pricing profile') THEN
    EXECUTE 'CREATE POLICY "Owner inserts pricing profile" ON public.driver_pricing_profiles FOR INSERT WITH CHECK (auth.uid() = user_id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'driver_pricing_profiles' AND policyname = 'Owner updates pricing profile') THEN
    EXECUTE 'CREATE POLICY "Owner updates pricing profile" ON public.driver_pricing_profiles FOR UPDATE USING (auth.uid() = user_id)';
  END IF;
END $$;

-- Mileage increments: owner-only read + insert (no update/delete — append-only log).
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'driver_mileage_increments' AND policyname = 'Owner reads mileage') THEN
    EXECUTE 'CREATE POLICY "Owner reads mileage" ON public.driver_mileage_increments FOR SELECT USING (auth.uid() = driver_id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'driver_mileage_increments' AND policyname = 'Owner inserts mileage') THEN
    EXECUTE 'CREATE POLICY "Owner inserts mileage" ON public.driver_mileage_increments FOR INSERT WITH CHECK (auth.uid() = driver_id)';
  END IF;
END $$;

-- ─── Seed rate config (mirrors constants/pricingRates.ts) ──────────────────────
-- Idempotent: clear then insert so re-running keeps the seed in sync.

DELETE FROM public.pricing_rates;
INSERT INTO public.pricing_rates (jurisdiction, band_index, engine_cc, upper_bound, rate, unit, currency) VALUES
  -- UK (HMRC AMAP, GBP/mile)
  ('UK', 0, NULL, 10000,        0.5500, 'mile', 'GBP'),
  ('UK', 1, NULL, 9999999999, 0.2500, 'mile', 'GBP'),
  -- ROI (Revenue civil-service, EUR/km) — Band 1 (≤1,500 km)
  ('ROI', 0, 'le1200',       1500, 0.4180, 'km', 'EUR'),
  ('ROI', 0, 'cc1201to1500', 1500, 0.4340, 'km', 'EUR'),
  ('ROI', 0, 'ge1501',       1500, 0.5182, 'km', 'EUR'),
  -- Band 2 (1,501–5,500 km)
  ('ROI', 1, 'le1200',       5500, 0.7264, 'km', 'EUR'),
  ('ROI', 1, 'cc1201to1500', 5500, 0.7918, 'km', 'EUR'),
  ('ROI', 1, 'ge1501',       5500, 0.9063, 'km', 'EUR'),
  -- Band 3 (5,501–25,000 km)
  ('ROI', 2, 'le1200',       25000, 0.3178, 'km', 'EUR'),
  ('ROI', 2, 'cc1201to1500', 25000, 0.3179, 'km', 'EUR'),
  ('ROI', 2, 'ge1501',       25000, 0.3922, 'km', 'EUR'),
  -- Band 4 (25,001 km+)
  ('ROI', 3, 'le1200',       9999999999, 0.2056, 'km', 'EUR'),
  ('ROI', 3, 'cc1201to1500', 9999999999, 0.2385, 'km', 'EUR'),
  ('ROI', 3, 'ge1501',       9999999999, 0.2587, 'km', 'EUR');

INSERT INTO public.pricing_config (key, value, description) VALUES
  ('service_charge_rate', 0.1000, 'Passenger service charge as a fraction of driverSeatPrice'),
  ('booking_fee',         2.0000, 'Flat passenger booking fee (EUR/GBP)')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, description = EXCLUDED.description;
