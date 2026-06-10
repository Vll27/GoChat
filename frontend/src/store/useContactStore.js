import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore";

export const useContactStore = create((set, get) => ({
  requests: [],
  unreadCount: 0,
  _subscribed: false,

  // Resetear todo el estado de contactos
  resetContactState: () => {
    console.log("🔄 Reseteando estado de contactos...");
    
    const socket = useAuthStore.getState().socket;
    if (socket) {
      socket.off("contact_request");
      socket.off("request_accepted");
      socket.off("request_rejected");
      socket.off("update_requests");
    }
    
    set({
      requests: [],
      unreadCount: 0,
      _subscribed: false,
    });
  },

  fetchRequests: async () => {
    const { authUser } = useAuthStore.getState();
    if (!authUser) {
      console.log("⚠️ fetchRequests: Usuario no autenticado");
      return;
    }
    
    try {
      const res = await axiosInstance.get("/contacts/requests");
      set({ requests: res.data, unreadCount: res.data.length });
    } catch (error) {
      if (error.response?.status !== 401) {
        console.log("Error fetching contact requests:", error);
      }
    }
  },

  sendRequest: async (targetUserId) => {
    const { authUser } = useAuthStore.getState();
    if (!authUser) {
      console.log("⚠️ sendRequest: Usuario no autenticado");
      toast.error("Debes iniciar sesión para enviar solicitudes");
      return;
    }
    
    try {
      await axiosInstance.post("/contacts/send", { targetUserId });
      toast.success("Solicitud de contacto enviada");
    } catch (error) {
      if (error.response?.status !== 401) {
        const msg = error.response?.data?.message || "Failed to send request";
        toast.error(msg);
      }
    }
  },

  acceptRequest: async (requesterId) => {
    const { authUser } = useAuthStore.getState();
    if (!authUser) {
      console.log("⚠️ acceptRequest: Usuario no autenticado");
      return;
    }
    
    try {
      await axiosInstance.post("/contacts/accept", { requesterId });
      toast.success("Solicitud de contacto aceptada");
      get().fetchRequests();
      
      // Refrescar chats cuando se acepta una solicitud
      try {
        const { useChatStore } = await import("./useChatStore");
        if (useChatStore.getState().forceRefreshChats) {
          useChatStore.getState().forceRefreshChats();
        }
      } catch (e) {
        console.log("Error refreshing chats:", e);
      }
    } catch (error) {
      if (error.response?.status !== 401) {
        console.log("Error accepting request:", error);
        toast.error("Failed to accept request");
      }
    }
  },

  rejectRequest: async (requesterId) => {
    const { authUser } = useAuthStore.getState();
    if (!authUser) {
      console.log("⚠️ rejectRequest: Usuario no autenticado");
      return;
    }
    
    try {
      await axiosInstance.post("/contacts/reject", { requesterId });
      toast.success("Solicitud de contacto rechazada");
      get().fetchRequests();
    } catch (error) {
      if (error.response?.status !== 401) {
        console.log("Error rejecting request:", error);
        toast.error("Failed to reject request");
      }
    }
  },

  subscribeToSocket: () => {
    const socket = useAuthStore.getState().socket;
    const { authUser } = useAuthStore.getState();
    
    if (!socket || !authUser) {
      console.log("⚠️ subscribeToSocket: No hay socket o usuario no autenticado");
      return;
    }
    
    if (get()._subscribed) return;
    set({ _subscribed: true });

    console.log("🔔 ContactStore: Suscribiéndose a eventos de contactos...");

    socket.on("contact_request", (payload) => {
      const { authUser: currentAuth } = useAuthStore.getState();
      if (!currentAuth) return;
      
      const current = get().requests || [];
      set({ 
        requests: [payload.from, ...current], 
        unreadCount: (get().unreadCount || 0) + 1 
      });
      toast.success(`${payload.from.fullName} te envió una solicitud de contacto`);
    });

    socket.on("request_accepted", (payload) => {
      const { authUser: currentAuth } = useAuthStore.getState();
      if (!currentAuth) return;
      
      toast.success(`${payload.to.fullName} aceptó tu solicitud`);
      
      try {
        const { useChatStore } = require("./useChatStore");
        if (useChatStore.getState().forceRefreshChats) {
          useChatStore.getState().forceRefreshChats();
        }
      } catch (e) {
        console.log("Error refreshing chats:", e);
      }
    });

    socket.on("request_rejected", (payload) => {
      const { authUser: currentAuth } = useAuthStore.getState();
      if (!currentAuth) return;
      
      toast(`${payload.from.fullName} rechazó tu solicitud de contacto`);
    });

    socket.on("update_requests", () => {
      const { authUser: currentAuth } = useAuthStore.getState();
      if (!currentAuth) return;
      
      get().fetchRequests();
    });

    get().fetchRequests();
  },

  markAllRead: () => set({ unreadCount: 0 }),
}));