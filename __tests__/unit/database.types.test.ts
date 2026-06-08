/**
 * __tests__/unit/database.types.test.ts
 *
 * Type-level tests for types/database.ts.
 *
 * Strategy: assign typed literals to variables with explicit type annotations
 * and assert shape at runtime using plain object checks. TypeScript will catch
 * shape mismatches at compile time; Jest gives us a fast runtime gate too.
 *
 * We do NOT import Supabase here — these tests only verify our hand-written
 * types are internally consistent and match the schema.
 */

import type {
  UserRow, UserInsert, UserUpdate,
  VerificationRow, VerificationInsert, VerificationUpdate,
  ProfileRow, ProfileInsert, ProfileUpdate,
  RideRow, RideInsert, RideUpdate,
  BookingRow, BookingInsert, BookingUpdate,
  HomeLocation, Currency,
  Database,
} from '../../types/database';

// ─── Compile-time shape checks ────────────────────────────────────────────────
// If any field name or type is wrong the TypeScript compiler rejects the file.

const _userRow: UserRow = {
  id:            'uuid-1',
  email:         'test@test.ie',
  phone:         null,
  full_name:     'Test User',
  home_location: 'ROI',
  currency:      'EUR',
  gender:        null,
  created_at:    '2026-05-09T00:00:00Z',
};

const _userInsert: UserInsert = {
  id:            'uuid-1',
  email:         'test@test.ie',
  full_name:     'Test User',
  home_location: 'NI',
  currency:      'GBP',
};

const _userUpdate: UserUpdate = {
  full_name: 'Updated Name',
};

const _verificationRow: VerificationRow = {
  id:              'uuid-2',
  user_id:         'uuid-1',
  id_verified:     false,
  selfie_verified: false,
  verified_at:     null,
};

const _verificationInsert: VerificationInsert = {
  user_id: 'uuid-1',
};

const _verificationUpdate: VerificationUpdate = {
  id_verified:     true,
  selfie_verified: true,
  verified_at:     '2026-05-09T12:00:00Z',
};

const _profileRow: ProfileRow = {
  id:                 'uuid-3',
  user_id:            'uuid-1',
  bio:                null,
  university:         null,
  travel_preferences: null,
  nominated_contact:  null,
  vehicle_details:    null,
  women_only_mode:    false,
  university_verification_status: 'unverified',
  student_card_url:   null,
};

const _profileInsert: ProfileInsert = {
  user_id: 'uuid-1',
};

const _profileUpdate: ProfileUpdate = {
  bio:        'Love long drives',
  university: 'UCD',
};

// Suppress "assigned but never read" lint warnings — these exist for TS checks.
void _userRow; void _userInsert; void _userUpdate;
void _verificationRow; void _verificationInsert; void _verificationUpdate;
void _profileRow; void _profileInsert; void _profileUpdate;

// ─── Runtime tests ────────────────────────────────────────────────────────────

describe('types/database — UserRow', () => {
  it('has all required fields', () => {
    const keys: (keyof UserRow)[] = [
      'id', 'email', 'phone', 'full_name', 'home_location', 'currency', 'created_at',
    ];
    keys.forEach((k) => expect(k in _userRow).toBe(true));
  });

  it('phone is nullable', () => {
    expect(_userRow.phone).toBeNull();
  });
});

describe('types/database — UserInsert', () => {
  it('requires id, email, full_name, home_location, currency', () => {
    const required: (keyof UserInsert)[] = [
      'id', 'email', 'full_name', 'home_location', 'currency',
    ];
    required.forEach((k) => expect(k in _userInsert).toBe(true));
  });

  it('does not require created_at', () => {
    expect('created_at' in _userInsert).toBe(false);
  });
});

describe('types/database — UserUpdate', () => {
  it('all fields are optional (partial object is valid)', () => {
    const partial: UserUpdate = { currency: 'GBP' };
    expect(partial.currency).toBe('GBP');
    expect(partial.full_name).toBeUndefined();
  });
});

describe('types/database — HomeLocation', () => {
  it('accepts ROI', () => {
    const loc: HomeLocation = 'ROI';
    expect(loc).toBe('ROI');
  });

  it('accepts NI', () => {
    const loc: HomeLocation = 'NI';
    expect(loc).toBe('NI');
  });
});

describe('types/database — Currency', () => {
  it('accepts EUR', () => {
    const c: Currency = 'EUR';
    expect(c).toBe('EUR');
  });

  it('accepts GBP', () => {
    const c: Currency = 'GBP';
    expect(c).toBe('GBP');
  });
});

describe('types/database — VerificationRow', () => {
  it('has all required fields', () => {
    const keys: (keyof VerificationRow)[] = [
      'id', 'user_id', 'id_verified', 'selfie_verified', 'verified_at',
    ];
    keys.forEach((k) => expect(k in _verificationRow).toBe(true));
  });

  it('verified_at is nullable', () => {
    expect(_verificationRow.verified_at).toBeNull();
  });

  it('defaults id_verified and selfie_verified to false', () => {
    expect(_verificationRow.id_verified).toBe(false);
    expect(_verificationRow.selfie_verified).toBe(false);
  });
});

describe('types/database — VerificationInsert', () => {
  it('only requires user_id', () => {
    const minimal: VerificationInsert = { user_id: 'uuid-1' };
    expect(minimal.user_id).toBe('uuid-1');
  });
});

describe('types/database — VerificationUpdate', () => {
  it('can set both verified flags and verified_at', () => {
    expect(_verificationUpdate.id_verified).toBe(true);
    expect(_verificationUpdate.selfie_verified).toBe(true);
    expect(_verificationUpdate.verified_at).toBe('2026-05-09T12:00:00Z');
  });
});

describe('types/database — ProfileRow', () => {
  it('has all required fields', () => {
    const keys: (keyof ProfileRow)[] = [
      'id', 'user_id', 'bio', 'university', 'travel_preferences', 'nominated_contact',
    ];
    keys.forEach((k) => expect(k in _profileRow).toBe(true));
  });

  it('bio, university, travel_preferences, nominated_contact are all nullable', () => {
    expect(_profileRow.bio).toBeNull();
    expect(_profileRow.university).toBeNull();
    expect(_profileRow.travel_preferences).toBeNull();
    expect(_profileRow.nominated_contact).toBeNull();
  });
});

describe('types/database — ProfileInsert', () => {
  it('only requires user_id', () => {
    const minimal: ProfileInsert = { user_id: 'uuid-1' };
    expect(minimal.user_id).toBe('uuid-1');
  });
});

describe('types/database — ProfileUpdate', () => {
  it('can update bio and university independently', () => {
    expect(_profileUpdate.bio).toBe('Love long drives');
    expect(_profileUpdate.university).toBe('UCD');
  });
});

describe('types/database — Database shape', () => {
  it('has public.Tables.users', () => {
    // Type-level: if Database.public.Tables.users doesn't exist, TS compile fails.
    type UsersTable = Database['public']['Tables']['users'];
    type _RowCheck    = UsersTable['Row']    extends UserRow    ? true : never;
    type _InsertCheck = UsersTable['Insert'] extends UserInsert ? true : never;
    type _UpdateCheck = UsersTable['Update'] extends UserUpdate ? true : never;
    const _pass: _RowCheck & _InsertCheck & _UpdateCheck = true;
    expect(_pass).toBe(true);
  });

  it('has public.Tables.verification', () => {
    type VerifTable   = Database['public']['Tables']['verification'];
    type _RowCheck    = VerifTable['Row']    extends VerificationRow    ? true : never;
    type _InsertCheck = VerifTable['Insert'] extends VerificationInsert ? true : never;
    type _UpdateCheck = VerifTable['Update'] extends VerificationUpdate ? true : never;
    const _pass: _RowCheck & _InsertCheck & _UpdateCheck = true;
    expect(_pass).toBe(true);
  });

  it('has public.Tables.profiles', () => {
    type ProfTable    = Database['public']['Tables']['profiles'];
    type _RowCheck    = ProfTable['Row']    extends ProfileRow    ? true : never;
    type _InsertCheck = ProfTable['Insert'] extends ProfileInsert ? true : never;
    type _UpdateCheck = ProfTable['Update'] extends ProfileUpdate ? true : never;
    const _pass: _RowCheck & _InsertCheck & _UpdateCheck = true;
    expect(_pass).toBe(true);
  });

  it('has public.Tables.rides', () => {
    type RideTable    = Database['public']['Tables']['rides'];
    type _RowCheck    = RideTable['Row']    extends RideRow    ? true : never;
    type _InsertCheck = RideTable['Insert'] extends RideInsert ? true : never;
    type _UpdateCheck = RideTable['Update'] extends RideUpdate ? true : never;
    const _pass: _RowCheck & _InsertCheck & _UpdateCheck = true;
    expect(_pass).toBe(true);
  });

  it('has public.Tables.bookings', () => {
    type BookingTable = Database['public']['Tables']['bookings'];
    type _RowCheck    = BookingTable['Row']    extends BookingRow    ? true : never;
    type _InsertCheck = BookingTable['Insert'] extends BookingInsert ? true : never;
    type _UpdateCheck = BookingTable['Update'] extends BookingUpdate ? true : never;
    const _pass: _RowCheck & _InsertCheck & _UpdateCheck = true;
    expect(_pass).toBe(true);
  });
});

// ─── Row literal shape checks (compile-time) ──────────────────────────────────

const _rideRow: RideRow = {
  id:                 'uuid-r',
  driver_id:          'uuid-1',
  from_location:      'Galway',
  from_coords:        { lat: 53.27, lng: -9.05 },
  to_location:        'Dublin',
  to_coords:          null,
  departure_datetime: '2026-06-01T09:00:00Z',
  seats_total:        4,
  seats_available:    3,
  cost_per_seat:      12.5,
  currency:           'EUR',
  distance_km:        208.4,
  women_only:         false,
  luggage_note:       null,
  status:             'active',
  created_at:         null,
};

const _bookingRow: BookingRow = {
  id:           'uuid-b',
  ride_id:      'uuid-r',
  passenger_id: 'uuid-2',
  seats_booked: 1,
  status:       'pending',
  created_at:   null,
};

void _rideRow;
void _bookingRow;
