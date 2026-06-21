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

  getProfile: async () => {
    const response = await apiClient.get("profile/");
    return response.data;
  },

  logout: () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  },
};