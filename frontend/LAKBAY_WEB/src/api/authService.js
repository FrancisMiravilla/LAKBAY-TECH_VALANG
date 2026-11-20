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

  updateProfile: async (data) => {
    const response = await apiClient.patch("profile/", data);
    return response.data;
  },

  changeEmail: async (currentPassword, newEmail) => {
    const response = await apiClient.post("email/change/", {
      current_password: currentPassword,
      new_email: newEmail,
    });
    return response.data;
  },

  // The backend signs out other sessions and returns a fresh token pair for this one.
  changePassword: async (currentPassword, newPassword) => {
    const response = await apiClient.post("password/change/", {
      current_password: currentPassword,
      new_password: newPassword,
    });
    if (response.data.access) localStorage.setItem("accessToken", response.data.access);
    if (response.data.refresh) localStorage.setItem("refreshToken", response.data.refresh);
    return response.data;
  },

  logout: () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  },
};