-- Block 8: low-friction baggage — an optional free-text luggage/bags note on a
-- journey. No pricing, no paid "book a case" flow (deferred). Specific luggage
-- details are arranged via the existing in-app chat.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'rides' AND column_name = 'luggage_note'
  ) THEN
    ALTER TABLE public.rides ADD COLUMN luggage_note TEXT;
  END IF;
END $$;
