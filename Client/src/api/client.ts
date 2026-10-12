import axios from "axios";

export const API_BASE_URL = "http://localhost:5000/api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(
  (config) => {
    // Use tab-isolated sessionStorage so Admin and Customer accounts can run in separate tabs simultaneously
    const token = sessionStorage.getItem("rh_token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't auto-redirect on login attempt failures
      if (!error.config.url.includes("/auth/login") && !error.config.url.includes("/auth/register")) {
        sessionStorage.removeItem("rh_token");
        sessionStorage.removeItem("rh_user");
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
