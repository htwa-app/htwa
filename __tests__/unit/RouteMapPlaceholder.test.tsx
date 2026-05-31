/**
 * __tests__/unit/RouteMapPlaceholder.test.tsx
 *
 * Tests for components/RouteMapPlaceholder.tsx (Maps-deferred stub).
 */

import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  return { Ionicons: (p: Record<string, unknown>) => <View testID={`icon-${p.name}`} /> };
});

import { RouteMapPlaceholder } from '../../components/RouteMapPlaceholder';

describe('RouteMapPlaceholder', () => {
  it('renders the from and to locations', () => {
    render(<RouteMapPlaceholder from="Sligo" to="Athlone" />);
    expect(screen.getByText('Sligo')).toBeTruthy();
    expect(screen.getByText('Athlone')).toBeTruthy();
  });

  it('shows the coming-soon note', () => {
    render(<RouteMapPlaceholder from="A" to="B" />);
    expect(screen.getByText('Live map coming soon')).toBeTruthy();
  });

  it('renders without crashing with a custom height', () => {
    expect(() =>
      render(<RouteMapPlaceholder from="A" to="B" height={240} testID="map" />),
    ).not.toThrow();
    expect(screen.getByTestId('map')).toBeTruthy();
  });
});
