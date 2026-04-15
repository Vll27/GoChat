import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:3000" : "/";

export const useAuthStore = create((set, get) => ({
  authUser: null,
  isCheckingAuth: true,
  isSigningUp: false,
  isLoggingIn: false,
  socket: null,
  onlineUsers: [],

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/auth/check");
      set({ authUser: res.data });
      get().connectSocket();
    } catch (error) {
      console.log("Error in authCheck:", error.message);
      set({ authUser: null });
      
      // NO mostrar error para 401 (Unauthorized) - es normal cuando no hay sesión
      if (error.response?.status !== 401 && !error.message?.includes('timeout')) {
        toast.error("Authentication check failed");
      }
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/auth/signup", data);
      set({ authUser: res.data });
      toast.success("Account created successfully!");
      get().connectSocket();
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Signup failed";
      toast.error(errorMessage);
      console.log("Signup error:", error);
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/auth/login", data);
      set({ authUser: res.data });
      toast.success("Sesión iniciada correctamente");
      get().connectSocket();
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || "Login failed";
      toast.error(errorMessage);
      console.log("Login error:", error);
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout");
      set({ authUser: null });
      toast.success("Sesión cerrada correctamente");
      get().disconnectSocket();
    } catch (error) {
      toast.error("Error logging out");
      console.log("Logout error:", error);
    }
  },

  updateProfile: async (data) => {
    try {
      const res = await axiosInstance.put("/auth/update-profile", data);
      set({ authUser: res.data });
      toast.success("Profile updated successfully");
    } catch (error) {
      console.log("Error in update profile:", error);
      const errorMessage = error.response?.data?.message || "Update failed";
      toast.error(errorMessage);
    }
  },

  connectSocket: async () => {
    const { authUser } = get();
    if (!authUser || get().socket?.connected) return;

    try {
      const socket = io(BASE_URL, {
        withCredentials: true,
        timeout: 5000,
      });

      socket.connect();

      set({ socket });

      // listen for online users event
      socket.on("getOnlineUsers", (userIds) => {
        set({ onlineUsers: userIds });
      });

      // initialize contact store socket listeners (if present)
      try {
        const { useContactStore } = await import("./useContactStore");
        // ensure subscription
        useContactStore.getState().subscribeToSocket();
      } catch (e) {
        // ignore if contact store not present or fails
        console.log("Contact store not available:", e.message);
      }
    } catch (error) {
      console.log("Socket connection failed:", error);
    }
  },

  disconnectSocket: () => {
    if (get().socket?.connected) get().socket.disconnect();
  },
}));