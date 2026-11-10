import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Strip '/api/auth/' suffix to get the root origin
export const ORIGIN = (process.env.EXPO_PUBLIC_API_BASE_URL || '').replace(/\/api\/.*$/, '');

const qrClient = axios.create({
  baseURL: ORIGIN,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

qrClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const getSpots = () =>
  qrClient.get('/api/qr/spots/').then((r) => r.data);

export const getCatchIcons = () =>
  qrClient.get('/api/qr/catch-icons/').then((r) => r.data);

export const getIconTrivia = (iconId) =>
  qrClient.get(`/api/qr/catch-icons/${iconId}/trivia/`).then((r) => r.data);

export const validateQR = (qrCode) =>
  qrClient.post('/api/qr/validate/', { qr_code: qrCode }).then((r) => r.data);

export const getMyScans = () =>
  qrClient.get('/api/qr/my-scans/').then((r) => r.data);

export const getSpotTrivia = (spotId) =>
  qrClient.get(`/api/qr/spots/${spotId}/trivia/`).then((r) => r.data);



export const awardSpotBadge = (spotId) =>
  qrClient.post(`/api/qr/spots/${spotId}/award-badge/`).then((r) => r.data);

export const getARTargets = () =>
  qrClient.get('/api/qr/ar-targets/').then((r) => r.data);

export const getMilestones = () =>
  qrClient.get('/api/qr/milestones/').then((r) => r.data);

export const logActivity = (activityType, title) =>
  qrClient.post('/api/qr/log-activity/', { activity_type: activityType, title }).then((r) => r.data).catch(() => null);


// ── AR / Catch collections ──────────────────────────────────────────────────
// The phone keeps a copy in SecureStore ('collected_models', 'caught_icons'),
// which is wiped on logout, session expiry and reinstall. The server rebuilds
// each user's collection from their activity log, so merge it back in.
export const getMyCollection = () =>
  qrClient.get('/api/qr/my-collection/').then((r) => r.data);

const sameItem = (a, b) =>
  String(a.id) === String(b.id) ||
  (!!a.name && !!b.name && a.name.toLowerCase() === b.name.toLowerCase());

const mergeItems = (local, remote) => {
  const merged = [...local];
  remote.forEach((r) => { if (!merged.some((l) => sameItem(l, r))) merged.push(r); });
  return merged;
};

const readList = async (key, uidKey, uid) => {
  try {
    const [str, storedUid] = await Promise.all([SecureStore.getItemAsync(key), SecureStore.getItemAsync(uidKey)]);
    if (storedUid && storedUid !== uid) return [];
    const arr = str ? JSON.parse(str) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

let syncPromise = null;
export const syncCollections = () => {
  if (syncPromise) return syncPromise;
  syncPromise = (async () => {
    try {
      const [profile, remote] = await Promise.all([
        qrClient.get('/api/auth/profile/').then((r) => r.data),
        getMyCollection(),
      ]);
      const uid = String(profile?.id || '');
      if (!uid) return;
      const localAr = await readList('collected_models', 'collected_models_uid', uid);
      const localCatch = await readList('caught_icons', 'caught_icons_uid', uid);
      const ar = mergeItems(localAr, remote?.ar || []);
      const caught = mergeItems(localCatch, remote?.catch || []);
      await SecureStore.setItemAsync('collected_models', JSON.stringify(ar));
      await SecureStore.setItemAsync('collected_models_uid', uid);
      await SecureStore.setItemAsync('caught_icons', JSON.stringify(caught));
      await SecureStore.setItemAsync('caught_icons_uid', uid);
    } catch {
      // Offline or server error: keep whatever the phone already has.
    } finally {
      syncPromise = null;
    }
  })();
  return syncPromise;
};
