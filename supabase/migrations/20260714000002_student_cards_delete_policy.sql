-- CodeRabbit review (feat/journey-overhaul PR #27), never actioned until now:
-- 20260601000002_university_verification.sql's own comment says a user may
-- "read/insert/update/delete only within their own top-level folder", but no
-- FOR DELETE policy was ever created — only read/insert/update. Add the
-- missing owner-scoped DELETE policy so a user can remove a superseded student
-- card image (e.g. after re-uploading a clearer photo).

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Student card owner delete') THEN
    EXECUTE $p$
      CREATE POLICY "Student card owner delete" ON storage.objects FOR DELETE
      USING (bucket_id = 'student-cards' AND (storage.foldername(name))[1] = auth.uid()::text)
    $p$;
  END IF;
END $$;
