import axios from 'axios';

const origin = new URL(import.meta.env.VITE_API_BASE_URL).origin;

const adminClient = axios.create({
  baseURL: origin,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

adminClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const qrService = {
  getSpots:     ()         => adminClient.get('/api/qr/spots/'),
  createSpot:   (data)     => adminClient.post('/api/qr/spots/', data),
  updateSpot:   (id, data) => adminClient.put(`/api/qr/spots/${id}/`, data),
  deleteSpot:   (id)       => adminClient.delete(`/api/qr/spots/${id}/`),

  getMarkers:   ()              => adminClient.get('/api/qr/markers/'),
  createMarker: (data)          => adminClient.post('/api/qr/markers/', data),
  updateMarker: (id, data)      => adminClient.put(`/api/qr/markers/${id}/`, data),
  toggleMarker: (id, isActive)  => adminClient.patch(`/api/qr/markers/${id}/`, { is_active: isActive }),
  deleteMarker: (id)            => adminClient.delete(`/api/qr/markers/${id}/`),

  getTriviaQuestions: (spotId)   => adminClient.get('/api/qr/trivia-questions/' + (spotId ? `?spot=${spotId}` : '')),
  createTriviaQuestion: (data)   => adminClient.post('/api/qr/trivia-questions/', data),
  updateTriviaQuestion: (id, data) => adminClient.put(`/api/qr/trivia-questions/${id}/`, data),
  deleteTriviaQuestion: (id)     => adminClient.delete(`/api/qr/trivia-questions/${id}/`),

  getUsers:           ()   => adminClient.get('/api/auth/users/'),
  toggleUserStatus:   (id) => adminClient.patch(`/api/auth/users/${id}/toggle-status/`),
};

export default qrService;
