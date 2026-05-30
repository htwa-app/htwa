-- Stage 25: Add missing columns to profiles table
-- vehicle_details JSONB — stores make/model/year/colour/seats/hasAC/dashcam
-- women_only_mode BOOLEAN — driver's women-only preference
-- Columns are added only if they don't already exist (idempotent via DO block)

DO $$
BEGIN
  -- vehicle_details JSONB
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'profiles'
      AND column_name  = 'vehicle_details'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN vehicle_details JSONB;
  END IF;

  -- women_only_mode BOOLEAN (default false)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'profiles'
      AND column_name  = 'women_only_mode'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN women_only_mode BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- RLS: Users can read other users' profiles (for Other User Profile screen)
-- Uses a separate policy name so it doesn't clash with the existing insert/update policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'profiles'
      AND policyname = 'Anyone can view profiles'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Anyone can view profiles"
        ON public.profiles
        FOR SELECT
        USING (true)
    $policy$;
  END IF;
END $$;
