/**
 * scripts/seed-demo-data.mjs
 *
 * Beta-readiness seed script (Stage: overnight-run Block 6a).
 *
 * Creates a handful of demo driver accounts (pre-approved verification, so
 * they show up as fully legit drivers) and posts several realistic rides
 * between real Irish/NI cities on FUTURE dates, so Jordan's hands-on walk-throughs
 * and TestFlight/Play testers have something real to see in search results
 * and book against, without waiting for organic driver signups.
 *
 * These are ADMIN-API-created accounts (auth.admin.createUser + direct table
 * inserts via the service-role key) — they do NOT go through the normal
 * signup/OTP/verification flow, and cannot be signed into directly (no
 * password auth exists in this app; sign-in is email OTP only). They exist
 * purely so a REAL, normally-signed-up tester sees populated rides to search
 * and book. Re-running this script is safe: it deletes any previously
 * seeded demo rides/users (matched by the `demo.driver` email prefix) before
 * re-creating them, so it can be run repeatedly to refresh the departure dates.
 *
 * Usage:
 *   op run --env-file=.secrets.env -- node scripts/seed-demo-data.mjs
 *
 * Requires SUPABASE_SECRET_KEY (service-role) and EXPO_PUBLIC_SUPABASE_URL —
 * both already wired via .secrets.env / .env.local per CLAUDE.md.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

// .env.local isn't auto-loaded by plain `node` — parse the one line we need.
function loadEnvLocal(key) {
  if (process.env[key]) return process.env[key];
  try {
    const content = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
    const match = content.match(new RegExp(`^${key}=(.*)$`, 'm'));
    return match?.[1]?.trim();
  } catch {
    return undefined;
  }
}

const SUPABASE_URL = loadEnvLocal('EXPO_PUBLIC_SUPABASE_URL');
const SERVICE_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('[error] Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY — run via:');
  console.error('  op run --env-file=.secrets.env -- node scripts/seed-demo-data.mjs');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_EMAIL_DOMAIN = 'demo.htwa-app.com';

/** Real Irish/NI cities with approximate centre coordinates. */
const CITIES = {
  Dublin:   { lat: 53.3498, lng: -6.2603 },
  Belfast:  { lat: 54.5973, lng: -5.9301 },
  Cork:     { lat: 51.8985, lng: -8.4756 },
  Galway:   { lat: 53.2707, lng: -9.0568 },
  Limerick: { lat: 52.6638, lng: -8.6267 },
  Derry:    { lat: 54.9966, lng: -7.3086 },
};

/** Haversine distance in km — good enough for demo pricing, not the real Routes API. */
function distanceKm(a, b) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// Rough Revenue.ie-style mileage rate for demo pricing only — the real app
// reads live rates from the `pricing_rates` table via services/pricingRates.ts.
const DEMO_RATE_PER_KM = 0.4;
const STANDARD_VEHICLE_CAPACITY = 5;

function seatPrice(km) {
  const total = km * DEMO_RATE_PER_KM;
  return Math.round((total / STANDARD_VEHICLE_CAPACITY) * 100) / 100;
}

const DEMO_DRIVERS = [
  { key: 'driver1', full_name: 'Aoife Kelly',   home_location: 'ROI', currency: 'EUR', gender: 'female', university: 'UCD',  dob: '1999-03-14' },
  { key: 'driver2', full_name: 'Cian Murphy',   home_location: 'ROI', currency: 'EUR', gender: 'male',   university: 'TCD',  dob: '1998-11-02' },
  { key: 'driver3', full_name: 'Niamh Byrne',   home_location: 'NI',  currency: 'GBP', gender: 'female', university: 'QUB',  dob: '2000-06-21' },
  { key: 'driver4', full_name: 'Sean Doyle',    home_location: 'ROI', currency: 'EUR', gender: 'male',   university: 'UCC',  dob: '1997-09-30' },
];

/** [from, to, driverKey, daysFromNow, hour, seatsTotal, womenOnly] */
const DEMO_RIDES = [
  ['Dublin',   'Belfast',  'driver1', 2, 8,  3, false],
  ['Belfast',  'Dublin',   'driver3', 2, 18, 3, true],
  ['Dublin',   'Cork',     'driver2', 3, 9,  4, false],
  ['Cork',     'Galway',   'driver4', 4, 13, 3, false],
  ['Galway',   'Dublin',   'driver1', 5, 17, 2, false],
  ['Dublin',   'Limerick', 'driver2', 6, 7,  4, false],
  ['Derry',    'Belfast',  'driver3', 6, 12, 3, true],
  ['Limerick', 'Cork',     'driver4', 7, 16, 2, false],
];

function futureDate(daysFromNow, hour) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

async function cleanupPreviousSeed() {
  console.log('[cleanup] Removing any previously seeded demo accounts...');
  const { data: existingUsers, error } = await supabase
    .from('users')
    .select('id')
    .like('email', `%@${DEMO_EMAIL_DOMAIN}`);
  if (error) throw new Error(`[cleanup] Failed to look up existing demo users: ${error.message}`);

  for (const u of existingUsers ?? []) {
    // Rides/verification/profiles cascade via FK ON DELETE, but auth.users
    // deletion is the authoritative cleanup — do it via the admin API.
    const { error: delErr } = await supabase.auth.admin.deleteUser(u.id);
    if (delErr) console.warn(`[cleanup] Could not delete auth user ${u.id}: ${delErr.message}`);
  }
  console.log(`[cleanup] Removed ${existingUsers?.length ?? 0} previously seeded user(s).`);
}

async function createDemoDriver(driver) {
  const email = `${driver.key}@${DEMO_EMAIL_DOMAIN}`;
  const { data: created, error: authErr } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { seeded: true },
  });
  if (authErr || !created?.user) {
    throw new Error(`[auth] Failed to create ${email}: ${authErr?.message ?? 'no user returned'}`);
  }
  const userId = created.user.id;

  const { error: userErr } = await supabase.from('users').insert({
    id: userId,
    email,
    full_name: driver.full_name,
    home_location: driver.home_location,
    currency: driver.currency,
    gender: driver.gender,
  });
  if (userErr) throw new Error(`[users] Failed to insert ${email}: ${userErr.message}`);

  // Pre-approved: demo drivers exist to show up as legit, verified drivers in
  // search results — they don't go through the real manual-review queue.
  const { error: verErr } = await supabase.from('verification').insert({
    user_id: userId,
    status: 'approved',
    date_of_birth: driver.dob,
    reviewed_at: new Date().toISOString(),
  });
  if (verErr) throw new Error(`[verification] Failed for ${email}: ${verErr.message}`);

  const { error: profileErr } = await supabase.from('profiles').insert({
    user_id: userId,
    university: driver.university,
    university_verification_status: 'verified',
    women_only_mode: driver.gender === 'female',
  });
  if (profileErr) throw new Error(`[profiles] Failed for ${email}: ${profileErr.message}`);

  console.log(`[driver] Created ${driver.full_name} (${email})`);
  return userId;
}

async function createDemoRides(driverIds) {
  const rows = DEMO_RIDES.map(([from, to, driverKey, days, hour, seatsTotal, womenOnly]) => {
    const fromCoords = CITIES[from];
    const toCoords = CITIES[to];
    const km = Math.round(distanceKm(fromCoords, toCoords) * 10) / 10;
    const driver = DEMO_DRIVERS.find((d) => d.key === driverKey);
    return {
      driver_id: driverIds[driverKey],
      from_location: from,
      from_coords: fromCoords,
      to_location: to,
      to_coords: toCoords,
      departure_datetime: futureDate(days, hour),
      seats_total: seatsTotal,
      seats_available: seatsTotal,
      cost_per_seat: seatPrice(km),
      currency: driver.currency,
      distance_km: km,
      women_only: womenOnly,
      status: 'active',
    };
  });

  const { data, error } = await supabase.from('rides').insert(rows).select('id');
  if (error) throw new Error(`[rides] Insert failed: ${error.message}`);
  console.log(`[rides] Created ${data.length} demo rides.`);
}

async function main() {
  await cleanupPreviousSeed();

  const driverIds = {};
  for (const driver of DEMO_DRIVERS) {
    driverIds[driver.key] = await createDemoDriver(driver);
  }

  await createDemoRides(driverIds);

  console.log('\nDone. Demo accounts (for reference — not sign-in-able, OTP-only auth):');
  for (const d of DEMO_DRIVERS) {
    console.log(`  - ${d.full_name} <${d.key}@${DEMO_EMAIL_DOMAIN}> (${d.university}, ${d.home_location})`);
  }
  console.log('\nSign up/log in as yourself normally (real email + OTP) to see these rides in search results.');
}

main().catch((err) => {
  console.error('[fatal]', err.message);
  process.exit(1);
});
