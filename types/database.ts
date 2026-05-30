/**
 * types/database.ts
 *
 * TypeScript types for the htwa Supabase schema.
 * Hand-written to match supabase/migrations/20260509000001_create_user_tables.sql.
 *
 * Structure mirrors what `supabase gen types typescript` would produce, so it
 * can be swapped for the generated version in a later stage without changing
 * any consuming code.
 *
 * Usage:
 *   import { Database } from '../types/database';
 *   const supabase = createClient<Database>(url, key);
 *   // supabase.from('users').select() → typed as UserRow[]
 */

// ─── users ────────────────────────────────────────────────────────────────────

export type HomeLocation = 'ROI' | 'NI';
export type Currency     = 'EUR' | 'GBP';

export interface UserRow {
  id:            string;          // uuid — matches auth.users.id
  email:         string;
  phone:         string | null;
  full_name:     string;
  home_location: HomeLocation;
  currency:      Currency;
  created_at:    string;          // timestamptz returned as ISO string
}

export interface UserInsert {
  id:            string;          // must match the auth.users uuid
  email:         string;
  phone?:        string | null;
  full_name:     string;
  home_location: HomeLocation;
  currency:      Currency;
  created_at?:   string;          // defaults to now()
}

export interface UserUpdate {
  email?:         string;
  phone?:         string | null;
  full_name?:     string;
  home_location?: HomeLocation;
  currency?:      Currency;
}

// ─── verification ─────────────────────────────────────────────────────────────

export interface VerificationRow {
  id:              string;         // uuid
  user_id:         string;         // uuid → public.users.id
  id_verified:     boolean;
  selfie_verified: boolean;
  verified_at:     string | null;  // timestamptz or null
}

export interface VerificationInsert {
  id?:              string;        // defaults to gen_random_uuid()
  user_id:          string;
  id_verified?:     boolean;       // defaults to false
  selfie_verified?: boolean;       // defaults to false
  verified_at?:     string | null;
}

export interface VerificationUpdate {
  id_verified?:     boolean;
  selfie_verified?: boolean;
  verified_at?:     string | null;
}

// ─── profiles ─────────────────────────────────────────────────────────────────

export interface ProfileRow {
  id:                   string;        // uuid
  user_id:              string;        // uuid → public.users.id
  bio:                  string | null;
  university:           string | null;
  travel_preferences:   Record<string, unknown> | null;  // jsonb
  nominated_contact:    Record<string, unknown> | null;  // jsonb
  vehicle_details:      Record<string, unknown> | null;  // jsonb — Stage 23
  women_only_mode:      boolean;                         // Stage 25
}

export interface ProfileInsert {
  id?:                   string;       // defaults to gen_random_uuid()
  user_id:               string;
  bio?:                  string | null;
  university?:           string | null;
  travel_preferences?:   Record<string, unknown> | null;
  nominated_contact?:    Record<string, unknown> | null;
  vehicle_details?:      Record<string, unknown> | null;
  women_only_mode?:      boolean;
}

export interface ProfileUpdate {
  bio?:                  string | null;
  university?:           string | null;
  travel_preferences?:   Record<string, unknown> | null;
  nominated_contact?:    Record<string, unknown> | null;
  vehicle_details?:      Record<string, unknown> | null;
  women_only_mode?:      boolean;
}

// ─── rides ────────────────────────────────────────────────────────────────────

export type RideStatus    = 'active' | 'full' | 'completed' | 'cancelled';
export type BookingStatus = 'pending' | 'confirmed' | 'declined' | 'cancelled';

export interface RideRow {
  id:                 string;
  driver_id:          string;
  from_location:      string;
  from_coords:        { lat: number; lng: number } | null;
  to_location:        string;
  to_coords:          { lat: number; lng: number } | null;
  departure_datetime: string;           // timestamptz as ISO string
  seats_total:        number;
  seats_available:    number;
  cost_per_seat:      number;
  currency:           Currency;
  distance_km:        number | null;
  women_only:         boolean;
  status:             RideStatus;
  created_at:         string;
}

export interface RideInsert {
  id?:                 string;
  driver_id:           string;
  from_location:       string;
  from_coords?:        { lat: number; lng: number } | null;
  to_location:         string;
  to_coords?:          { lat: number; lng: number } | null;
  departure_datetime:  string;
  seats_total:         number;
  seats_available:     number;
  cost_per_seat:       number;
  currency:            Currency;
  distance_km?:        number | null;
  women_only?:         boolean;
  status?:             RideStatus;
}

export interface RideUpdate {
  seats_available?: number;
  status?:          RideStatus;
  cost_per_seat?:   number;
}

// ─── bookings ─────────────────────────────────────────────────────────────────

export interface BookingRow {
  id:           string;
  ride_id:      string;
  passenger_id: string;
  seats_booked: number;
  status:       BookingStatus;
  created_at:   string;
}

export interface BookingInsert {
  id?:          string;
  ride_id:      string;
  passenger_id: string;
  seats_booked?: number;
  status?:      BookingStatus;
}

export interface BookingUpdate {
  status?:      BookingStatus;
  seats_booked?: number;
}

// ─── Database (Supabase client generic) ───────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      users: {
        Row:    UserRow;
        Insert: UserInsert;
        Update: UserUpdate;
      };
      verification: {
        Row:    VerificationRow;
        Insert: VerificationInsert;
        Update: VerificationUpdate;
      };
      profiles: {
        Row:    ProfileRow;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
      };
      rides: {
        Row:    RideRow;
        Insert: RideInsert;
        Update: RideUpdate;
      };
      bookings: {
        Row:    BookingRow;
        Insert: BookingInsert;
        Update: BookingUpdate;
      };
    };
  };
}
