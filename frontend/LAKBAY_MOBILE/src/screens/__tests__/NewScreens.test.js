import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ARScreen from '../ARScreen';
import CatchScreen from '../CatchScreen';
import QRScreen from '../QRScreen';
import NotificationScreen from '../NotificationScreen';

// Mock expo-camera
jest.mock('expo-camera', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    CameraView: jest.fn(({ children }) => <View testID="CameraView">{children}</View>),
    useCameraPermissions: jest.fn(() => [
      { granted: true, status: 'granted' },
      jest.fn().mockResolvedValue({ granted: true, status: 'granted' }),
    ]),
  };
});

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

// Mock global alert
global.alert = jest.fn();

describe('ARScreen', () => {
  it('renders correctly and allows simulating an AR scan', async () => {
    const { getByText } = await render(<ARScreen navigation={mockNavigation} />);
    
    expect(getByText('AUGMENTED REALITY')).toBeTruthy();
    expect(getByText('AR ACTIVE')).toBeTruthy();
    expect(getByText('CAMERA READY')).toBeTruthy();

    const simulateButton = getByText('📸 Tap to Simulate AR Scan');
    expect(simulateButton).toBeTruthy();
    
    fireEvent.press(simulateButton);
    expect(global.alert).toHaveBeenCalledWith(
      expect.stringContaining('Exhibit Detected!')
    );
  });
});

describe('CatchScreen', () => {
  it('renders progress and collection items, and allows hunting items', async () => {
    const { getByText, getAllByText } = await render(<CatchScreen navigation={mockNavigation} />);


    expect(getAllByText('Curacha').length).toBeGreaterThan(0);
    expect(getAllByText('Vinta').length).toBeGreaterThan(0);

    // Verify status badges exist
    const notCaught = getAllByText('Not caught');
    expect(notCaught.length).toBe(3); // Vinta, Lantaka, Yakan are not caught initially

    const caught = getAllByText('Caught');
    expect(caught.length).toBe(1); // Curacha is caught
  });
});

describe('QRScreen', () => {
  it('renders instructions and allows simulating a QR scan', async () => {
    const { getByText } = await render(<QRScreen navigation={mockNavigation} />);

    expect(getByText('SCAN & DISCOVER')).toBeTruthy();
    expect(getByText('QR ACTIVE')).toBeTruthy();
    expect(getByText('AUTO SCAN ON')).toBeTruthy();

    const simulateButton = getByText('🔍 Tap to Simulate QR Scan');
    expect(simulateButton).toBeTruthy();

    fireEvent.press(simulateButton);
    expect(global.alert).toHaveBeenCalledWith(
      expect.stringContaining('QR Code Scanned!')
    );
  });
});

describe('NotificationScreen', () => {
  it('renders notifications list and allows clearing all notifications', async () => {
    const { getByText, queryByText } = await render(
      <NotificationScreen navigation={mockNavigation} />
    );

    expect(getByText('Notifications')).toBeTruthy();
    expect(getByText('Catch Complete!')).toBeTruthy();
    expect(getByText('New Hotspot Nearby!')).toBeTruthy();

    const clearButton = getByText('Clear');
    expect(clearButton).toBeTruthy();

    fireEvent.press(clearButton);

    // Verify empty state is displayed after state update resolves
    await waitFor(() => {
      expect(getByText('All caught up!')).toBeTruthy();
    });
    expect(queryByText('Catch Complete!')).toBeNull();
  });
});
