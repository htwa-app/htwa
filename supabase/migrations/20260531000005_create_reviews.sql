-- Stage 54: reviews table

CREATE TABLE IF NOT EXISTS public.reviews (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id      UUID        NOT NULL REFERENCES public.rides(id)   ON DELETE CASCADE,
  reviewer_id  UUID        NOT NULL REFERENCES public.users(id)   ON DELETE CASCADE,
  reviewee_id  UUID        NOT NULL REFERENCES public.users(id)   ON DELETE CASCADE,
  rating       INTEGER     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment      TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trip_id, reviewer_id, reviewee_id)
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read reviews (shown on user profiles)
CREATE POLICY "Anyone can view reviews"
  ON public.reviews FOR SELECT USING (true);

-- Only the reviewer can insert their own review
CREATE POLICY "Reviewer can insert review"
  ON public.reviews FOR INSERT
  WITH CHECK (auth.uid() = reviewer_id);

-- Ensure one review per (trip_id, reviewer_id)
ALTER TABLE public.reviews ADD CONSTRAINT reviews_trip_reviewer_unique UNIQUE (trip_id, reviewer_id);

-- Aggregate rating trigger: update average_rating on profiles after each review
-- (Using a simple approach: stored on profiles for fast reads)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'average_rating'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN average_rating NUMERIC(3,2);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'trip_count'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN trip_count INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;
