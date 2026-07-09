import apiClient from './api';
import * as SecureStore from 'expo-secure-store';

export const authService = {
  register: async (email, password, { firstName, lastName, middleInitial = '' }, inGameName, chosenCharacter, location) => {
    try {
      const response = await apiClient.post('register/', {
        email,
        password,
        re_password : password,
        first_name: firstName,
        last_name: lastName,
        middle_initial: middleInitial,
        in_game_name: inGameName,
        chosen_character: chosenCharacter,
        location,
      });
      
      const loginResponse = await apiClient.post('login/', { email, password });
      if (loginResponse.data.access) {
        await SecureStore.setItemAsync('accessToken', loginResponse.data.access);
        await SecureStore.setItemAsync('refreshToken', loginResponse.data.refresh);
      }
      return loginResponse.data;
    } catch (error) {
      console.log('Register error:', JSON.stringify(error.response?.data, null, 2));
      throw error.response?.data || error;
    }
},

  login: async (email, password) => {
    try {
      const response = await apiClient.post('login/', { email, password });
      if (response.data.access) {
        await SecureStore.setItemAsync('accessToken', response.data.access);
        await SecureStore.setItemAsync('refreshToken', response.data.refresh);
      }
      return response.data;
    } catch (error) {
  console.log("FULL ERROR");
  console.log("Status:", error.response?.status);
  console.log("Data:", error.response?.data);
  console.log("Message:", error.message);

  throw error;
}
  },

  getProfile: async () => {
    try {
      const response = await apiClient.get('profile/');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  updateProfile: async (data) => {
    try {
      const response = await apiClient.patch('profile/', data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  logout: async () => {
    try {
      await SecureStore.deleteItemAsync('accessToken');
      await SecureStore.deleteItemAsync('refreshToken');
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  characterSetup: async (chosenCharacter, inGameName) => {
    try {
      const response = await apiClient.patch('character-setup/', {
        chosen_character: chosenCharacter,
        in_game_name: inGameName,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  testAuth: async () => {
    try {
      const response = await apiClient.get('test-auth/');
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  googleLogin: async (idToken) => {
    try {
      const response = await apiClient.post('google/', {
        id_token: idToken,
      });
      if (response.data.access) {
        await SecureStore.setItemAsync('accessToken', response.data.access);
        await SecureStore.setItemAsync('refreshToken', response.data.refresh);
      }
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

