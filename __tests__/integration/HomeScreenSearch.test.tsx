/**
 * Integration tests: HomeScreen search input ↔ component state.
 *
 * These tests exercise the user-visible behaviour that crosses the
 * boundary between the UI and internal state — typing in the from/to
 * fields, swapping them, and switching tabs. When a real search API is
 * wired up these tests will be extended to assert on network calls and
 * result rendering.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import HomeScreen from '../../app/home';

// ─── Destination input ────────────────────────────────────────────────────────

describe('HomeScreen search — destination input', () => {
  it('shows empty input on first render', () => {
    render(<HomeScreen />);
    const input = screen.getByPlaceholderText('City, town or university…');
    expect(input.props.value).toBe('');
  });

  it('reflects typed destination in the input field', () => {
    render(<HomeScreen />);
    const input = screen.getByPlaceholderText('City, town or university…');
    fireEvent.changeText(input, 'Galway');
    expect(input.props.value).toBe('Galway');
  });

  it('handles a full search-and-clear sequence without errors', () => {
    render(<HomeScreen />);
    const input = screen.getByPlaceholderText('City, town or university…');

    fireEvent.changeText(input, 'Belfast');
    expect(input.props.value).toBe('Belfast');

    fireEvent.changeText(input, '');
    expect(input.props.value).toBe('');
  });

  it('accepts cross-border routes including Irish characters', () => {
    render(<HomeScreen />);
    const input = screen.getByPlaceholderText('City, town or university…');
    fireEvent.changeText(input, 'Dún Laoghaire');
    expect(input.props.value).toBe('Dún Laoghaire');
  });
});

// ─── From/To dual-input journey ───────────────────────────────────────────────

describe('HomeScreen search — from/to journey', () => {
  it('both origin and destination fields start empty', () => {
    render(<HomeScreen />);
    const fromInput = screen.getByPlaceholderText('From — city, town or university');
    const toInput   = screen.getByPlaceholderText('City, town or university…');
    expect(fromInput.props.value).toBe('');
    expect(toInput.props.value).toBe('');
  });

  it('user can fill in both origin and destination independently', () => {
    render(<HomeScreen />);
    const fromInput = screen.getByPlaceholderText('From — city, town or university');
    const toInput   = screen.getByPlaceholderText('City, town or university…');

    fireEvent.changeText(fromInput, 'Dublin');
    fireEvent.changeText(toInput, 'Galway');

    expect(fromInput.props.value).toBe('Dublin');
    expect(toInput.props.value).toBe('Galway');
  });

  it('swap button exchanges origin and destination values', () => {
    render(<HomeScreen />);
    const fromInput = screen.getByPlaceholderText('From — city, town or university');
    const toInput   = screen.getByPlaceholderText('City, town or university…');

    fireEvent.changeText(fromInput, 'Cork');
    fireEvent.changeText(toInput, 'Limerick');

    fireEvent.press(screen.getByRole('button', { name: 'Swap origin and destination' }));

    expect(fromInput.props.value).toBe('Limerick');
    expect(toInput.props.value).toBe('Cork');
  });

  it('swapping empty fields leaves both empty', () => {
    render(<HomeScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Swap origin and destination' }));
    const fromInput = screen.getByPlaceholderText('From — city, town or university');
    const toInput   = screen.getByPlaceholderText('City, town or university…');
    expect(fromInput.props.value).toBe('');
    expect(toInput.props.value).toBe('');
  });
});

// ─── Tab switching ────────────────────────────────────────────────────────────

describe('HomeScreen search — tab switching', () => {
  it('Find a ride and Offer a ride tabs are both present and distinct', () => {
    render(<HomeScreen />);
    const findTab  = screen.getByText('Find a ride');
    const offerTab = screen.getByText('Offer a ride');
    expect(findTab).toBeTruthy();
    expect(offerTab).toBeTruthy();
    expect(findTab).not.toBe(offerTab);
  });

  it('switching to Offer a ride and back to Find a ride works without errors', () => {
    render(<HomeScreen />);
    fireEvent.press(screen.getByText('Offer a ride'));
    fireEvent.press(screen.getByText('Find a ride'));
    // inputs should still be accessible after tab switch
    expect(screen.getByPlaceholderText('City, town or university…')).toBeTruthy();
  });
});
