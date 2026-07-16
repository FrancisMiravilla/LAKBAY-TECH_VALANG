import apiClient from './api';

const pBase = import.meta.env.VITE_API_BASE_URL.replace('/auth/', '/promotions/');

export const promotionService = {
  getPromotions: async () => {
    const response = await apiClient.get('promotions/', { baseURL: pBase });
    return response.data;
  },
  approvePromotion: async (id) => {
    const response = await apiClient.post(`promotions/${id}/approve/`, {}, { baseURL: pBase });
    return response.data;
  },
  rejectPromotion: async (id, reason) => {
    const response = await apiClient.post(`promotions/${id}/reject/`, { reason }, { baseURL: pBase });
    return response.data;
  },
  getSettings: async () => {
    const response = await apiClient.get('settings/', { baseURL: pBase });
    return response.data;
  },
  updateSetting: async (key, value) => {
    const response = await apiClient.patch(`settings/${key}/`, { value }, { baseURL: pBase });
    return response.data;
  },
  createSetting: async (data) => {
    const response = await apiClient.post('settings/', data, { baseURL: pBase });
    return response.data;
  }
};
