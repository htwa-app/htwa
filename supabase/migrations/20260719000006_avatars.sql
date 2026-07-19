-- ─────────────────────────────────────────────────────────────────────────────
-- Profile photos (avatars).
--
-- profiles.avatar_url stores the storage path ({userId}/avatar-{ts}.jpg) in
-- the 'avatars' bucket. Avatars are shown across the app (search results,
-- ride detail, chat), so any authenticated user may READ; only the owner may
-- write. Bucket stays private (no anon access) — reads go through signed URLs
-- or authenticated downloads.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatar owner insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "Avatar owner update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "Avatar owner delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
  );
CREATE POLICY "Avatars readable by authenticated users" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'avatars' AND auth.role() = 'authenticated'
  );
