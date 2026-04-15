import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore";

export const useContactStore = create((set, get) => ({
  requests: [],
  unreadCount: 0,
  _subscribed: false, // ← NUEVO: estado para controlar suscripción

  fetchRequests: async () => {
    try {
      const res = await axiosInstance.get("/contacts/requests");
      set({ requests: res.data, unreadCount: res.data.length });
    } catch (error) {
      console.log("Error fetching contact requests:", error);
    }
  },

  sendRequest: async (targetUserId) => {
    try {
      await axiosInstance.post("/contacts/send", { targetUserId });
      toast.success("Solicitud de contacto enviada");
      // optimistic: no change to local requests list
      // server will emit contact_request to recipient
    } catch (error) {
      const msg = error.response?.data?.message || "Failed to send request";
      toast.error(msg);
    }
  },

  acceptRequest: async (requesterId) => {
    try {
      await axiosInstance.post("/contacts/accept", { requesterId });
      toast.success("Solicitud de contacto aceptada");
      // refresh
      get().fetchRequests();
    } catch (error) {
      console.log("Error accepting request:", error);
      toast.error("Failed to accept request");
    }
  },

  rejectRequest: async (requesterId) => {
    try {
      await axiosInstance.post("/contacts/reject", { requesterId });
      toast.success("Solicitud de contacto rechazada");
      get().fetchRequests();
    } catch (error) {
      console.log("Error rejecting request:", error);
      toast.error("Failed to reject request");
    }
  },

  // subscribe to socket events
  subscribeToSocket: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;

    // CORREGIDO: evitar double-binding - lógica correcta
    if (get()._subscribed) return; // ← Si YA está subscribed, salir
    set({ _subscribed: true }); // ← LUEGO marcar como subscribed

    socket.on("contact_request", (payload) => {
      // payload.from
      const current = get().requests || [];
      set({ 
        requests: [payload.from, ...current], 
        unreadCount: (get().unreadCount || 0) + 1 
      });
      toast.success(`${payload.from.fullName} sent you a contact request`);
    });

    socket.on("request_accepted", (payload) => {
      toast.success(`${payload.to.fullName} accepted your request`);
      // update UI as necessary
    });

    socket.on("request_rejected", (payload) => {
      toast(`${payload.from.fullName} rejected your contact request`);
    });

    socket.on("update_requests", () => {
      get().fetchRequests();
    });

    // initial fetch
    get().fetchRequests();
  },

  markAllRead: () => set({ unreadCount: 0 }),
}));