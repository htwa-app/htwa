/**
 * __tests__/unit/SettingsScreen.test.tsx
 *
 * Tests for app/settings.tsx — notification prefs, default nominated contact,
 * women-only mode, currency, legal links, sign out, delete account
 * (anonymise-in-place via the delete-account Edge Function).
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, replace: mockReplace, push: mockPush }),
}));

jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return { Ionicons: (p: Record<string, unknown>) => <View testID={`icon-${p.name}`} /> };
});

const mockDevReset = jest.fn();
jest.mock('../../utils/devReset', () => ({
  devResetAndSignOut: (...a: unknown[]) => mockDevReset(...a),
}));

// ── Supabase mock ─────────────────────────────────────────────────────────────

const mockProfileFetch = jest.fn();
const mockUserFetch = jest.fn();
const mockProfileUpsert = jest.fn();
const mockUserUpdate = jest.fn();
const mockSignOut = jest.fn();
const mockInvoke = jest.fn();

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      const builder: Record<string, unknown> = {};
      builder.select = () => builder;
      builder.eq = () => builder;
      builder.maybeSingle = () => (table === 'profiles' ? mockProfileFetch() : mockUserFetch());
      builder.upsert = (...args: unknown[]) => {
        mockProfileUpsert(...args);
        return { select: () => Promise.resolve({ data: [{ user_id: 'u1' }], error: null }) };
      };
      builder.update = (...args: unknown[]) => {
        mockUserUpdate(...args);
        const chain = { eq: () => chain, select: () => Promise.resolve({ data: [{ id: 'u1' }], error: null }) };
        return chain;
      };
      return builder;
    },
    auth: { signOut: (...a: unknown[]) => mockSignOut(...a) },
    functions: { invoke: (...a: unknown[]) => mockInvoke(...a) },
  },
}));

const mockUseAuth = jest.fn();
jest.mock('../../context/AuthContext', () => ({ useAuth: () => mockUseAuth() }));

import SettingsScreen from '../../app/settings';

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
  mockDevReset.mockResolvedValue(undefined);
  mockProfileFetch.mockResolvedValue({
    data: {
      notification_prefs: { booking_updates: true },
      women_only_mode: false,
      nominated_contact: { name: 'Mam', phone: '+353871234567' },
    },
    error: null,
  });
  mockUserFetch.mockResolvedValue({ data: { currency: 'EUR', gender: 'female' }, error: null });
  mockSignOut.mockResolvedValue({ error: null });
  mockInvoke.mockResolvedValue({ data: { ok: true }, error: null });
});

describe('SettingsScreen — load', () => {
  it('renders sections with loaded values', async () => {
    render(<SettingsScreen />);
    await waitFor(() => expect(screen.getByTestId('settings-screen')).toBeTruthy());
    expect(screen.getByTestId('pref-booking_updates')).toBeTruthy();
    expect(screen.getByTestId('default-contact-name').props.value).toBe('Mam');
    expect(screen.getByTestId('women-only-toggle')).toBeTruthy();
    expect(screen.getByTestId('currency-segment')).toBeTruthy();
  });

  it('a failed load shows retry, and retry recovers', async () => {
    mockProfileFetch.mockResolvedValueOnce({ data: null, error: { message: 'down' } });
    render(<SettingsScreen />);
    await waitFor(() => expect(screen.getByTestId('settings-load-error')).toBeTruthy());
    fireEvent.press(screen.getByTestId('settings-retry'));
    await waitFor(() => expect(screen.getByTestId('settings-screen')).toBeTruthy());
  });

  it('hides the women-only toggle for non-female users', async () => {
    mockUserFetch.mockResolvedValue({ data: { currency: 'EUR', gender: 'male' }, error: null });
    render(<SettingsScreen />);
    await waitFor(() => expect(screen.getByTestId('settings-screen')).toBeTruthy());
    expect(screen.queryByTestId('women-only-toggle')).toBeNull();
  });
});

describe('SettingsScreen — writes', () => {
  it('toggling a notification pref persists the full prefs object', async () => {
    render(<SettingsScreen />);
    await waitFor(() => expect(screen.getByTestId('pref-booking_updates')).toBeTruthy());
    fireEvent(screen.getByTestId('pref-booking_updates'), 'valueChange', false);
    await waitFor(() => expect(mockProfileUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'u1', notification_prefs: expect.objectContaining({ booking_updates: false }) }),
      { onConflict: 'user_id' },
    ));
  });

  it('women-only toggle persists', async () => {
    render(<SettingsScreen />);
    await waitFor(() => expect(screen.getByTestId('women-only-toggle')).toBeTruthy());
    fireEvent(screen.getByTestId('women-only-toggle'), 'valueChange', true);
    await waitFor(() => expect(mockProfileUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ women_only_mode: true }),
      { onConflict: 'user_id' },
    ));
  });

  it('saves the default nominated contact and confirms', async () => {
    render(<SettingsScreen />);
    await waitFor(() => expect(screen.getByTestId('save-default-contact')).toBeTruthy());
    fireEvent.changeText(screen.getByTestId('default-contact-name'), 'Da');
    fireEvent.changeText(screen.getByTestId('default-contact-phone'), '+353861111111');
    fireEvent.press(screen.getByTestId('save-default-contact'));
    await waitFor(() => expect(mockProfileUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ nominated_contact: { name: 'Da', phone: '+353861111111' } }),
      { onConflict: 'user_id' },
    ));
    await waitFor(() => expect(screen.getByTestId('contact-saved-note')).toBeTruthy());
  });

  it('rejects an empty default contact', async () => {
    render(<SettingsScreen />);
    await waitFor(() => expect(screen.getByTestId('save-default-contact')).toBeTruthy());
    fireEvent.changeText(screen.getByTestId('default-contact-name'), '');
    fireEvent.press(screen.getByTestId('save-default-contact'));
    await waitFor(() => expect(screen.getByTestId('settings-action-error')).toBeTruthy());
    expect(mockProfileUpsert).not.toHaveBeenCalled();
  });

  it('changes currency via the users table', async () => {
    render(<SettingsScreen />);
    await waitFor(() => expect(screen.getByTestId('currency-GBP')).toBeTruthy());
    fireEvent.press(screen.getByTestId('currency-GBP'));
    await waitFor(() => expect(mockUserUpdate).toHaveBeenCalledWith({ currency: 'GBP' }));
  });
});

describe('SettingsScreen — legal links', () => {
  it.each([['terms'], ['privacy'], ['safety-pledge']])('navigates to /legal/%s', async (slug) => {
    render(<SettingsScreen />);
    await waitFor(() => expect(screen.getByTestId(`legal-link-${slug}`)).toBeTruthy());
    fireEvent.press(screen.getByTestId(`legal-link-${slug}`));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/legal/[doc]', params: { doc: slug } });
  });
});

describe('SettingsScreen — account actions', () => {
  it('signs out and routes to login', async () => {
    render(<SettingsScreen />);
    await waitFor(() => expect(screen.getByTestId('sign-out-button')).toBeTruthy());
    fireEvent.press(screen.getByTestId('sign-out-button'));
    await waitFor(() => expect(mockSignOut).toHaveBeenCalled());
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
  });

  it('delete account confirms, invokes the Edge Function, signs out', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((...args: unknown[]) => {
      const buttons = args[2] as Array<{ text: string; onPress?: () => void }>;
      buttons.find((b) => b.text === 'Delete my account')?.onPress?.();
    });
    render(<SettingsScreen />);
    await waitFor(() => expect(screen.getByTestId('delete-account-button')).toBeTruthy());
    fireEvent.press(screen.getByTestId('delete-account-button'));
    await waitFor(() => expect(mockInvoke).toHaveBeenCalledWith('delete-account', { body: {} }));
    await waitFor(() => expect(mockSignOut).toHaveBeenCalled());
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/login'));
    alertSpy.mockRestore();
  });

  it('a failed deletion shows an error and does NOT sign out', async () => {
    mockInvoke.mockResolvedValue({ data: null, error: { message: 'boom' } });
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((...args: unknown[]) => {
      const buttons = args[2] as Array<{ text: string; onPress?: () => void }>;
      buttons.find((b) => b.text === 'Delete my account')?.onPress?.();
    });
    render(<SettingsScreen />);
    await waitFor(() => expect(screen.getByTestId('delete-account-button')).toBeTruthy());
    fireEvent.press(screen.getByTestId('delete-account-button'));
    await waitFor(() => expect(screen.getByTestId('settings-action-error')).toBeTruthy());
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it('navigates back when the back button is pressed', async () => {
    render(<SettingsScreen />);
    await waitFor(() => expect(screen.getByTestId('back-button')).toBeTruthy());
    fireEvent.press(screen.getByTestId('back-button'));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
