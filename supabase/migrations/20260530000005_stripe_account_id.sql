-- Stage 40: Add stripe_account_id to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'profiles'
      AND column_name  = 'stripe_account_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN stripe_account_id TEXT;
  END IF;
END $$;
