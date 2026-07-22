-- ─────────────────────────────────────────────────────────────────────────────
-- public.bookings needs REPLICA IDENTITY FULL for Realtime UPDATE payloads to
-- include the pre-change row.
--
-- hooks/useRealtimeNotifications.ts subscribes to `UPDATE` on `bookings` and
-- compares `payload.old.status` against `payload.new.status` to fire a
-- notification only on a genuine pending->confirmed/declined transition. Under
-- Postgres's default REPLICA IDENTITY, payload.old contains ONLY the primary
-- key — `before.status` is always undefined, so the equality check never
-- actually blocks anything, and ANY update to an already-confirmed/declined
-- booking (e.g. chat_status or payment_intent_id changing) re-fires a
-- "Booking confirmed"/"declined" push notification.
--
-- REPLICA IDENTITY FULL makes Postgres write the whole pre-change row to the
-- WAL, so payload.old is fully populated and the status comparison works as
-- the hook already assumes. Trade-off: larger WAL entries for updates to this
-- table — acceptable here given bookings' update volume.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.bookings REPLICA IDENTITY FULL;
