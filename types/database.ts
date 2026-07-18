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
  selfie_url:      string | null;  // migration 20260719000002 — live-captured selfie (never the ID document)
  verified_at:     string | null;  // timestamptz or null
}

export type VerificationInsert = {
  id?:              string;        // defaults to gen_random_uuid()
  user_id:          string;
  id_verified?:     boolean;       // defaults to false
  selfie_verified?: boolean;       // defaults to false
  selfie_url?:      string | null;
  verified_at?:     string | null;
}

export type VerificationUpdate = {
  id_verified?:     boolean;
  selfie_verified?: boolean;
  selfie_url?:      string | null;
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
  university_verification_status: UniversityVerificationStatus; // migration 20260601000002
  student_card_url:     string | null;                    // migration 20260601000002
}

export type UniversityVerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export type ProfileInsert = {
  id?:                   string;       // defaults to gen_random_uuid()
  user_id:               string;
  bio?:                  string | null;
  university?:           string | null;
  travel_preferences?:   Record<string, unknown> | null;
  nominated_contact?:    Record<string, unknown> | null;
  vehicle_details?:      Record<string, unknown> | null;
  women_only_mode?:      boolean;      // defaults to false
  university_verification_status?: UniversityVerificationStatus;
  student_card_url?:     string | null;
}

export type ProfileUpdate = {
  bio?:                  string | null;
  university?:           string | null;
  travel_preferences?:   Record<string, unknown> | null;
  nominated_contact?:    Record<string, unknown> | null;
  vehicle_details?:      Record<string, unknown> | null;
  women_only_mode?:      boolean;
  university_verification_status?: UniversityVerificationStatus;
  student_card_url?:     string | null;
}

// ─── rides ────────────────────────────────────────────────────────────────────

export type RideStatus = 'active' | 'full' | 'in_progress' | 'completed' | 'cancelled';

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
  luggage_note:       string | null;  // migration 20260601000004 (Block 8)
  estimated_duration_seconds: number | null; // migration 20260601000005 (Change 2)
  window_end:         string | null;  // migration 20260601000005 — overlap guard
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
  luggage_note?:       string | null;
  estimated_duration_seconds?: number | null;
  window_end?:         string | null;
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
  luggage_note?:       string | null;
  status?:             RideStatus;
}

// ─── bookings ─────────────────────────────────────────────────────────────────

export type BookingStatus = 'pending' | 'confirmed' | 'declined' | 'cancelled';
export type ChatStatus = 'open' | 'closed'; // migration 20260601000006 (Change 3)

export type BookingRow = {
  id:           string;        // uuid
  ride_id:      string;        // uuid → public.rides.id
  passenger_id: string;        // uuid → public.users.id
  seats_booked: number;
  status:       BookingStatus;
  chat_status:    ChatStatus;
  chat_closed_at: string | null;
  chat_closed_by: string | null;
  payment_intent_id: string | null; // migration 20260719000002 — written by create-payment-intent
  created_at:   string | null;
}

export type BookingInsert = {
  id?:           string;
  ride_id:       string;
  passenger_id:  string;
  seats_booked?: number;        // defaults to 1
  status?:       BookingStatus; // defaults to 'pending'
  chat_status?:    ChatStatus;  // defaults to 'open'
  chat_closed_at?: string | null;
  chat_closed_by?: string | null;
  payment_intent_id?: string | null;
  created_at?:   string | null;
}

export type BookingUpdate = {
  seats_booked?: number;
  status?:       BookingStatus;
  chat_status?:    ChatStatus;
  chat_closed_at?: string | null;
  chat_closed_by?: string | null;
}

// ─── messages ─────────────────────────────────────────────────────────────────

export type MessageRow = {
  id:         string;        // uuid
  booking_id: string;        // uuid → public.bookings.id
  sender_id:  string;        // uuid → public.users.id
  content:    string;
  created_at: string | null;
}

export type MessageInsert = {
  id?:         string;
  booking_id:  string;
  sender_id:   string;
  content:     string;
  created_at?: string | null;
}

export type MessageUpdate = {
  content?: string;
}

// ─── reviews ──────────────────────────────────────────────────────────────────

export type ReviewRow = {
  id:          string;        // uuid
  trip_id:     string;        // uuid → public.rides.id
  reviewer_id: string;        // uuid → public.users.id
  reviewee_id: string;        // uuid → public.users.id
  rating:      number;        // 1–5
  comment:     string | null;
  created_at:  string | null;
}

export type ReviewInsert = {
  id?:          string;
  trip_id:      string;
  reviewer_id:  string;
  reviewee_id:  string;
  rating:       number;
  comment?:     string | null;
  created_at?:  string | null;
}

export type ReviewUpdate = {
  rating?:  number;
  comment?: string | null;
}

// ─── driver pricing + mileage (migration 20260601000001) ──────────────────────

export type TaxResidence = 'ROI' | 'UK';
export type EngineCcBand  = 'le1200' | 'cc1201to1500' | 'ge1501';
export type DistanceUnitDb = 'km' | 'mile';
export type MileageSource = 'journey' | 'manual';

export type DriverPricingProfileRow = {
  user_id:                  string;
  tax_residence:            TaxResidence;
  engine_cc:                EngineCcBand;
  insurance_cert_confirmed: boolean;
  notify_insurer_confirmed: boolean;
  declaration_version:      string | null;
  declaration_accepted_at:  string | null;
  created_at:               string;
  updated_at:               string;
}

export type DriverPricingProfileInsert = {
  user_id:                   string;
  tax_residence:             TaxResidence;
  engine_cc:                 EngineCcBand;
  insurance_cert_confirmed?: boolean;
  notify_insurer_confirmed?: boolean;
  declaration_version?:      string | null;
  declaration_accepted_at?:  string | null;
}

export type DriverPricingProfileUpdate = Partial<DriverPricingProfileInsert>;

export type MileageIncrementRow = {
  id:         string;
  driver_id:  string;
  journey_id: string | null;
  amount:     number;
  unit:       DistanceUnitDb;
  source:     MileageSource;
  created_at: string;
}

export type MileageIncrementInsert = {
  driver_id:   string;
  journey_id?: string | null;
  amount:      number;
  unit:        DistanceUnitDb;
  source:      MileageSource;
}

export type PricingRateRow = {
  id:           string;
  jurisdiction: TaxResidence;
  band_index:   number;
  engine_cc:    EngineCcBand | null;
  upper_bound:  number;
  rate:         number;
  unit:         DistanceUnitDb;
  currency:     Currency;
  effective_from: string;
  created_at:   string;
}

export type PricingConfigRow = {
  key:         string;
  value:       number;
  description: string | null;
}

// ─── payment_accounts (migration 20260601000003) ──────────────────────────────

export type ConnectStatus = 'none' | 'pending' | 'active' | 'restricted';

export type PaymentAccountRow = {
  user_id:                   string;
  stripe_connect_account_id: string | null;
  connect_status:            ConnectStatus;
  stripe_customer_id:        string | null;
  has_payment_method:        boolean;
  payment_method_brand:      string | null;
  payment_method_last4:      string | null;
  created_at:                string;
  updated_at:                string;
}

export type PaymentAccountInsert = {
  user_id:                    string;
  stripe_connect_account_id?: string | null;
  connect_status?:            ConnectStatus;
  stripe_customer_id?:        string | null;
  has_payment_method?:        boolean;
  payment_method_brand?:      string | null;
  payment_method_last4?:      string | null;
}

export type PaymentAccountUpdate = Partial<PaymentAccountInsert>;

// ─── Safety suite (migration 20260719000001) ─────────────────────────────────

/** Per-journey nominated contact — the tracking/alert system reads THIS, never the profile default. */
export type JourneyContactRow = {
  id:               string;         // uuid
  ride_id:          string;         // uuid → public.rides.id
  user_id:          string;         // uuid → the participant who nominated the contact
  contact_name:     string;
  contact_phone:    string;
  contact_user_id:  string | null;  // set when the contact is an htwa user (in-app live view)
  tracking_token:   string;         // uuid — credential for the tokenised web link
  token_expires_at: string | null;  // set by trigger when the journey completes
  created_at:       string;
}

export type JourneyContactInsert = {
  id?:               string;
  ride_id:           string;
  user_id:           string;
  contact_name:      string;
  contact_phone:     string;
  contact_user_id?:  string | null;
  tracking_token?:   string;
  token_expires_at?: string | null;
}

export type JourneyContactUpdate = Partial<JourneyContactInsert>;

export type TripLocationRow = {
  id:          number;         // bigint identity
  ride_id:     string;         // uuid → public.rides.id
  lat:         number;
  lng:         number;
  heading:     number | null;
  speed_mps:   number | null;
  recorded_at: string;
}

export type TripLocationInsert = {
  ride_id:      string;
  lat:          number;
  lng:          number;
  heading?:     number | null;
  speed_mps?:   number | null;
  recorded_at?: string;
}

export type TripAlertType = 'sos' | 'off_course' | 'signal_lost';

export type TripAlertRow = {
  id:         string;          // uuid
  ride_id:    string;          // uuid → public.rides.id
  raised_by:  string;          // uuid → public.users.id
  alert_type: TripAlertType;
  lat:        number | null;
  lng:        number | null;
  detail:     string | null;
  channels:   string[];        // jsonb — delivery channels used, e.g. ["sms","push"]
  created_at: string;
}

export type TripAlertInsert = {
  id?:        string;
  ride_id:    string;
  raised_by:  string;
  alert_type: TripAlertType;
  lat?:       number | null;
  lng?:       number | null;
  detail?:    string | null;
  channels?:  string[];
}

// ─── Disclosure + waiver (migration 20260719000002) ──────────────────────────

export type WaiverRole = 'driver' | 'passenger';

export type WaiverAcceptanceRow = {
  id:               string;        // uuid
  user_id:          string;        // uuid → public.users.id
  ride_id:          string | null;
  booking_id:       string | null;
  role:             WaiverRole;
  document_version: string;        // e.g. "2026-07-18" — legal/verification-responsibility-waiver.md version
  accepted_at:      string;
}

export type WaiverAcceptanceInsert = {
  id?:               string;
  user_id:           string;
  ride_id?:          string | null;
  booking_id?:       string | null;
  role:              WaiverRole;
  document_version:  string;
}

/** Service-role-only review queue (no client RLS policies) — typed for Edge Functions/tests. */
export type AccountFlagRow = {
  id:         string;
  user_id:    string;
  flag_type:  string;
  detail:     string | null;
  raised_by:  string | null;
  resolved:   boolean;
  created_at: string;
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
      messages: {
        Row:    MessageRow;
        Insert: MessageInsert;
        Update: MessageUpdate;
        Relationships: [];
      };
      reviews: {
        Row:    ReviewRow;
        Insert: ReviewInsert;
        Update: ReviewUpdate;
        Relationships: [];
      };
      driver_pricing_profiles: {
        Row:    DriverPricingProfileRow;
        Insert: DriverPricingProfileInsert;
        Update: DriverPricingProfileUpdate;
        Relationships: [];
      };
      driver_mileage_increments: {
        Row:    MileageIncrementRow;
        Insert: MileageIncrementInsert;
        Update: Partial<MileageIncrementInsert>;
        Relationships: [];
      };
      pricing_rates: {
        Row:    PricingRateRow;
        Insert: Partial<PricingRateRow>;
        Update: Partial<PricingRateRow>;
        Relationships: [];
      };
      pricing_config: {
        Row:    PricingConfigRow;
        Insert: PricingConfigRow;
        Update: Partial<PricingConfigRow>;
        Relationships: [];
      };
      payment_accounts: {
        Row:    PaymentAccountRow;
        Insert: PaymentAccountInsert;
        Update: PaymentAccountUpdate;
        Relationships: [];
      };
      journey_contacts: {
        Row:    JourneyContactRow;
        Insert: JourneyContactInsert;
        Update: JourneyContactUpdate;
        Relationships: [];
      };
      trip_locations: {
        Row:    TripLocationRow;
        Insert: TripLocationInsert;
        Update: Partial<TripLocationInsert>;
        Relationships: [];
      };
      trip_alerts: {
        Row:    TripAlertRow;
        Insert: TripAlertInsert;
        Update: Partial<TripAlertInsert>;
        Relationships: [];
      };
      waiver_acceptances: {
        Row:    WaiverAcceptanceRow;
        Insert: WaiverAcceptanceInsert;
        Update: Partial<WaiverAcceptanceInsert>;
        Relationships: [];
      };
      account_flags: {
        Row:    AccountFlagRow;
        Insert: Partial<AccountFlagRow>;
        Update: Partial<AccountFlagRow>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      book_ride: {
        Args: { p_ride_id: string; p_passenger_id: string; p_seats: number };
        Returns: undefined;
      };
      close_chat: {
        Args: { p_booking_id: string };
        Returns: undefined;
      };
      restore_ride_seats: {
        Args: { p_ride_id: string; p_seats: number };
        Returns: undefined;
      };
      get_tracking_snapshot: {
        Args: { p_token: string };
        Returns: Record<string, unknown>;
      };
      get_driver_disclosure: {
        Args: { p_ride_id: string };
        Returns: Record<string, unknown>;
      };
    };
    Enums:          { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
