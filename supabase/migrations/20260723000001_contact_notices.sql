-- Article 14 (GDPR/UK GDPR) first-contact notice for nominated contacts.
--
-- A nominated contact is a third party whose name + number someone else gave us.
-- The first SMS we ever send to a given number carries a short notice (what we
-- hold, link to the full notice at htwa-app.com/privacy, how to opt out); this
-- table records that it was sent so later alerts to the same number don't repeat
-- it. Keyed by a SHA-256 hash of the E.164 number — the Edge Function
-- (send-tracking-alert) is the only reader/writer, via the service role, so RLS is
-- enabled with NO policies: no client can read or write it.
CREATE TABLE IF NOT EXISTS public.contact_notices (
  phone_hash        TEXT        PRIMARY KEY,
  first_notified_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_notices ENABLE ROW LEVEL SECURITY;
