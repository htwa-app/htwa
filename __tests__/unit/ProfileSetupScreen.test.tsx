/**
 * __tests__/unit/ProfileSetupScreen.test.tsx
 *
 * Unit tests for app/profile-setup.tsx (Stage 20C).
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ProfileSetupScreen from '../../app/profile-setup';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

const mockUseAuth = jest.fn();
jest.mock('../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const mockUpsert = jest.fn();
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: () => ({ upsert: (...args: unknown[]) => mockUpsert(...args) }),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  (AsyncStorage.setItem as jest.Mock).mockClear();
  // Default: logged-in user
  mockUseAuth.mockReturnValue({ user: { id: 'user-123' } });
  // Default: upsert succeeds
  mockUpsert.mockResolvedValue({ error: null });
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fillBoth() {
  fireEvent.changeText(screen.getByPlaceholderText('e.g. Mam, Dad, Aoife'), 'Mam');
  fireEvent.changeText(screen.getByPlaceholderText('+353 or +44'), '+353 087 1234567');
}

// ─── Smoke ────────────────────────────────────────────────────────────────────

describe('ProfileSetupScreen — smoke', () => {
  it('renders without crashing', () => {
    expect(() => render(<ProfileSetupScreen />)).not.toThrow();
  });
});

// ─── Brand elements ───────────────────────────────────────────────────────────

describe('ProfileSetupScreen — brand elements', () => {
  beforeEach(() => render(<ProfileSetupScreen />));

  it('renders the htwa. logo mark with amber dot', () => {
    expect(screen.getByTestId('logo-dot')).toBeTruthy();
  });

  it('renders the logo text "htwa"', () => {
    // Multiple nodes contain "htwa" (logo + info box) — check at least one exists
    expect(screen.getAllByText(/htwa/).length).toBeGreaterThan(0);
  });
});

// ─── Layout ───────────────────────────────────────────────────────────────────

describe('ProfileSetupScreen — layout', () => {
  beforeEach(() => render(<ProfileSetupScreen />));

  it('renders the screen title "Almost there!"', () => {
    expect(screen.getByText('Almost there!')).toBeTruthy();
  });

  it('renders the subtitle text', () => {
    expect(screen.getByText(/trusted contact/i)).toBeTruthy();
  });

  it('renders the contact name input', () => {
    expect(screen.getByPlaceholderText('e.g. Mam, Dad, Aoife')).toBeTruthy();
  });

  it('renders the contact phone input', () => {
    expect(screen.getByPlaceholderText('+353 or +44')).toBeTruthy();
  });

  it('renders the info box text', () => {
    expect(screen.getByText(/They don't need the htwa app/)).toBeTruthy();
  });

  it('renders the Save and continue button', () => {
    expect(screen.getByRole('button', { name: 'Save and continue' })).toBeTruthy();
  });

  it('renders the skip link', () => {
    expect(screen.getByText("I'll add this later")).toBeTruthy();
  });
});

// ─── Validation ───────────────────────────────────────────────────────────────

describe('ProfileSetupScreen — validation', () => {
  beforeEach(() => render(<ProfileSetupScreen />));

  it('Save button is disabled when both fields are empty', () => {
    expect(screen.getByRole('button', { name: 'Save and continue' })).toBeDisabled();
  });

  it('Save button is disabled when only name is filled', () => {
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Mam, Dad, Aoife'), 'Mam');
    expect(screen.getByRole('button', { name: 'Save and continue' })).toBeDisabled();
  });

  it('Save button is disabled when only phone is filled', () => {
    fireEvent.changeText(screen.getByPlaceholderText('+353 or +44'), '+353 087 1234567');
    expect(screen.getByRole('button', { name: 'Save and continue' })).toBeDisabled();
  });

  it('Save button is enabled when both fields are filled', () => {
    fillBoth();
    expect(screen.getByRole('button', { name: 'Save and continue' })).not.toBeDisabled();
  });

  it('Save button is disabled when name is only whitespace', () => {
    fireEvent.changeText(screen.getByPlaceholderText('e.g. Mam, Dad, Aoife'), '   ');
    fireEvent.changeText(screen.getByPlaceholderText('+353 or +44'), '+353 087 1234567');
    expect(screen.getByRole('button', { name: 'Save and continue' })).toBeDisabled();
  });
});

// ─── Navigation ───────────────────────────────────────────────────────────────

describe('ProfileSetupScreen — navigation', () => {
  beforeEach(() => render(<ProfileSetupScreen />));

  it('skip link navigates to /(tabs)', () => {
    fireEvent.press(screen.getByText("I'll add this later"));
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
  });

  it('skip link calls router.replace exactly once', () => {
    fireEvent.press(screen.getByText("I'll add this later"));
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  it('Save and continue navigates to /(tabs) when both fields are filled', async () => {
    fillBoth();
    fireEvent.press(screen.getByRole('button', { name: 'Save and continue' }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(tabs)'));
  });

  it('Save and continue does not navigate when button is disabled', () => {
    fireEvent.press(screen.getByRole('button', { name: 'Save and continue' }));
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

// ─── Supabase upsert ──────────────────────────────────────────────────────────

describe('ProfileSetupScreen — Supabase upsert', () => {
  beforeEach(() => render(<ProfileSetupScreen />));

  it('calls supabase profiles upsert with correct data on save', async () => {
    fillBoth();
    fireEvent.press(screen.getByRole('button', { name: 'Save and continue' }));
    await waitFor(() =>
      expect(mockUpsert).toHaveBeenCalledWith(
        {
          user_id:           'user-123',
          nominated_contact: { name: 'Mam', phone: '+353 087 1234567' },
        },
        { onConflict: 'user_id' },
      ),
    );
  });

  it('does not call supabase upsert when skip is pressed', () => {
    fireEvent.press(screen.getByText("I'll add this later"));
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('shows an error message when upsert fails', async () => {
    mockUpsert.mockResolvedValueOnce({ error: { message: 'Database error' } });
    fillBoth();
    fireEvent.press(screen.getByRole('button', { name: 'Save and continue' }));
    await waitFor(() => expect(screen.getByText('Database error')).toBeTruthy());
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

// ─── AsyncStorage ─────────────────────────────────────────────────────────────

describe('ProfileSetupScreen — AsyncStorage', () => {
  beforeEach(() => render(<ProfileSetupScreen />));

  it('saves contact name with correct key on Save and continue', async () => {
    fillBoth();
    fireEvent.press(screen.getByRole('button', { name: 'Save and continue' }));
    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'htwa:nominatedContact:name',
        'Mam',
      );
    });
  });

  it('saves contact phone with correct key on Save and continue', async () => {
    fillBoth();
    fireEvent.press(screen.getByRole('button', { name: 'Save and continue' }));
    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'htwa:nominatedContact:phone',
        '+353 087 1234567',
      );
    });
  });

  it('calls AsyncStorage.setItem exactly twice on save', async () => {
    fillBoth();
    fireEvent.press(screen.getByRole('button', { name: 'Save and continue' }));
    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledTimes(2);
    });
  });

  it('does not call AsyncStorage when skip is pressed', () => {
    fireEvent.press(screen.getByText("I'll add this later"));
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });
});
