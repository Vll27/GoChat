import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

// CORREGIDO: Puerto unificado al 5001 para coincidir con el backend en desarrollo
const BASE_URL = import.meta.env.MODE === "development" ? "http://localhost:5001" : "/";

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
      // 1. Desconectar el socket inmediatamente en el cliente
      get().disconnectSocket();

      // 2. Limpiar proactivamente los estados del ChatStore
      try {
        const { useChatStore } = await import("./useChatStore");
        useChatStore.setState({ chats: [], selectedUser: null });
      } catch (e) {
        console.log("No se pudo limpiar ChatStore:", e.message);
      }

      // 3. Primero disparamos la petición al Backend para destruir la cookie
      await axiosInstance.post("/auth/logout");
      
      // 4. HASTA QUE EL BACKEND RESPONDA: Matamos el usuario localmente y tiramos el toast
      set({ authUser: null });
      toast.success("Sesión cerrada correctamente");

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

      socket.on("getOnlineUsers", (userIds) => {
        set({ onlineUsers: userIds });
        console.log("🟢 Usuarios online actualizados:", userIds);
      });
      
      // Evento para cuando un usuario se desconecta
      socket.on("userOffline", async ({ userId, lastSeen }) => {
        console.log(`🔴 Usuario OFFLINE detectado: ${userId}`);
        
        // Remover de onlineUsers inmediatamente
        set({ onlineUsers: get().onlineUsers.filter(id => id !== userId) });
        
        // CORREGIDO: Importación dinámica nativa con ES Modules (Elimina el require criminal)
        try {
          const { useChatStore } = await import("./useChatStore");
          const chatStore = useChatStore.getState();
          
          // Actualizar el estado del usuario en chats
          const updatedChats = chatStore.chats.map(chat => {
            if (chat.user?._id === userId) {
              return {
                ...chat,
                user: {
                  ...chat.user,
                  lastSeenStatus: "offline",
                  lastSeen: lastSeen
                }
              };
            }
            return chat;
          });
          
          useChatStore.setState({ chats: updatedChats });
          
          // Actualizar selectedUser si es necesario
          if (chatStore.selectedUser?._id === userId) {
            useChatStore.setState({
              selectedUser: {
                ...chatStore.selectedUser,
                lastSeenStatus: "offline",
                lastSeen: lastSeen
              }
            });
          }
          
          // Forzar recarga si existe la función
          if (chatStore.forceRefreshChats) {
            chatStore.forceRefreshChats();
          }
        } catch (e) {
          console.log("Error actualizando ChatStore desde el socket:", e.message);
        }
      });
      
      socket.on("userStatusChanged", async ({ userId, status, lastSeen }) => {
        console.log(`🔄 AuthStore: Usuario ${userId} cambió a estado: ${status}`);
        
        if (status === "online") {
          set({ onlineUsers: [...new Set([...get().onlineUsers, userId])] });
        } else {
          set({ onlineUsers: get().onlineUsers.filter(id => id !== userId) });
        }
        
        // CORREGIDO: Importación dinámica nativa con ES Modules 
        try {
          const { useChatStore } = await import("./useChatStore");
          const chatStore = useChatStore.getState();
          
          const updatedChats = chatStore.chats.map(chat => {
            if (chat.user?._id === userId) {
              return {
                ...chat,
                user: {
                  ...chat.user,
                  lastSeenStatus: status,
                  lastSeen: lastSeen
                }
              };
            }
            return chat;
          });
          
          useChatStore.setState({ chats: updatedChats });
          
          if (chatStore.selectedUser?._id === userId) {
            useChatStore.setState({
              selectedUser: {
                ...chatStore.selectedUser,
                lastSeenStatus: status,
                lastSeen: lastSeen
              }
            });
          }
          
          if (chatStore.forceRefreshChats) {
            setTimeout(() => {
              chatStore.forceRefreshChats();
            }, 50);
          }
        } catch (e) {
          console.log("Error cambiando estado en ChatStore:", e.message);
        }
      });

      try {
        const { useContactStore } = await import("./useContactStore");
        const contactStore = useContactStore.getState();
        if (contactStore.subscribeToSocket) {
          contactStore.subscribeToSocket();
        }
      } catch (e) {
        console.log("Contact store not available:", e.message);
      }
    } catch (error) {
      console.log("Socket connection failed:", error);
    }
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket?.connected) {
      socket.disconnect();
      set({ socket: null, onlineUsers: [] });
      console.log("🔌 Socket desconectado");
    }
  },
}));