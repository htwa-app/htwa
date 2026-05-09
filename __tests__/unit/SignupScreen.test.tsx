import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import SignupScreen from '../../app/signup';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Fill all form fields with valid data and select the given home location. */
function fillAll(homeLocation: 'ROI' | 'NI' = 'ROI') {
  fireEvent.changeText(screen.getByPlaceholderText('Your full name'),   'Jane Doe');
  fireEvent.changeText(screen.getByPlaceholderText('you@university.ie'), 'jane@ucd.ie');
  fireEvent.changeText(screen.getByPlaceholderText('+353 ...'),          '+353 087 1234567');
  fireEvent.changeText(screen.getByPlaceholderText('e.g. UCD, TCD, QUB'), 'UCD');
  fireEvent.press(screen.getByRole('button', { name: homeLocation }));
}

// ─── Smoke ────────────────────────────────────────────────────────────────────

describe('SignupScreen — smoke', () => {
  it('renders without crashing', () => {
    expect(() => render(<SignupScreen />)).not.toThrow();
  });
});

// ─── Layout ───────────────────────────────────────────────────────────────────

describe('SignupScreen — layout', () => {
  beforeEach(() => render(<SignupScreen />));

  it('displays the screen title', () => {
    expect(screen.getByText('Create your account')).toBeTruthy();
  });

  it('renders the Full name input', () => {
    expect(screen.getByPlaceholderText('Your full name')).toBeTruthy();
  });

  it('renders the Email input', () => {
    expect(screen.getByPlaceholderText('you@university.ie')).toBeTruthy();
  });

  it('renders the Phone number input', () => {
    expect(screen.getByPlaceholderText('+353 ...')).toBeTruthy();
  });

  it('renders the University input', () => {
    expect(screen.getByPlaceholderText('e.g. UCD, TCD, QUB')).toBeTruthy();
  });

  it('renders the ROI location pill', () => {
    expect(screen.getByRole('button', { name: 'ROI' })).toBeTruthy();
  });

  it('renders the NI location pill', () => {
    expect(screen.getByRole('button', { name: 'NI' })).toBeTruthy();
  });

  it('renders the Continue button', () => {
    expect(screen.getByRole('button', { name: 'Continue' })).toBeTruthy();
  });
});

// ─── Validation ───────────────────────────────────────────────────────────────

describe('SignupScreen — validation', () => {
  beforeEach(() => render(<SignupScreen />));

  it('Continue is disabled when no fields are filled', () => {
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  it('Continue is disabled when only full name is filled', () => {
    fireEvent.changeText(screen.getByPlaceholderText('Your full name'), 'Jane Doe');
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  it('Continue is disabled when email is missing @', () => {
    fillAll();
    fireEvent.changeText(screen.getByPlaceholderText('you@university.ie'), 'jane.ucd.ie');
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  it('Continue is disabled when email is missing .', () => {
    fillAll();
    fireEvent.changeText(screen.getByPlaceholderText('you@university.ie'), 'jane@universityie');
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  it('Continue is disabled when phone has fewer than 9 digits', () => {
    fillAll();
    fireEvent.changeText(screen.getByPlaceholderText('+353 ...'), '+353 12 34');
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  it('Continue is disabled when university is blank', () => {
    fillAll();
    fireEvent.changeText(screen.getByPlaceholderText('e.g. UCD, TCD, QUB'), '   ');
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  it('Continue is disabled when no home location is selected', () => {
    fireEvent.changeText(screen.getByPlaceholderText('Your full name'),   'Jane Doe');
    fireEvent.changeText(screen.getByPlaceholderText('you@university.ie'), 'jane@ucd.ie');
    fireEvent.changeText(screen.getByPlaceholderText('+353 ...'),          '+353 087 1234567');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. UCD, TCD, QUB'), 'UCD');
    // deliberately do NOT press a location pill
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  it('Continue is enabled when all fields are valid and ROI is selected', () => {
    fillAll('ROI');
    expect(screen.getByRole('button', { name: 'Continue' })).not.toBeDisabled();
  });

  it('Continue is enabled when all fields are valid and NI is selected', () => {
    fillAll('NI');
    expect(screen.getByRole('button', { name: 'Continue' })).not.toBeDisabled();
  });

  it('Continue is enabled when phone has exactly 9 digits', () => {
    fireEvent.changeText(screen.getByPlaceholderText('Your full name'),   'Jane Doe');
    fireEvent.changeText(screen.getByPlaceholderText('you@university.ie'), 'jane@ucd.ie');
    fireEvent.changeText(screen.getByPlaceholderText('+353 ...'),          '123456789'); // exactly 9 digits
    fireEvent.changeText(screen.getByPlaceholderText('e.g. UCD, TCD, QUB'), 'UCD');
    fireEvent.press(screen.getByRole('button', { name: 'ROI' }));
    expect(screen.getByRole('button', { name: 'Continue' })).not.toBeDisabled();
  });
});

// ─── Location pills ───────────────────────────────────────────────────────────

describe('SignupScreen — location pills', () => {
  beforeEach(() => render(<SignupScreen />));

  it('pressing ROI does not throw', () => {
    expect(() =>
      fireEvent.press(screen.getByRole('button', { name: 'ROI' }))
    ).not.toThrow();
  });

  it('pressing NI does not throw', () => {
    expect(() =>
      fireEvent.press(screen.getByRole('button', { name: 'NI' }))
    ).not.toThrow();
  });

  it('selecting ROI alone does not enable Continue (other fields still empty)', () => {
    fireEvent.press(screen.getByRole('button', { name: 'ROI' }));
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  it('selecting NI alone does not enable Continue (other fields still empty)', () => {
    fireEvent.press(screen.getByRole('button', { name: 'NI' }));
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });
});

// ─── Navigation ───────────────────────────────────────────────────────────────

describe('SignupScreen — navigation', () => {
  beforeEach(() => render(<SignupScreen />));

  it('Continue when valid calls router.push with /verify', () => {
    fillAll('ROI');
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(mockPush).toHaveBeenCalledWith('/verify');
  });

  it('Continue when valid calls router.push exactly once', () => {
    fillAll('ROI');
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it('pressing Continue when disabled does not call router.push', () => {
    // button is disabled — onPress is suppressed by Button component
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(mockPush).not.toHaveBeenCalled();
  });
});
