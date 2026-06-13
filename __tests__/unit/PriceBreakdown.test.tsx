/**
 * __tests__/unit/PriceBreakdown.test.tsx
 * Block 4E — passenger price headline + tappable breakdown.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return { Ionicons: (p: { name: string }) => <View testID={`icon-${p.name}`} /> };
});

import { PriceBreakdown } from '../../components/PriceBreakdown';
import { TEST_PRICING_RATES as RATES } from '../fixtures/pricingRates';

describe('PriceBreakdown', () => {
  it('shows the single headline passenger total (driver 30 → passenger 35)', () => {
    render(<PriceBreakdown driverSeatPrice={30} currency="EUR" rates={RATES} />);
    expect(screen.getByTestId('price-breakdown-total')).toHaveTextContent('€35.00');
  });

  it('hides the breakdown until tapped', () => {
    render(<PriceBreakdown driverSeatPrice={30} currency="EUR" rates={RATES} />);
    expect(screen.queryByTestId('price-breakdown-details')).toBeNull();
  });

  it('discloses base fare + service charge + booking fee that sum to the headline', () => {
    render(<PriceBreakdown driverSeatPrice={30} currency="GBP" rates={RATES} />);
    fireEvent.press(screen.getByTestId('price-breakdown-toggle'));
    expect(screen.getByTestId('price-breakdown-details')).toBeTruthy();
    expect(screen.getByText('Base fare')).toBeTruthy();
    expect(screen.getByText('£30.00')).toBeTruthy();
    expect(screen.getByText('Service charge (10%)')).toBeTruthy();
    expect(screen.getByText('£3.00')).toBeTruthy();
    expect(screen.getByText('Booking fee')).toBeTruthy();
    expect(screen.getByText('£2.00')).toBeTruthy();
    // £35.00 appears as both the headline and the breakdown total (30 + 3 + 2)
    expect(screen.getAllByText('£35.00').length).toBeGreaterThanOrEqual(2);
  });

  it('floors the service charge to the cent (8.36 → 0.83)', () => {
    render(<PriceBreakdown driverSeatPrice={8.36} currency="EUR" rates={RATES} />);
    expect(screen.getByTestId('price-breakdown-total')).toHaveTextContent('€11.19'); // 8.36 + 0.83 + 2
  });
});
