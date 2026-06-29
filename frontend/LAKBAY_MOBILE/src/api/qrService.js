import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Strip '/api/auth/' suffix to get the root origin
export const ORIGIN = (process.env.EXPO_PUBLIC_API_BASE_URL || '').replace(/\/api\/.*$/, '');

const qrClient = axios.create({
  baseURL: ORIGIN,
  timeout: 8000,
  headers: { 'Content-Type': 'application/json' },
});

qrClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const getSpots = () =>
  qrClient.get('/api/qr/spots/').then((r) => r.data);

export const validateQR = (qrCode) =>
  qrClient.post('/api/qr/validate/', { qr_code: qrCode }).then((r) => r.data);

export const getMyScans = () =>
  qrClient.get('/api/qr/my-scans/').then((r) => r.data);

export const getSpotTrivia = (spotId) =>
  qrClient.get(`/api/qr/spots/${spotId}/trivia/`).then((r) => r.data);

export const getAITrivia = (spotId) =>
  qrClient.get(`/api/qr/spots/${spotId}/ai-trivia/`, { timeout: 20000 }).then((r) => r.data);

export const awardSpotBadge = (spotId) =>
  qrClient.post(`/api/qr/spots/${spotId}/award-badge/`).then((r) => r.data);
