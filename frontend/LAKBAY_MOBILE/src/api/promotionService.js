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

export const submitPromotion = async (spotName, description, imageUri, glbUri, lat, lng, isPlace = false, useCoins = false) => {
  const formData = new FormData();
  formData.append('spot_name', spotName);
  formData.append('description', description);
  formData.append('is_place', isPlace ? 'true' : 'false');
  formData.append('use_coins', useCoins ? 'true' : 'false');

  if (lat !== undefined && lng !== undefined) {
    formData.append('latitude', lat);
    formData.append('longitude', lng);
  }

  if (imageUri) {
    const filename = imageUri.split('/').pop() || 'photo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image/jpeg`;
    formData.append('image_file', { uri: imageUri, name: filename, type });
  }

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

export const publishPromotion = async (id) => {
  const response = await apiClient.post(`promotions/${id}/publish/`, {}, { baseURL: pBase });
  return response.data;
};

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
