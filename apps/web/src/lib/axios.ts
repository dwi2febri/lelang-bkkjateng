import axios from "axios";
import { env } from "@/config/env";
export const http = axios.create({
  baseURL: env.apiBaseUrl,
  withCredentials: true,
  timeout: 15000,
  headers: { "X-Requested-With": "BKKAdmin" },
});
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      typeof window !== "undefined" &&
      error.response?.status === 401 &&
      !window.location.pathname.startsWith("/login") &&
      !error.config?.url?.includes("/auth/login")
    )
      window.location.assign("/login?expired=1");
    return Promise.reject(error);
  },
);
