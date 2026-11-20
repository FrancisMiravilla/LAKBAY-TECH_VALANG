import apiClient from './api';

const pBase = process.env.EXPO_PUBLIC_API_BASE_URL.replace('/auth/', '/promotions/');

export const getWallet = async () => {
  const response = await apiClient.get('wallet/', { baseURL: pBase });
  return response.data;
};

export const getPublishCost = async () => {
  try {
    const response = await apiClient.get('settings/PROMOTION_PUBLISH_COST/', { baseURL: pBase });
    return response.data.value;
  } catch (e) {
    return 50; // default if not found
  }
};

export const getBundles = async () => {
  const response = await apiClient.get('bundles/', { baseURL: pBase });
  return response.data;
};

export const createCheckout = async (bundleId) => {
  const response = await apiClient.post('checkout/', { bundle_id: bundleId }, { baseURL: pBase });
  return response.data;
};

export const getPromotions = async () => {
  const response = await apiClient.get('promotions/', { baseURL: pBase });
  return response.data;
};

export const getPublishedPromotions = async () => {
  const response = await apiClient.get('published/', { baseURL: pBase });
  return response.data;
};

// Up to three photos: index 0 -> image_file (cover), 1 -> image_file2, 2 -> image_file3.
// Already-uploaded photos (http URLs) are skipped so the server keeps them.
const IMAGE_FIELDS = ['image_file', 'image_file2', 'image_file3'];
const appendImages = (formData, imageUris) => {
  const list = Array.isArray(imageUris) ? imageUris : [imageUris];
  list.slice(0, IMAGE_FIELDS.length).forEach((uri, i) => {
    if (!uri || uri.startsWith('http')) return;
    const filename = uri.split('/').pop() || `photo${i + 1}.jpg`;
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    formData.append(IMAGE_FIELDS[i], { uri, name: filename, type });
  });
};

export const submitPromotion = async (spotName, description, imageUris, glbUri, lat, lng, isPlace = false, useCoins = false) => {
  const formData = new FormData();
  formData.append('spot_name', spotName);
  formData.append('description', description);
  formData.append('is_place', isPlace ? 'true' : 'false');
  formData.append('use_coins', useCoins ? 'true' : 'false');

  if (lat !== undefined && lng !== undefined) {
    formData.append('latitude', lat);
    formData.append('longitude', lng);
  }

  appendImages(formData, imageUris);

  if (glbUri) {
    const filename = glbUri.split('/').pop() || 'model.glb';
    formData.append('model_3d_file', { uri: glbUri, name: filename, type: 'model/gltf-binary' });
  }

  const response = await apiClient.post('promotions/', formData, {
    baseURL: pBase,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const updatePromotion = async (id, { spotName, description, imageUris, glbUri, lat, lng, isPlace }) => {
  const formData = new FormData();
  if (spotName !== undefined) formData.append('spot_name', spotName);
  if (description !== undefined) formData.append('description', description);
  if (isPlace !== undefined) formData.append('is_place', isPlace ? 'true' : 'false');

  if (lat !== undefined && lng !== undefined) {
    formData.append('latitude', lat);
    formData.append('longitude', lng);
  }

  appendImages(formData, imageUris);

  if (glbUri && !glbUri.startsWith('http')) {
    const filename = glbUri.split('/').pop() || 'model.glb';
    formData.append('model_3d_file', { uri: glbUri, name: filename, type: 'model/gltf-binary' });
  }

  const response = await apiClient.patch(`promotions/${id}/`, formData, {
    baseURL: pBase,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const attach3DModel = async (id, glbUri) => {
  const formData = new FormData();
  const filename = glbUri.split('/').pop() || 'model.glb';
  formData.append('model_3d_file', { uri: glbUri, name: filename, type: 'model/gltf-binary' });

  const response = await apiClient.post(`promotions/${id}/attach_model/`, formData, {
    baseURL: pBase,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const publishPromotion = async (id) => {
  const response = await apiClient.post(`promotions/${id}/publish/`, {}, { baseURL: pBase });
  return response.data;
};

// Permanently delete one of the user's own promotions (and its ratings).
export const deletePromotion = async (id) => {
  await apiClient.delete(`promotions/${id}/`, { baseURL: pBase });
};

// Pay the publish cost again to keep a live promotion up for another month,
// or to bring back one that expired. 402 = not enough coins.
export const renewPromotion = async (id) => {
  const response = await apiClient.post(`promotions/${id}/renew/`, {}, { baseURL: pBase });
  return response.data;
};

// "Nov 26, 2026" style date for promotion expiry messages.
export const formatPromoDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';

// ── Coin Bundle QR Ph (Store Screen) ──
export const createBundleQRPh = async (bundleId) => {
  const response = await apiClient.post('create-bundle-qrph/', { bundle_id: bundleId }, { baseURL: pBase });
  return response.data;
};

export const verifyBundlePayment = async (paymentIntentId) => {
  const response = await apiClient.get(`verify-bundle-payment/${paymentIntentId}/`, { baseURL: pBase });
  return response.data;
};

export const simulateTestBundlePayment = async (paymentIntentId) => {
  const response = await apiClient.post('simulate-bundle-payment/', { payment_intent_id: paymentIntentId }, { baseURL: pBase });
  return response.data;
};

// ── Spot Promotion QR Ph (Legacy/Direct) ──
export const createPromotionQRPh = async (spotName) => {
  const response = await apiClient.post('create-qrph/', { spot_name: spotName }, { baseURL: pBase });
  return response.data;
};

export const verifyPromotionPayment = async (paymentIntentId) => {
  const response = await apiClient.get(`verify-qrph/${paymentIntentId}/`, { baseURL: pBase });
  return response.data;
};

export const simulateTestPayment = async (paymentIntentId) => {
  const response = await apiClient.post('simulate-test-payment/', { payment_intent_id: paymentIntentId }, { baseURL: pBase });
  return response.data;
};
