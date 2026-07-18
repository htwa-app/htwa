-- ─────────────────────────────────────────────────────────────────────────────
-- Fix: infinite recursion in rides RLS (42P17).
--
-- 20260719000004 added a rides SELECT policy that subqueries bookings — but
-- bookings' own policies subquery rides ("Driver can view bookings on own
-- rides"), so rides → bookings → rides recursed. Postgres evaluates RLS on
-- tables referenced INSIDE policy subqueries, hence the cycle.
--
-- Fix: route the cross-table checks through SECURITY DEFINER helper functions,
-- which read the referenced table without invoking its RLS.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.user_has_booking_on_ride(p_ride_id uuid, p_user uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.ride_id = p_ride_id AND b.passenger_id = p_user
  );
$$;

CREATE OR REPLACE FUNCTION public.user_is_journey_contact(p_ride_id uuid, p_user uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.journey_contacts jc
    WHERE jc.ride_id = p_ride_id
      AND jc.contact_user_id = p_user
      AND (jc.token_expires_at IS NULL OR jc.token_expires_at > now())
  );
$$;

REVOKE ALL ON FUNCTION public.user_has_booking_on_ride(uuid, uuid) FROM public;
REVOKE ALL ON FUNCTION public.user_is_journey_contact(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.user_has_booking_on_ride(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_is_journey_contact(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Booked passenger can view ride" ON public.rides;
CREATE POLICY "Booked passenger can view ride" ON public.rides
  FOR SELECT USING (public.user_has_booking_on_ride(id, auth.uid()));

DROP POLICY IF EXISTS "Journey contact can view ride" ON public.rides;
CREATE POLICY "Journey contact can view ride" ON public.rides
  FOR SELECT USING (public.user_is_journey_contact(id, auth.uid()));

-- Ask PostgREST to reload its schema cache (needed after RPC changes applied
-- via the Management API, which does not trigger a reload on its own).
NOTIFY pgrst, 'reload schema';
