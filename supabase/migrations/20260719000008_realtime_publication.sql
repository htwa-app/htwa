-- ─────────────────────────────────────────────────────────────────────────────
-- Realtime publication fixes.
--
-- app/chat/[booking_id].tsx has subscribed to postgres_changes on `messages`
-- since Stage 44 — but `messages` was never added to the supabase_realtime
-- publication, so live chat updates silently never arrived (messages only
-- appeared on refetch). Same gap for `bookings`, which the in-app
-- notification triggers subscribe to (booking requests / accepts / declines).
--
-- postgres_changes respects RLS, so each user only receives events for rows
-- their policies let them SELECT.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
