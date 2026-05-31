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
export type Gender       = 'female' | 'male' | 'non_binary' | 'prefer_not_to_say';

export type UserRow = {
  id:            string;          // uuid — matches auth.users.id
  email:         string;
  phone:         string | null;
  full_name:     string;
  home_location: HomeLocation;
  currency:      Currency;
  gender:        Gender | null;   // migration 20260531000002 — used for women-only
  created_at:    string;          // timestamptz returned as ISO string
}

export type UserInsert = {
  id:            string;          // must match the auth.users uuid
  email:         string;
  phone?:        string | null;
  full_name:     string;
  home_location: HomeLocation;
  currency:      Currency;
  gender?:       Gender | null;
  created_at?:   string;          // defaults to now()
}

export type UserUpdate = {
  email?:         string;
  phone?:         string | null;
  full_name?:     string;
  home_location?: HomeLocation;
  currency?:      Currency;
  gender?:        Gender | null;
}

// ─── verification ─────────────────────────────────────────────────────────────

export type VerificationRow = {
  id:              string;         // uuid
  user_id:         string;         // uuid → public.users.id
  id_verified:     boolean;
  selfie_verified: boolean;
  verified_at:     string | null;  // timestamptz or null
}

export type VerificationInsert = {
  id?:              string;        // defaults to gen_random_uuid()
  user_id:          string;
  id_verified?:     boolean;       // defaults to false
  selfie_verified?: boolean;       // defaults to false
  verified_at?:     string | null;
}

export type VerificationUpdate = {
  id_verified?:     boolean;
  selfie_verified?: boolean;
  verified_at?:     string | null;
}

// ─── profiles ─────────────────────────────────────────────────────────────────

export type ProfileRow = {
  id:                   string;        // uuid
  user_id:              string;        // uuid → public.users.id
  bio:                  string | null;
  university:           string | null;
  travel_preferences:   Record<string, unknown> | null;  // jsonb
  nominated_contact:    Record<string, unknown> | null;  // jsonb
  vehicle_details:      Record<string, unknown> | null;  // jsonb — migration 20260531000001
  women_only_mode:      boolean;                          // migration 20260531000001
}

export type ProfileInsert = {
  id?:                   string;       // defaults to gen_random_uuid()
  user_id:               string;
  bio?:                  string | null;
  university?:           string | null;
  travel_preferences?:   Record<string, unknown> | null;
  nominated_contact?:    Record<string, unknown> | null;
  vehicle_details?:      Record<string, unknown> | null;
  women_only_mode?:      boolean;      // defaults to false
}

export type ProfileUpdate = {
  bio?:                  string | null;
  university?:           string | null;
  travel_preferences?:   Record<string, unknown> | null;
  nominated_contact?:    Record<string, unknown> | null;
  vehicle_details?:      Record<string, unknown> | null;
  women_only_mode?:      boolean;
}

// ─── rides ────────────────────────────────────────────────────────────────────

export type RideStatus = 'active' | 'full' | 'completed' | 'cancelled';

/** Geographic point stored in the *_coords jsonb columns. */
export type Coords = { lat: number; lng: number };

export type RideRow = {
  id:                 string;        // uuid
  driver_id:          string;        // uuid → public.users.id
  from_location:      string;
  from_coords:        Coords | null; // jsonb
  to_location:        string;
  to_coords:          Coords | null; // jsonb
  departure_datetime: string;        // timestamptz ISO
  seats_total:        number;
  seats_available:    number;
  cost_per_seat:      number;        // numeric(10,2)
  currency:           Currency;
  distance_km:        number | null; // numeric(10,2)
  women_only:         boolean;
  status:             RideStatus;
  created_at:         string | null;
}

export type RideInsert = {
  id?:                 string;
  driver_id:           string;
  from_location:       string;
  from_coords?:        Coords | null;
  to_location:         string;
  to_coords?:          Coords | null;
  departure_datetime:  string;
  seats_total:         number;
  seats_available:     number;
  cost_per_seat:       number;
  currency:            Currency;
  distance_km?:        number | null;
  women_only?:         boolean;       // defaults to false
  status?:             RideStatus;    // defaults to 'active'
  created_at?:         string | null;
}

export type RideUpdate = {
  from_location?:      string;
  from_coords?:        Coords | null;
  to_location?:        string;
  to_coords?:          Coords | null;
  departure_datetime?: string;
  seats_total?:        number;
  seats_available?:    number;
  cost_per_seat?:      number;
  currency?:           Currency;
  distance_km?:        number | null;
  women_only?:         boolean;
  status?:             RideStatus;
}

// ─── bookings ─────────────────────────────────────────────────────────────────

export type BookingStatus = 'pending' | 'confirmed' | 'declined' | 'cancelled';

export type BookingRow = {
  id:           string;        // uuid
  ride_id:      string;        // uuid → public.rides.id
  passenger_id: string;        // uuid → public.users.id
  seats_booked: number;
  status:       BookingStatus;
  created_at:   string | null;
}

export type BookingInsert = {
  id?:           string;
  ride_id:       string;
  passenger_id:  string;
  seats_booked?: number;        // defaults to 1
  status?:       BookingStatus; // defaults to 'pending'
  created_at?:   string | null;
}

export type BookingUpdate = {
  seats_booked?: number;
  status?:       BookingStatus;
}

// ─── Database (Supabase client generic) ───────────────────────────────────────

export type Database = {
  public: {
    Tables: {
      users: {
        Row:    UserRow;
        Insert: UserInsert;
        Update: UserUpdate;
        Relationships: [];
      };
      verification: {
        Row:    VerificationRow;
        Insert: VerificationInsert;
        Update: VerificationUpdate;
        Relationships: [];
      };
      profiles: {
        Row:    ProfileRow;
        Insert: ProfileInsert;
        Update: ProfileUpdate;
        Relationships: [];
      };
      rides: {
        Row:    RideRow;
        Insert: RideInsert;
        Update: RideUpdate;
        Relationships: [];
      };
      bookings: {
        Row:    BookingRow;
        Insert: BookingInsert;
        Update: BookingUpdate;
        Relationships: [];
      };
    };
    Views:          { [_ in never]: never };
    Functions:      { [_ in never]: never };
    Enums:          { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
