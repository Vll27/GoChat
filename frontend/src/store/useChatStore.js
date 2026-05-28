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
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
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
    
    console.log(" Verificando condiciones para sonido:", { 
      isSoundEnabled, 
      isWindowFocused,
      shouldPlay: !isWindowFocused && isSoundEnabled
    });
    
    if (!isSoundEnabled) {
      console.log(" Sonido no reproducido: Sonidos desactivados en configuración");
      return;
    }
    
    if (isWindowFocused) {
      console.log(" Sonido no reproducido: Ventana está en foco");
      return;
    }

    try {
      const notificationSound = new Audio("/sounds/notification.mp3");
      notificationSound.currentTime = 0;
      notificationSound.volume = 0.6;
      
      console.log("🎵 Reproduciendo sonido de notificación...");
      
      const playPromise = notificationSound.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log(" Sonido reproducido exitosamente");
          })
          .catch(error => {
            console.log(" Error al reproducir sonido:", error);
          });
      }
    } catch (error) {
      console.log(" Error al cargar el sonido:", error);
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
      get().getMyChatPartners();
      toast.error(error.response?.data?.message || "Algo salió mal");
    }
  },

  refreshMessages: async () => {
    const { selectedUser } = get();
    if (selectedUser) {
      await get().getMessagesByUserId(selectedUser._id);
    }
  },

  // Suscripción a mensajes en tiempo real
  subscribeToMessages: () => {
    const { selectedUser, updateChatLastMessage, markMessagesAsRead, playNotificationSound, getMyChatPartners } = get();
    const socket = useAuthStore.getState().socket;

    if (!socket) {
      console.log(" No hay socket disponible para suscribirse a mensajes");
      return;
    }

    console.log(" Suscribiéndose a mensajes en tiempo real...");

    // Limpiar listeners anteriores
    socket.off("newMessage");
    socket.off("messageNotification");
    socket.off("chatsUpdated");

    //  Listener para nuevos mensajes (actualización de UI)
    socket.on("newMessage", (newMessage) => {
      const { authUser } = useAuthStore.getState();
      const isMessageFromSelectedUser = selectedUser?._id === newMessage.senderId;
      const isMessageFromMe = newMessage.senderId === authUser._id;
      
      console.log(" Nuevo mensaje recibido en tiempo real:", {
        from: newMessage.senderId,
        to: newMessage.receiverId,
        isFromMe: isMessageFromMe,
        isFromSelectedUser: isMessageFromSelectedUser,
        selectedUser: selectedUser?._id,
        text: newMessage.text
      });
      
      //  SIEMPRE actualizar la lista de chats
      updateChatLastMessage(newMessage, false);

      //  Si el mensaje es del usuario seleccionado, agregarlo al chat actual
      if (isMessageFromSelectedUser) {
        const currentMessages = get().messages;
        
        // Evitar duplicados
        const messageExists = currentMessages.some(msg => msg._id === newMessage._id);
        if (!messageExists) {
          console.log(" Agregando mensaje al chat actual:", newMessage.text);
          set({ messages: [...currentMessages, newMessage] });
          markMessagesAsRead(selectedUser._id);
        } else {
          console.log(" Mensaje duplicado, ignorando...");
        }
      } else {
        console.log("ℹ Mensaje de otro chat, solo actualizando lista");
      }
    });

    // Listener para notificaciones de sonido
    socket.on("messageNotification", (notificationData) => {
      const { authUser } = useAuthStore.getState();
      const { message, senderName } = notificationData;
      const isMessageFromMe = message.senderId === authUser._id;
      
      console.log(" Notificación de mensaje recibida:", {
        from: senderName,
        isFromMe: isMessageFromMe,
        selectedUser: selectedUser?._id,
        messageFrom: message.senderId
      });
      
      const shouldPlaySound = !isMessageFromMe;
      
      console.log(" Condición de sonido:", {
        isFromMe: isMessageFromMe,
        shouldPlaySound
      });
      
      if (shouldPlaySound) {
        console.log(" Condición CUMPLIDA - Reproduciendo sonido");
        playNotificationSound();
        
        if ("Notification" in window && Notification.permission === "granted") {
          try {
            new Notification(`Nuevo mensaje de ${senderName}`, {
              body: message.text || " Imagen",
              icon: "/avatar.png",
              tag: "gochat-message",
              silent: true
            });
          } catch (error) {
            console.log(" Error al mostrar notificación:", error);
          }
        }
      } else {
        console.log(" Sonido no reproducido: Es mensaje propio");
      }
    });

    // Listener para actualizaciones de la lista de chats
    socket.on("chatsUpdated", () => {
      console.log(" chatsUpdated recibido - Actualizando lista de chats...");
      getMyChatPartners();
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) {
      console.log("🔌 Desuscribiéndose de mensajes...");
      socket.off("newMessage");
      socket.off("messageNotification");
      socket.off("chatsUpdated");
    }
  },
}));