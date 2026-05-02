import React from 'react';
import { Platform } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import HomeScreen, { POPULAR_ROUTES } from '../../app/home';

// ─── Smoke ────────────────────────────────────────────────────────────────────

describe('HomeScreen — smoke', () => {
  it('renders without crashing', () => {
    expect(() => render(<HomeScreen />)).not.toThrow();
  });
});

// ─── Branding ─────────────────────────────────────────────────────────────────

describe('HomeScreen — branding', () => {
  beforeEach(() => render(<HomeScreen />));

  it('displays the greeting header', () => {
    expect(screen.getByText('Hey Jordan 👋')).toBeTruthy();
  });

  it('displays the legal cost-share note', () => {
    expect(
      screen.getByText('Drivers share costs only — never profit from a journey.')
    ).toBeTruthy();
  });
});

// ─── Toggle tabs ──────────────────────────────────────────────────────────────

describe('HomeScreen — toggle tabs', () => {
  beforeEach(() => render(<HomeScreen />));

  it('renders the Find a ride tab', () => {
    expect(screen.getByText('Find a ride')).toBeTruthy();
  });

  it('renders the Offer a ride tab', () => {
    expect(screen.getByText('Offer a ride')).toBeTruthy();
  });

  it('"Find a ride" tab is selected by default', () => {
    const tab = screen.getByRole('tab', { name: 'Find a ride' });
    expect(tab.props.accessibilityState?.selected).toBe(true);
  });

  it('tapping "Offer a ride" tab selects it', () => {
    fireEvent.press(screen.getByText('Offer a ride'));
    const offerTab = screen.getByRole('tab', { name: 'Offer a ride' });
    expect(offerTab.props.accessibilityState?.selected).toBe(true);
  });
});

// ─── Route inputs ─────────────────────────────────────────────────────────────

describe('HomeScreen — route inputs', () => {
  it('renders the "To" input with correct placeholder', () => {
    render(<HomeScreen />);
    expect(
      screen.getByPlaceholderText('City, town or university…')
    ).toBeTruthy();
  });

  it('renders the "From" input', () => {
    render(<HomeScreen />);
    expect(
      screen.getByPlaceholderText('From — city, town or university')
    ).toBeTruthy();
  });

  it('updates "to" state when user types into the destination field', () => {
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

  it('swap button swaps origin and destination values', () => {
    render(<HomeScreen />);
    const fromInput = screen.getByPlaceholderText('From — city, town or university');
    const toInput   = screen.getByPlaceholderText('City, town or university…');

    fireEvent.changeText(fromInput, 'Dublin');
    fireEvent.changeText(toInput, 'Galway');
    fireEvent.press(screen.getByRole('button', { name: 'Swap origin and destination' }));

    expect(fromInput.props.value).toBe('Galway');
    expect(toInput.props.value).toBe('Dublin');
  });
});

// ─── Filter chips ─────────────────────────────────────────────────────────────

describe('HomeScreen — filter chips', () => {
  beforeEach(() => render(<HomeScreen />));

  it('renders the Today chip', () => {
    expect(screen.getByText('Today')).toBeTruthy();
  });

  it('renders the Any time chip', () => {
    expect(screen.getByText('Any time')).toBeTruthy();
  });

  it('renders the 1+ seats chip', () => {
    expect(screen.getByText('1+ seats')).toBeTruthy();
  });
});

// ─── Search CTA ───────────────────────────────────────────────────────────────

describe('HomeScreen — search CTA', () => {
  it('renders the Search rides button', () => {
    render(<HomeScreen />);
    expect(screen.getByRole('button', { name: 'Search rides' })).toBeTruthy();
  });
});

// ─── Safety section ───────────────────────────────────────────────────────────

describe('HomeScreen — safety section', () => {
  beforeEach(() => render(<HomeScreen />));

  it('renders the "Built with you in mind" heading', () => {
    expect(screen.getByText('Built with you in mind')).toBeTruthy();
  });

  it('renders the Safety hub link', () => {
    expect(screen.getByRole('link', { name: 'Safety hub' })).toBeTruthy();
  });

  it('renders the Share my journey card', () => {
    expect(screen.getByText('Share my journey')).toBeTruthy();
  });

  it('renders the Women-only mode card', () => {
    expect(screen.getByText('Women-only mode')).toBeTruthy();
  });

  it('renders the Verified IDs card', () => {
    expect(screen.getByText('Verified IDs')).toBeTruthy();
  });

  it('renders the In-app SOS card', () => {
    expect(screen.getByText('In-app SOS')).toBeTruthy();
  });
});

// ─── Upcoming routes ──────────────────────────────────────────────────────────

describe('HomeScreen — upcoming routes', () => {
  beforeEach(() => render(<HomeScreen />));

  it('renders the "Upcoming for you" heading', () => {
    expect(screen.getByText('Upcoming for you')).toBeTruthy();
  });

  it('renders all route origin cities', () => {
    expect(screen.getAllByText('Dublin').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Belfast')).toBeTruthy();
    expect(screen.getByText('Cork')).toBeTruthy();
  });

  it('renders all route destination cities', () => {
    expect(screen.getByText('Galway')).toBeTruthy();
    expect(screen.getByText('Limerick')).toBeTruthy();
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
