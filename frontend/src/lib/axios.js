import axios from "axios";
import { useAuthStore } from "../store/useAuthStore";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export const axiosInstance = axios.create({
  baseURL: import.meta.env.MODE === "development" ? "http://localhost:5001/api" : "/api",
  withCredentials: true, // Crucial para que se sigan enviando las cookies JWT
  timeout: 15000, // 15 segundos - balance entre feedback y operaciones largas
  baseURL: API_URL,
  withCredentials: true,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use(
  (config) => {
    console.log(`REQUEST ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error("Request error:", error);
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response) => {
    console.log(`RESPONSE ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
    return response;
  },
  (error) => {
    if (error.code === 'ERR_NETWORK') {
      console.error("Network error - Is backend running?");
      console.error("Backend URL:", API_URL);
    }
    
    if (error.response?.status === 401) {
      const { authUser, logout } = useAuthStore.getState();
      if (authUser) {
        console.log("401 detected - Logging out...");
        logout();
      }
    }
    
    if (error.response?.status === 429) {
      console.error("Too many requests - Please wait");
    }
    
    if (error.response?.status === 403 && error.response?.data?.message?.includes('CORS')) {
      console.error("CORS error - Check backend configuration");
    }
    
    return Promise.reject(error);
  }
);