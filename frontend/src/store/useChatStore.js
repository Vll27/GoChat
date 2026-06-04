import { create } from "zustand";
import { axiosInstance } from "../lib/axios";
import toast from "react-hot-toast";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  allContacts: [],
  chats: [],
  messages: [],
  activeTab: "chats",
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  isSoundEnabled: JSON.parse(localStorage.getItem("isSoundEnabled")) !== false,
  isWindowFocused: true,
  refreshInterval: null,

  toggleSound: () => {
    const newValue = !get().isSoundEnabled;
    localStorage.setItem("isSoundEnabled", newValue);
    set({ isSoundEnabled: newValue });
    toast.success(newValue ? "Sonidos activados 🔊" : "Sonidos desactivados 🔇");
  },

  setWindowFocus: (focused) => set({ isWindowFocused: focused }),

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedUser: (selectedUser) => set({ selectedUser }),

  getAllContacts: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/contacts");
      set({ allContacts: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },
  
  getMyChatPartners: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/chats");
      set({ chats: res.data });
      console.log("📊 Chats actualizados con lastSeen:", res.data.map(c => ({
        nombre: c.user?.fullName,
        lastSeen: c.user?.lastSeen,
        status: c.user?.lastSeenStatus
      })));
      
      // 👈 FORZAR ACTUALIZACIÓN DEL SELECTED USER
      const { selectedUser } = get();
      if (selectedUser) {
        const updatedUser = res.data.find(c => c.user._id === selectedUser._id)?.user;
        if (updatedUser && updatedUser.lastSeenStatus !== selectedUser.lastSeenStatus) {
          console.log(`🔄 Forzando actualización de selectedUser: ${updatedUser.fullName} -> ${updatedUser.lastSeenStatus}`);
          set({ selectedUser: updatedUser });
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Error al cargar chats");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  // 👈 NUEVA FUNCIÓN: Forzar actualización inmediata
  forceRefreshChats: async () => {
    console.log("🔄 Forzando actualización inmediata de chats...");
    await get().getMyChatPartners();
  },

  getMessagesByUserId: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Something went wrong");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  updateChatLastMessage: (newMessage, isFromCurrentUser = false) => {
    const { chats, selectedUser } = get();
    
    const updatedChats = chats.map(chat => {
      const targetUserId = isFromCurrentUser ? newMessage.receiverId : newMessage.senderId;
      const isChatForThisMessage = chat.user._id === targetUserId;
      
      if (isChatForThisMessage) {
        return {
          ...chat,
          lastMessage: newMessage,
          unreadCount: (isFromCurrentUser || selectedUser?._id === targetUserId) 
            ? 0 
            : (chat.unreadCount || 0) + 1
        };
      }
      return chat;
    });

    const chatToMoveIndex = updatedChats.findIndex(chat => 
      chat.user._id === (isFromCurrentUser ? newMessage.receiverId : newMessage.senderId)
    );
    
    if (chatToMoveIndex > -1) {
      const [chatToMove] = updatedChats.splice(chatToMoveIndex, 1);
      updatedChats.unshift(chatToMove);
    }

    set({ chats: updatedChats });
  },

  markMessagesAsRead: (userId) => {
    const { chats } = get();
    const updatedChats = chats.map(chat => {
      if (chat.user._id === userId) {
        return {
          ...chat,
          unreadCount: 0
        };
      }
      return chat;
    });
    set({ chats: updatedChats });
  },

  playNotificationSound: () => {
    const { isSoundEnabled, isWindowFocused } = get();
    
    if (!isSoundEnabled) return;
    if (isWindowFocused) return;

    try {
      const notificationSound = new Audio("/sounds/notification.mp3");
      notificationSound.currentTime = 0;
      notificationSound.volume = 0.6;
      
      const playPromise = notificationSound.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => console.log("Error al reproducir sonido:", error));
      }
    } catch (error) {
      console.log("Error al cargar el sonido:", error);
    }
  },

  sendMessage: async (messageData, payloadForServer) => {
    const { selectedUser, messages, updateChatLastMessage } = get();
    const { authUser } = useAuthStore.getState();

    if (!selectedUser) {
      toast.error("No user selected");
      return;
    }

    const tempId = `temp-${Date.now()}`;

    const optimisticMessage = {
      _id: tempId,
      senderId: authUser._id,
      receiverId: selectedUser._id,
      text: messageData.text,
      image: messageData.image,
      mediaType: messageData.mediaType,
      createdAt: new Date().toISOString(),
      isOptimistic: true,
    };

    set({ messages: [...messages, optimisticMessage] });
    updateChatLastMessage(optimisticMessage, true);

    try {
      // Si payloadForServer es FormData, dejar que axios establezca los headers
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, payloadForServer ?? messageData);
      
      const finalMessages = messages.filter(msg => msg._id !== tempId).concat(res.data);
      set({ messages: finalMessages });
      updateChatLastMessage(res.data, true);

    } catch (error) {
      const originalMessages = messages.filter(msg => msg._id !== tempId);
      set({ messages: originalMessages });
      get().forceRefreshChats();
      toast.error(error.response?.data?.message || "Algo salió mal");
    }
  },

  refreshMessages: async () => {
    const { selectedUser } = get();
    if (selectedUser) {
      await get().getMessagesByUserId(selectedUser._id);
    }
  },

  subscribeToMessages: () => {
    const { selectedUser, updateChatLastMessage, markMessagesAsRead, playNotificationSound, forceRefreshChats } = get();
    const socket = useAuthStore.getState().socket;

    if (!socket) return;

    console.log("🔔 Suscribiéndose a mensajes en tiempo real...");

    socket.off("newMessage");
    socket.off("messageNotification");
    socket.off("chatsUpdated");
    socket.off("userStatusChanged");

    socket.on("newMessage", (newMessage) => {
      const { authUser } = useAuthStore.getState();
      const isMessageFromSelectedUser = selectedUser?._id === newMessage.senderId;
      
      updateChatLastMessage(newMessage, false);

      if (isMessageFromSelectedUser) {
        const currentMessages = get().messages;
        const messageExists = currentMessages.some(msg => msg._id === newMessage._id);
        if (!messageExists) {
          set({ messages: [...currentMessages, newMessage] });
          markMessagesAsRead(selectedUser._id);
        }
      }
    });

    socket.on("messageNotification", (notificationData) => {
      const { authUser } = useAuthStore.getState();
      const { message, senderName } = notificationData;
      const isMessageFromMe = message.senderId === authUser._id;
      
      if (!isMessageFromMe) {
        playNotificationSound();
        
        if ("Notification" in window && Notification.permission === "granted") {
          try {
            new Notification(`Nuevo mensaje de ${senderName}`, {
              body: message.text || "📷 Imagen",
              icon: "/avatar.png",
              tag: "gochat-message",
              silent: true
            });
          } catch (error) {
            console.log("Error al mostrar notificación:", error);
          }
        }
      }
    });

    socket.on("chatsUpdated", () => {
      console.log("🔄 chatsUpdated recibido - Recargando lista de chats...");
      forceRefreshChats();
    });

    socket.on("userStatusChanged", ({ userId, status, lastSeen }) => {
      console.log(`📱 ChatStore recibió cambio de estado: ${userId} -> ${status}`);
      
      const { chats, selectedUser } = get();
      
      const updatedChats = chats.map(chat => {
        if (chat.user._id === userId) {
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
      
      set({ chats: updatedChats });
      
      if (selectedUser?._id === userId) {
        set({
          selectedUser: {
            ...selectedUser,
            lastSeenStatus: status,
            lastSeen: lastSeen
          }
        });
      }
      
      // 👈 FORZAR RECARGA COMPLETA PARA ASEGURAR
      setTimeout(() => {
        forceRefreshChats();
      }, 500);
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) {
      console.log("🔌 Desuscribiéndose de mensajes...");
      socket.off("newMessage");
      socket.off("messageNotification");
      socket.off("chatsUpdated");
      socket.off("userStatusChanged");
    }
  },
}));