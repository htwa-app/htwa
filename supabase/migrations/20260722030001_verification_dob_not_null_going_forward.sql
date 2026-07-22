-- CodeRabbit PR #33 finding: verification_min_age_18's blanket
-- "date_of_birth IS NULL OR ..." exemption doesn't just grandfather the two
-- pre-DOB-column approved accounts it was written for — it also lets ANY
-- new row (insert or update) leave date_of_birth NULL and still pass the
-- age check, since a NULL comparison is neither true nor false in SQL. That
-- reopens exactly the gap the age-gate migration (20260719210001) was meant
-- to close: a new submission could reach 'approved' without ever having its
-- age validated, going around 18-year-old enforcement entirely.
--
-- Fix: scope the NULL exemption to the two specific grandfathered rows
-- (confirmed live — both 'approved', both predate the date_of_birth column)
-- instead of exempting NULL universally. Every other row, present or future,
-- must satisfy the age check for real.
ALTER TABLE public.verification
  DROP CONSTRAINT verification_min_age_18;

-- NOTE: "date_of_birth <= ..." alone is NOT sufficient for the non-grandfathered
-- branch — SQL's three-valued logic means a NULL comparison evaluates to NULL,
-- and "FALSE OR NULL" is NULL, which a CHECK constraint treats as PASSING (only
-- an explicit FALSE fails). The explicit "IS NOT NULL" is what actually turns a
-- NULL date_of_birth into a hard FALSE for every non-grandfathered row.
ALTER TABLE public.verification
  ADD CONSTRAINT verification_min_age_18
  CHECK (
    user_id IN ('409cf075-268b-4bb3-9a9a-6117e32d629b', 'ede1c3c6-0faa-42e4-a15f-1b222d70e6a7')
    OR (date_of_birth IS NOT NULL AND date_of_birth <= (CURRENT_DATE - INTERVAL '18 years')::date)
  );

NOTIFY pgrst, 'reload schema';
