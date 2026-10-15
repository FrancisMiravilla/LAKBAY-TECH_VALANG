import apiClient from "./api";

export const authService = {
  login: async (email, password) => {
    const response = await apiClient.post("login/", {
      email,
      password,
    });

    localStorage.setItem(
      "accessToken",
      response.data.access
    );

    localStorage.setItem(
      "refreshToken",
      response.data.refresh
    );

    return response.data;
  },

  warmUp: () => {
    try {
      const url = new URL("../health/", import.meta.env.VITE_API_BASE_URL);
      fetch(url, { headers: { "ngrok-skip-browser-warning": "true" } }).catch(() => {});
    } catch {
      // no base URL configured
    }
  },

  getProfile: async () => {
    const response = await apiClient.get("profile/");
    return response.data;
  },

  logout: () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  },
};