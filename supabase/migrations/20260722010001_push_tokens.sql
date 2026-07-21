-- Expo push token, written on login/app-open (see services/notifications.ts
-- savePushToken). One token per user — a re-registration (new device, token
-- rotation) simply overwrites the previous value; we don't fan out to stale
-- tokens. Read by the send-push Edge Function via the service role, so no
-- SELECT policy is needed beyond the existing owner policies on profiles.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS expo_push_token TEXT;
