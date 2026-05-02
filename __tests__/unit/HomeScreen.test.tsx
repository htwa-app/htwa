import React from 'react';
import { Platform } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import HomeScreen, { POPULAR_ROUTES } from '../../app/home';

// ─── Smoke test ───────────────────────────────────────────────────────────────

describe('HomeScreen — smoke', () => {
  it('renders without crashing', () => {
    expect(() => render(<HomeScreen />)).not.toThrow();
  });
});

// ─── Branding ─────────────────────────────────────────────────────────────────

describe('HomeScreen — branding', () => {
  beforeEach(() => render(<HomeScreen />));

  it('displays the HTWA logo', () => {
    expect(screen.getByText('HTWA')).toBeTruthy();
  });

  it('displays the tagline', () => {
    expect(screen.getByText('Share the journey. Split the cost.')).toBeTruthy();
  });

  it('displays the legal cost-share note', () => {
    expect(
      screen.getByText('Drivers share costs only — never profit from a journey.')
    ).toBeTruthy();
  });
});

// ─── Search input ─────────────────────────────────────────────────────────────

describe('HomeScreen — search input', () => {
  it('renders the section label', () => {
    render(<HomeScreen />);
    expect(screen.getByText('Where are you going?')).toBeTruthy();
  });

  it('renders the text input with correct placeholder', () => {
    render(<HomeScreen />);
    expect(
      screen.getByPlaceholderText('City, town or university…')
    ).toBeTruthy();
  });

  it('updates destination state when user types', () => {
    render(<HomeScreen />);
    const input = screen.getByPlaceholderText('City, town or university…');
    fireEvent.changeText(input, 'Dublin');
    expect(input.props.value).toBe('Dublin');
  });

  it('clears destination when user deletes text', () => {
    render(<HomeScreen />);
    const input = screen.getByPlaceholderText('City, town or university…');
    fireEvent.changeText(input, 'Cork');
    fireEvent.changeText(input, '');
    expect(input.props.value).toBe('');
  });
});

// ─── CTAs ─────────────────────────────────────────────────────────────────────

describe('HomeScreen — CTAs', () => {
  beforeEach(() => render(<HomeScreen />));

  it('renders Find a ride button', () => {
    expect(screen.getByText('Find a ride')).toBeTruthy();
  });

  it('renders Find a ride subtitle', () => {
    expect(screen.getByText('Search available journeys')).toBeTruthy();
  });

  it('renders Offer a ride button', () => {
    expect(screen.getByText('Offer a ride')).toBeTruthy();
  });

  it('renders Offer a ride subtitle', () => {
    expect(screen.getByText('Share your journey')).toBeTruthy();
  });
});

// ─── Popular routes — component ───────────────────────────────────────────────

describe('HomeScreen — popular routes rendering', () => {
  beforeEach(() => render(<HomeScreen />));

  it('renders the Popular routes heading', () => {
    expect(screen.getByText('Popular routes')).toBeTruthy();
  });

  it('renders all route origin cities', () => {
    // Dublin appears twice (as origin AND as destination of Belfast→Dublin)
    expect(screen.getAllByText('Dublin').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Belfast')).toBeTruthy();
    expect(screen.getByText('Cork')).toBeTruthy();
  });

  it('renders all route destination cities', () => {
    expect(screen.getByText('Galway')).toBeTruthy();
    expect(screen.getByText('Limerick')).toBeTruthy();
    // Dublin appears as both origin (Belfast→Dublin) and destination label
    expect(screen.getAllByText('Dublin').length).toBeGreaterThanOrEqual(1);
  });

  it('renders all route prices', () => {
    expect(screen.getByText('from €8')).toBeTruthy();
    expect(screen.getByText('from €10')).toBeTruthy();
    expect(screen.getByText('from €6')).toBeTruthy();
  });

  it('renders exactly as many route rows as POPULAR_ROUTES entries', () => {
    const prices = screen.getAllByText(/^from €/);
    expect(prices).toHaveLength(POPULAR_ROUTES.length);
  });
});

// ─── Platform variants ────────────────────────────────────────────────────────

describe('HomeScreen — platform variants', () => {
  it('renders correctly on Android (exercises android paddingTop branch)', () => {
    const original = Platform.OS;
    Object.defineProperty(Platform, 'OS', { value: 'android', configurable: true, writable: true });
    try {
      expect(() => render(<HomeScreen />)).not.toThrow();
    } finally {
      Object.defineProperty(Platform, 'OS', { value: original, configurable: true, writable: true });
    }
  });
});

// ─── POPULAR_ROUTES data ──────────────────────────────────────────────────────

describe('POPULAR_ROUTES — data integrity', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(POPULAR_ROUTES)).toBe(true);
    expect(POPULAR_ROUTES.length).toBeGreaterThan(0);
  });

  it('every route has a unique id', () => {
    const ids = POPULAR_ROUTES.map((r) => r.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(POPULAR_ROUTES.length);
  });

  it('every route has non-empty from, to, and price fields', () => {
    POPULAR_ROUTES.forEach((route) => {
      expect(route.from.length).toBeGreaterThan(0);
      expect(route.to.length).toBeGreaterThan(0);
      expect(route.price.length).toBeGreaterThan(0);
    });
  });

  it('every route price starts with "from €"', () => {
    POPULAR_ROUTES.forEach((route) => {
      expect(route.price).toMatch(/^from €\d+/);
    });
  });

  it('no route has the same origin and destination', () => {
    POPULAR_ROUTES.forEach((route) => {
      expect(route.from).not.toBe(route.to);
    });
  });
});
