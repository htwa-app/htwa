-- Block 6: university verification — student-card upload + verification status.
--
-- Adds two columns to profiles and a private `student-cards` storage bucket with
-- owner-only RLS (each user can read/write only their own folder).

-- ─── profiles columns ─────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles'
      AND column_name = 'university_verification_status'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN university_verification_status TEXT NOT NULL DEFAULT 'unverified'
      CHECK (university_verification_status IN ('unverified', 'pending', 'verified', 'rejected'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles'
      AND column_name = 'student_card_url'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN student_card_url TEXT;
  END IF;
END $$;

-- ─── private storage bucket for student cards ─────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('student-cards', 'student-cards', false)
ON CONFLICT (id) DO NOTHING;

-- RLS on storage.objects: a user may read/insert/update/delete only within their
-- own top-level folder (named after their auth uid), e.g. `student-cards/<uid>/card.jpg`.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Student card owner read') THEN
    EXECUTE $p$
      CREATE POLICY "Student card owner read" ON storage.objects FOR SELECT
      USING (bucket_id = 'student-cards' AND (storage.foldername(name))[1] = auth.uid()::text)
    $p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Student card owner insert') THEN
    EXECUTE $p$
      CREATE POLICY "Student card owner insert" ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'student-cards' AND (storage.foldername(name))[1] = auth.uid()::text)
    $p$;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Student card owner update') THEN
    EXECUTE $p$
      CREATE POLICY "Student card owner update" ON storage.objects FOR UPDATE
      USING (bucket_id = 'student-cards' AND (storage.foldername(name))[1] = auth.uid()::text)
    $p$;
  END IF;
END $$;
