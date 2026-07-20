-- CodeRabbit review (feat/journey-overhaul PR #27), never actioned until now:
-- utils/mileageTracking.ts#recordIncrement already rejects amount <= 0 or
-- amount > 99999999.99 (DECIMAL(10,2) range) in application code, but the DB
-- table itself had no matching CHECK constraint — a direct insert (service
-- role, a future admin tool, or a bug bypassing the app layer) could still
-- write a zero/negative/out-of-range amount. Add the constraint as
-- defense-in-depth so the invariant holds at the DB level too.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'driver_mileage_increments_amount_check'
  ) THEN
    ALTER TABLE public.driver_mileage_increments
      ADD CONSTRAINT driver_mileage_increments_amount_check
      CHECK (amount > 0 AND amount <= 99999999.99);
  END IF;
END $$;
