-- ─────────────────────────────────────────────────────────────────────────────
-- Age-gate follow-up (19 Jul): Jordan's call — 18 is a real, DB-enforced
-- minimum age for identity verification, not just an app-side sanity check,
-- "safer for all involved." The app (app/id-verify.tsx) blocks submission
-- client-side; this CHECK constraint is the real wall, matching the
-- project's defense-in-depth pattern (booking/posting gates are enforced in
-- the DB, never trusted to the UI alone).
--
-- date_of_birth IS NULL is deliberately exempted so the two accounts
-- grandfathered to 'approved' in the previous migration (before the
-- date_of_birth column existed) are not retroactively invalidated by adding
-- this constraint — it only binds rows that actually carry a DOB, i.e.
-- every submission from this point forward.
--
-- Cross-checking the submitted DOB against the uploaded photo ID itself
-- remains a manual step during Jordan's review (same as every other
-- verification field) — this constraint only guarantees the self-reported
-- DOB implies 18+, it does not verify the DOB is truthful.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.verification
  ADD CONSTRAINT verification_min_age_18
  CHECK (date_of_birth IS NULL OR date_of_birth <= (CURRENT_DATE - INTERVAL '18 years')::date);

NOTIFY pgrst, 'reload schema';
