/**
 * Integration tests: HomeScreen search input ↔ component state.
 *
 * These tests exercise the user-visible behaviour that crosses the
 * boundary between the UI and internal state — i.e. typing in the
 * search box and seeing the component respond correctly.  When a real
 * search API is wired up, these tests will be extended to assert on
 * network calls and result rendering.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import HomeScreen from '../../app/home';

describe('HomeScreen search — user journey', () => {
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

  it('Find a ride and Offer a ride buttons are both present and distinct', () => {
    render(<HomeScreen />);
    const findBtn  = screen.getByText('Find a ride');
    const offerBtn = screen.getByText('Offer a ride');
    expect(findBtn).toBeTruthy();
    expect(offerBtn).toBeTruthy();
    expect(findBtn).not.toBe(offerBtn);
  });
});
