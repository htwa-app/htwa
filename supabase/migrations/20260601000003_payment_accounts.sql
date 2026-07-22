-- Block 7: payment methods — driver payout (Stripe Connect) + passenger card.
--
-- Stores per-user payment status. The actual Stripe Connect onboarding and
-- SetupIntent creation happen server-side (Edge Functions) + externally; this
-- table just records status so the app can show entry points + indicators.

CREATE TABLE IF NOT EXISTS public.payment_accounts (
  user_id                   UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  -- Driver RECEIVING method (Stripe Connect payout destination)
  stripe_connect_account_id TEXT,
  connect_status            TEXT NOT NULL DEFAULT 'none'
                            CHECK (connect_status IN ('none', 'pending', 'active', 'restricted')),
  -- Passenger PAYING method (saved card via Stripe)
  stripe_customer_id        TEXT,
  has_payment_method        BOOLEAN NOT NULL DEFAULT false,
  payment_method_brand      TEXT,
  payment_method_last4      TEXT,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payment_accounts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payment_accounts' AND policyname = 'Owner reads payment account') THEN
    EXECUTE 'CREATE POLICY "Owner reads payment account" ON public.payment_accounts FOR SELECT USING (auth.uid() = user_id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payment_accounts' AND policyname = 'Owner inserts payment account') THEN
    EXECUTE 'CREATE POLICY "Owner inserts payment account" ON public.payment_accounts FOR INSERT WITH CHECK (auth.uid() = user_id)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payment_accounts' AND policyname = 'Owner updates payment account') THEN
    EXECUTE 'CREATE POLICY "Owner updates payment account" ON public.payment_accounts FOR UPDATE USING (auth.uid() = user_id)';
  END IF;
END $$;
