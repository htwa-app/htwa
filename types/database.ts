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
    };
  };
}
