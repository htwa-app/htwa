/**
 * services/tracking.ts
 *
 * Safety suite — nominated-contact journey tracking.
 *
 *  - Per-journey nominated contacts (journey_contacts): defaults from the
 *    profile's nominated_contact jsonb, changeable per journey. ALL tracking
 *    and alerting reads the journey's contact, never the profile's.
 *  - Live location publishing (trip_locations): driver's position persisted at
 *    a sane interval during an in-progress journey; last-known point retained.
 *  - Safety alerts (trip_alerts): SOS / off-course / signal-lost, delivered
 *    through every available channel: DB insert (Realtime → in-app contact),
 *    SMS via the send-tracking-alert Edge Function (graceful 'unavailable'
 *    until Twilio credentials exist). Every alert is recorded in the
 *    append-only trip_alerts audit table REGARDLESS of delivery outcome.
 *
 * Error-handling per CLAUDE.md §12: query errors are never treated as empty
 * results; secondary delivery failures after the audit insert has committed
 * are logged, not surfaced as overall failure.
 */

import * as ExpoLocation from 'expo-location';
import { supabase } from '../lib/supabase';
import type { JourneyContactRow, TripAlertType, TripLocationRow } from '../types/database';

// ─── Tunables ─────────────────────────────────────────────────────────────────

/** Publish a location sample at most this often (ms). */
export const PUBLISH_INTERVAL_MS = 15_000;
/** …or when the driver has moved at least this far (metres). */
export const PUBLISH_DISTANCE_M = 50;
/** A feed with no sample newer than this is "signal lost" (ms). */
export const SIGNAL_LOST_AFTER_MS = 90_000;

// ─── Journey contacts ─────────────────────────────────────────────────────────

export interface ContactDetails {
  name:  string;
  phone: string;
}

export type JourneyContactResult =
  | { ok: true; contact: JourneyContactRow }
  | { ok: false; reason: 'none' | 'error' };

/** The journey's nominated contact for a participant (never the profile default). */
export async function getJourneyContact(rideId: string, userId: string): Promise<JourneyContactResult> {
  try {
    const { data, error } = await supabase
      .from('journey_contacts')
      .select('*')
      .eq('ride_id', rideId)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) return { ok: false, reason: 'error' };
    if (!data) return { ok: false, reason: 'none' };
    return { ok: true, contact: data };
  } catch {
    return { ok: false, reason: 'error' };
  }
}

/**
 * The default contact to pre-fill a journey's contact picker with:
 * the user's most recently used journey contact, falling back to the
 * profile's nominated_contact.
 */
export async function getDefaultContact(userId: string): Promise<ContactDetails | null> {
  try {
    const { data: recent, error: recentErr } = await supabase
      .from('journey_contacts')
      .select('contact_name, contact_phone, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (recentErr) throw recentErr;
    if (recent) return { name: recent.contact_name, phone: recent.contact_phone };

    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('nominated_contact')
      .eq('user_id', userId)
      .maybeSingle();
    if (profileErr) throw profileErr;
    const nc = profile?.nominated_contact as { name?: string; phone?: string } | null;
    if (nc?.name && nc?.phone) return { name: nc.name, phone: nc.phone };
    return null;
  } catch (e) {
    // Callers show an empty picker with an error hint rather than silently no default.
    console.error('[Tracking] getDefaultContact failed:', e instanceof Error ? e.message : e);
    return null;
  }
}

export type SetContactResult =
  | { ok: true; contact: JourneyContactRow }
  | { ok: false; message: string };

/**
 * Set (or replace) the nominated contact for a journey. If the contact's phone
 * belongs to an htwa user, links contact_user_id so they get the in-app live view.
 */
export async function setJourneyContact(
  rideId: string,
  userId: string,
  details: ContactDetails,
): Promise<SetContactResult> {
  try {
    const name = details.name.trim();
    const phone = details.phone.trim();
    if (!name || !phone) return { ok: false, message: 'Contact name and phone are required.' };

    // Best-effort: link an htwa account by phone (enables in-app live view).
    let contactUserId: string | null = null;
    const { data: matched, error: matchErr } = await supabase
      .from('users')
      .select('id')
      .eq('phone', phone)
      .maybeSingle();
    if (matchErr) {
      // Linking is an enhancement — a failed lookup must not block the contact.
      console.error('[Tracking] contact user lookup failed:', matchErr.message);
    } else if (matched) {
      contactUserId = matched.id;
    }

    const { data, error } = await supabase
      .from('journey_contacts')
      .upsert(
        {
          ride_id: rideId,
          user_id: userId,
          contact_name: name,
          contact_phone: phone,
          contact_user_id: contactUserId,
        },
        { onConflict: 'ride_id,user_id' },
      )
      .select('*')
      .single();
    if (error || !data) return { ok: false, message: 'Could not save your nominated contact. Please try again.' };
    return { ok: true, contact: data };
  } catch {
    return { ok: false, message: 'Could not save your nominated contact. Please try again.' };
  }
}

// ─── Live location publishing (driver) ────────────────────────────────────────

let _subscription: ExpoLocation.LocationSubscription | null = null;
let _publishRideId: string | null = null;
let _lastPublishedAt = 0;

export interface PublishedPoint {
  lat: number;
  lng: number;
  heading: number | null;
  speedMps: number | null;
}

/** Latest published point for the active publish session (null until first sample). */
let _lastPoint: PublishedPoint | null = null;
export function getLastPublishedPoint(): PublishedPoint | null { return _lastPoint; }

/**
 * Start publishing the driver's location to trip_locations for an in-progress
 * journey. Samples are throttled to PUBLISH_INTERVAL_MS / PUBLISH_DISTANCE_M.
 * Each sample is also handed to `onSample` (used for off-course detection).
 */
export async function startPublishing(
  rideId: string,
  onSample?: (point: PublishedPoint) => void,
): Promise<void> {
  const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Location permission denied. Please enable it in Settings.');
  }
  stopPublishing();
  _publishRideId = rideId;
  _lastPublishedAt = 0;

  _subscription = await ExpoLocation.watchPositionAsync(
    {
      accuracy: ExpoLocation.Accuracy.High,
      timeInterval: PUBLISH_INTERVAL_MS,
      distanceInterval: PUBLISH_DISTANCE_M,
    },
    (location) => {
      const point: PublishedPoint = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        heading: location.coords.heading ?? null,
        speedMps: location.coords.speed ?? null,
      };
      _lastPoint = point;
      onSample?.(point);

      const now = Date.now();
      if (now - _lastPublishedAt < PUBLISH_INTERVAL_MS) return;
      _lastPublishedAt = now;
      void publishPoint(rideId, point);
    },
  );
}

async function publishPoint(rideId: string, point: PublishedPoint): Promise<void> {
  try {
    const { error } = await supabase.from('trip_locations').insert({
      ride_id: rideId,
      lat: point.lat,
      lng: point.lng,
      heading: point.heading,
      speed_mps: point.speedMps,
    });
    // A dropped sample is not fatal — the next one supersedes it. Log so a
    // SUSTAINED failure (e.g. RLS/status mismatch) is visible in diagnostics.
    if (error) console.error('[Tracking] location publish failed:', error.message);
  } catch (e) {
    console.error('[Tracking] location publish threw:', e instanceof Error ? e.message : e);
  }
}

export function stopPublishing(): void {
  _subscription?.remove();
  _subscription = null;
  _publishRideId = null;
  _lastPoint = null;
}

export function isPublishing(): boolean { return _publishRideId !== null; }

// ─── Reading the feed (contact / passenger view) ─────────────────────────────

export type FeedState = 'live' | 'signal_lost';

export interface FeedSnapshot {
  state: FeedState;
  last: TripLocationRow | null;
}

/** Classify a feed by its newest sample's age. */
export function classifyFeed(last: TripLocationRow | null, nowMs: number = Date.now()): FeedSnapshot {
  if (!last) return { state: 'signal_lost', last: null };
  const age = nowMs - new Date(last.recorded_at).getTime();
  return { state: age > SIGNAL_LOST_AFTER_MS ? 'signal_lost' : 'live', last };
}

export type LatestLocationResult =
  | { ok: true; snapshot: FeedSnapshot }
  | { ok: false };

/** Latest location for a journey (participants + linked contacts, per RLS). */
export async function getLatestLocation(rideId: string): Promise<LatestLocationResult> {
  try {
    const { data, error } = await supabase
      .from('trip_locations')
      .select('*')
      .eq('ride_id', rideId)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return { ok: false };
    return { ok: true, snapshot: classifyFeed(data ?? null) };
  } catch {
    return { ok: false };
  }
}

/**
 * Subscribe to live location inserts for a journey. Returns an unsubscribe fn.
 */
export function subscribeToLocations(
  rideId: string,
  onLocation: (row: TripLocationRow) => void,
): () => void {
  const channel = supabase
    // Unique per subscription — a stable name would return the previous
    // still-subscribed instance on quick resubscribe and .on() would throw.
    .channel(`trip-locations:${rideId}:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'trip_locations', filter: `ride_id=eq.${rideId}` },
      (payload) => onLocation(payload.new as TripLocationRow),
    )
    .subscribe();
  return () => { void supabase.removeChannel(channel); };
}

// ─── Safety alerts ────────────────────────────────────────────────────────────

export interface AlertLocation { lat: number; lng: number }

export type RaiseAlertResult =
  | { ok: true; channels: string[] }
  | { ok: false; message: string };

/**
 * Raise a safety alert for a journey and deliver it through every available
 * channel. The audit insert is the primary action — if it succeeds, the alert
 * "happened" even if every delivery channel fails (failures are logged and
 * reflected in the returned channels list).
 *
 * Channels:
 *  - 'realtime': the trip_alerts insert itself (in-app contacts subscribe).
 *  - 'sms': send-tracking-alert Edge Function → nominated contact's phone.
 *  - 'push': send-push Edge Function → contact's device, ONLY when the
 *    contact is an htwa user (contact.contact_user_id set) with a stored
 *    push token; this is background/killed-app delivery, complementing (not
 *    replacing) the 'realtime' channel above which only fires while their
 *    app is open.
 */
export async function raiseAlert(params: {
  rideId: string;
  raisedBy: string;
  alertType: TripAlertType;
  location: AlertLocation | null;
  detail?: string;
  smsBody?: string;
}): Promise<RaiseAlertResult> {
  const { rideId, raisedBy, alertType, location, detail, smsBody } = params;
  const channels: string[] = [];

  // 1. Contact lookup — needed for the SMS channel.
  const contactRes = await getJourneyContact(rideId, raisedBy);
  const contact = contactRes.ok ? contactRes.contact : null;

  // 2. Audit insert (primary; also the in-app Realtime channel).
  let alertId: string | null = null;
  try {
    const { data, error } = await supabase
      .from('trip_alerts')
      .insert({
        ride_id: rideId,
        raised_by: raisedBy,
        alert_type: alertType,
        lat: location?.lat ?? null,
        lng: location?.lng ?? null,
        detail: detail ?? null,
        channels: [],
      })
      .select('id')
      .single();
    if (error || !data) {
      return { ok: false, message: 'Could not record the alert. Please try again.' };
    }
    alertId = data.id;
    channels.push('realtime');
  } catch {
    return { ok: false, message: 'Could not record the alert. Please try again.' };
  }

  // 3. SMS (secondary; graceful until Twilio credentials exist).
  if (contact) {
    try {
      const { data, error } = await supabase.functions.invoke('send-tracking-alert', {
        body: {
          to: contact.contact_phone,
          message: smsBody ?? buildAlertSms(alertType, location, contact),
          alertType,
        },
      });
      if (!error && (data as { ok?: boolean } | null)?.ok === true) {
        channels.push('sms');
      }
    } catch (e) {
      console.error('[Tracking] alert SMS failed:', e instanceof Error ? e.message : e);
    }
  }

  // 4. Push (secondary; contact must be an htwa user — the SMS channel above
  //    is the only reachable one for a non-user contact).
  if (contact?.contact_user_id) {
    try {
      const isSos = alertType === 'sos';
      const { data, error } = await supabase.functions.invoke('send-push', {
        body: {
          userId: contact.contact_user_id,
          title: isSos ? 'SOS — your traveller needs you' : 'Journey safety alert',
          body: isSos
            ? 'Your nominated traveller triggered SOS. Open htwa to see their live location. If you can\'t reach them, call 112/999.'
            : 'Your nominated traveller\'s journey went off its planned route. Open htwa to check on them.',
          data: { trigger: 'safety_alert', rideId },
        },
      });
      if (!error && (data as { sent?: boolean } | null)?.sent === true) {
        channels.push('push');
      }
    } catch (e) {
      console.error('[Tracking] alert push failed:', e instanceof Error ? e.message : e);
    }
  }

  // 5. Record which channels actually delivered (audit row already committed —
  //    a failure here is logged, not surfaced).
  try {
    const { error } = await supabase.from('trip_alerts').update({ channels }).eq('id', alertId);
    if (error) console.error('[Tracking] alert channels update failed:', error.message);
  } catch (e) {
    console.error('[Tracking] alert channels update threw:', e instanceof Error ? e.message : e);
  }

  return { ok: true, channels };
}

function buildAlertSms(
  alertType: TripAlertType,
  location: AlertLocation | null,
  contact: JourneyContactRow,
): string {
  const where = location
    ? ` Last location: https://maps.google.com/?q=${location.lat.toFixed(5)},${location.lng.toFixed(5)}`
    : ' Last location unavailable.';
  const link = ` Live tracking: https://htwa-app.com/track#${contact.tracking_token}`;
  switch (alertType) {
    case 'sos':
      return `htwa SOS: your nominated traveller has triggered an emergency alert.${where}${link} If you can't reach them, contact emergency services (112/999).`;
    case 'off_course':
      return `htwa safety alert: your nominated traveller's journey has gone off its planned route.${where}${link}`;
    case 'signal_lost':
      return `htwa safety alert: live tracking signal lost for your nominated traveller's journey.${where}${link}`;
  }
}

/**
 * Silent SOS — records the event and alerts the nominated contact through
 * every available channel, using the freshest location available (live GPS,
 * falling back to the last published/persisted point). Deliberately NO
 * user-visible side effects beyond the caller's own subtle confirmation.
 */
export async function sendSOS(rideId: string, userId: string): Promise<RaiseAlertResult> {
  let location: AlertLocation | null = null;
  try {
    const current = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.High });
    location = { lat: current.coords.latitude, lng: current.coords.longitude };
  } catch {
    const last = _lastPoint;
    if (last) {
      location = { lat: last.lat, lng: last.lng };
    } else {
      const latest = await getLatestLocation(rideId);
      if (latest.ok && latest.snapshot.last) {
        location = { lat: latest.snapshot.last.lat, lng: latest.snapshot.last.lng };
      }
    }
  }
  return raiseAlert({ rideId, raisedBy: userId, alertType: 'sos', location });
}

/** Subscribe to safety alerts for journeys the user is the nominated contact of. */
export function subscribeToAlerts(
  rideId: string,
  onAlert: (row: { alert_type: TripAlertType; detail: string | null; created_at: string }) => void,
): () => void {
  const channel = supabase
    .channel(`trip-alerts:${rideId}:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'trip_alerts', filter: `ride_id=eq.${rideId}` },
      (payload) => onAlert(payload.new as { alert_type: TripAlertType; detail: string | null; created_at: string }),
    )
    .subscribe();
  return () => { void supabase.removeChannel(channel); };
}
