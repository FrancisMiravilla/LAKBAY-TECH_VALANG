import React from 'react';
import { render } from '@testing-library/react-native';
import HomeScreen from '../HomeScreen';

// Mock the react-navigation navigation prop
const mockNavigation = {
  navigate: jest.fn(),
};

// Manually mock @rnmapbox/maps so its components render as simple View elements and expose their children
jest.mock('@rnmapbox/maps', () => {
  const React = require('react');
  const { View } = require('react-native');

  const MockMapView = ({ children, ...props }) => {
    return React.createElement(View, props, children);
  };

  const MockMarkerView = ({ children, ...props }) => {
    return React.createElement(View, props, children);
  };

  const MockCamera = ({ children }) => {
    return children ? children : null;
  };

  const mockMapbox = {
    setAccessToken: jest.fn(),
    StyleURL: {
      Dark: 'dark-style-url',
    },
    MapView: MockMapView,
    MarkerView: MockMarkerView,
    Camera: MockCamera,
  };

  return {
    __esModule: true,
    default: mockMapbox,
    ...mockMapbox,
  };
});

describe('HomeScreen Map Feature', () => {
  it('renders the Mapbox MapView and interactive markers when Mapbox is loaded', async () => {
    const { getByTestId, queryByTestId, getByText } = await render(
      <HomeScreen navigation={mockNavigation} />
    );

    // Assert that the real Mapbox map view is rendered using our testID
    expect(getByTestId('mapbox-map')).toBeTruthy();

    // Assert that the two Mapbox markers are correctly rendered on the map
    expect(getByTestId('marker-santa-cruz')).toBeTruthy();
    expect(getByTestId('marker-city-center')).toBeTruthy();

    // Assert that the markers display their correct labels
    expect(getByText('🏝️ Santa Cruz')).toBeTruthy();
    expect(getByText('🏢 City Center')).toBeTruthy();

    // Assert that the fallback grid mock map is not shown
    expect(queryByTestId('mockup-map')).toBeNull();

    // Assert that the map mock is rendered (already done above)

  });
});
