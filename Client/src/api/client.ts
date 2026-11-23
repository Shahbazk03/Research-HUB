import axios from "axios";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? "http://localhost:5000/api"
    : "https://research-hub-wp59.onrender.com/api");

/** Fired when the server rejects the stored session so the UI can sign the user out. */
export const SESSION_EXPIRED_EVENT = "rh:session-expired";

/**
 * Fired with `detail` = number of requests that are taking unusually long.
 * The server sleeps when idle and needs a while to wake, so the UI can explain the wait.
 */
export const SLOW_REQUEST_EVENT = "rh:slow-requests";
const SLOW_AFTER_MS = 4000;
// File uploads and CV reading are expected to take a while; they have their own progress messages
const EXPECTED_SLOW = /\/upload|cv-extract/;
let slowRequests = 0;

const emitSlowRequests = () => window.dispatchEvent(new CustomEvent(SLOW_REQUEST_EVENT, { detail: slowRequests }));

type TrackedConfig = { __slowTimer?: number; __slow?: boolean };

const finishTracking = (config: unknown) => {
  const tracked = config as TrackedConfig | undefined;
  if (!tracked) return;
  if (tracked.__slowTimer) window.clearTimeout(tracked.__slowTimer);
  tracked.__slowTimer = undefined;
  if (tracked.__slow) {
    tracked.__slow = false;
    slowRequests = Math.max(0, slowRequests - 1);
    emitSlowRequests();
  }
};

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
    if (!EXPECTED_SLOW.test(config.url || "")) {
      const tracked = config as unknown as TrackedConfig;
      tracked.__slowTimer = window.setTimeout(() => {
        tracked.__slow = true;
        slowRequests += 1;
        emitSlowRequests();
      }, SLOW_AFTER_MS);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => {
    finishTracking(response.config);
    return response;
  },
  (error) => {
    finishTracking(error.config);
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
