import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import HomeScreen from '../HomeScreen';

const mockNavigation = { navigate: jest.fn() };

jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    WebView: ({ testID, ...props }) =>
      React.createElement(View, { testID: testID ?? 'leaflet-mini-map', ...props }),
  };
});

beforeEach(() => jest.clearAllMocks());

describe('HomeScreen Map Feature', () => {
  it('renders the Leaflet WebView mini-map', () => {
    const { getByTestId } = render(<HomeScreen navigation={mockNavigation} />);
    expect(getByTestId('leaflet-mini-map')).toBeTruthy();
  });

  it('shows the tap-to-explore overlay', () => {
    const { getByText } = render(<HomeScreen navigation={mockNavigation} />);
    expect(getByText('Tap to Explore Interactive Map')).toBeTruthy();
  });

  it('navigates to Map screen when overlay is pressed', () => {
    const { getByText } = render(<HomeScreen navigation={mockNavigation} />);
    fireEvent.press(getByText('Tap to Explore Interactive Map'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Map');
  });
});
