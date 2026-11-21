import axios from "axios";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? "http://localhost:5000/api"
    : "https://research-hub-wp59.onrender.com/api");

/** Fired when the server rejects the stored session so the UI can sign the user out. */
export const SESSION_EXPIRED_EVENT = "rh:session-expired";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // Render free instances can take ~30-50s to wake up
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(
  (config) => {
    // Tab-isolated sessionStorage so admin and customer accounts can run in separate tabs
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
    const url: string = error.config?.url || "";
    if (error.response?.status === 401 && !url.includes("/auth/login") && !url.includes("/auth/register")) {
      sessionStorage.removeItem("rh_token");
      sessionStorage.removeItem("rh_user");
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    return Promise.reject(error);
  }
);

export default apiClient;
