/**
 * __tests__/unit/NominatedContactCard.test.tsx
 * Safety suite — tests for components/NominatedContactCard.tsx
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return { Ionicons: (p: { name: string }) => <View testID={`icon-${p.name}`} /> };
});

const mockGetJourneyContact = jest.fn();
const mockGetDefaultContact = jest.fn();
const mockSetJourneyContact = jest.fn();
jest.mock('../../services/tracking', () => ({
  getJourneyContact: (...a: unknown[]) => mockGetJourneyContact(...a),
  getDefaultContact: (...a: unknown[]) => mockGetDefaultContact(...a),
  setJourneyContact: (...a: unknown[]) => mockSetJourneyContact(...a),
}));

import { NominatedContactCard } from '../../components/NominatedContactCard';

const CONTACT = {
  id: 'jc-1', ride_id: 'ride-1', user_id: 'u1',
  contact_name: 'Mam', contact_phone: '+353871234567',
  contact_user_id: null, tracking_token: 'tok-1',
  token_expires_at: null, created_at: 'x',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetJourneyContact.mockResolvedValue({ ok: false, reason: 'none' });
  mockGetDefaultContact.mockResolvedValue(null);
  mockSetJourneyContact.mockResolvedValue({ ok: true, contact: CONTACT });
});

describe('NominatedContactCard', () => {
  it('shows the saved journey contact with a Change button when editable', async () => {
    mockGetJourneyContact.mockResolvedValue({ ok: true, contact: CONTACT });
    render(<NominatedContactCard rideId="ride-1" userId="u1" editable />);
    await waitFor(() => expect(screen.getByTestId('contact-name')).toBeTruthy());
    expect(screen.getByText('Mam')).toBeTruthy();
    expect(screen.getByTestId('contact-edit-button')).toBeTruthy();
  });

  it('hides Change once not editable (journey started)', async () => {
    mockGetJourneyContact.mockResolvedValue({ ok: true, contact: CONTACT });
    render(<NominatedContactCard rideId="ride-1" userId="u1" editable={false} />);
    await waitFor(() => expect(screen.getByTestId('contact-name')).toBeTruthy());
    expect(screen.queryByTestId('contact-edit-button')).toBeNull();
  });

  it('with no contact yet, shows the editor pre-filled from the default', async () => {
    mockGetDefaultContact.mockResolvedValue({ name: 'Da', phone: '+353861111111' });
    render(<NominatedContactCard rideId="ride-1" userId="u1" editable />);
    await waitFor(() => expect(screen.getByTestId('contact-name-input')).toBeTruthy());
    expect(screen.getByTestId('contact-name-input').props.value).toBe('Da');
    expect(screen.getByTestId('contact-phone-input').props.value).toBe('+353861111111');
  });

  it('saves a contact and reports it upward', async () => {
    const onContact = jest.fn();
    render(<NominatedContactCard rideId="ride-1" userId="u1" editable onContact={onContact} />);
    await waitFor(() => expect(screen.getByTestId('contact-save-button')).toBeTruthy());
    fireEvent.changeText(screen.getByTestId('contact-name-input'), 'Mam');
    fireEvent.changeText(screen.getByTestId('contact-phone-input'), '+353871234567');
    fireEvent.press(screen.getByTestId('contact-save-button'));
    await waitFor(() => expect(mockSetJourneyContact).toHaveBeenCalledWith('ride-1', 'u1', { name: 'Mam', phone: '+353871234567' }));
    await waitFor(() => expect(onContact).toHaveBeenCalledWith(CONTACT));
    expect(screen.getByTestId('contact-name')).toBeTruthy();
  });

  it('shows a save error and stays in the editor', async () => {
    mockSetJourneyContact.mockResolvedValue({ ok: false, message: 'Could not save.' });
    render(<NominatedContactCard rideId="ride-1" userId="u1" editable />);
    await waitFor(() => expect(screen.getByTestId('contact-save-button')).toBeTruthy());
    fireEvent.changeText(screen.getByTestId('contact-name-input'), 'Mam');
    fireEvent.changeText(screen.getByTestId('contact-phone-input'), '+353871');
    fireEvent.press(screen.getByTestId('contact-save-button'));
    await waitFor(() => expect(screen.getByTestId('contact-save-error')).toBeTruthy());
  });

  it('a load ERROR shows retry — never the empty editor', async () => {
    mockGetJourneyContact.mockResolvedValue({ ok: false, reason: 'error' });
    render(<NominatedContactCard rideId="ride-1" userId="u1" editable />);
    await waitFor(() => expect(screen.getByTestId('contact-retry')).toBeTruthy());
    expect(screen.queryByTestId('contact-name-input')).toBeNull();

    mockGetJourneyContact.mockResolvedValue({ ok: true, contact: CONTACT });
    fireEvent.press(screen.getByTestId('contact-retry'));
    await waitFor(() => expect(screen.getByTestId('contact-name')).toBeTruthy());
  });
});
