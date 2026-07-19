-- Notification preferences (settings screen). Per-user jsonb of toggles, e.g.
-- {"booking_updates": true, "trip_reminders": true, "marketing": false}.
-- Read/written by the owner through the existing profiles RLS policies.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notification_prefs JSONB NOT NULL DEFAULT '{}'::jsonb;
