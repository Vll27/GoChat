import { create } from 'zustand';
import { axiosInstance } from '../lib/axios';
import { useAuthStore } from './useAuthStore';
import toast from 'react-hot-toast';
import { MESSAGE_STATUS, shouldUpdateStatus } from '../utils/messageStatusUtils';

export const useChatStore = create((set, get) => ({
  selectedUser: null,
  messagesCache: {}, // { "userId1": [mensajes], "userId2": [mensajes] }
  chats: [],
  allContacts: [],
  activeTab: 'chats',
  isUsersLoading: false,
  isMessagesLoading: false,
  messageInputText: '',

  setActiveTab: (tab) => {
    set({ activeTab: tab });
    console.log(`Pestana cambiada a: ${tab}`);
  },

  getMyChatPartners: async () => {
    const { authUser } = useAuthStore.getState();
    if (!authUser) {
      console.log("No hay usuario autenticado, no se cargan chats");
      return;
    }
    
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get('/messages/chats');
      set({ chats: res.data });
      console.log(`${res.data.length} chats cargados`);
      return res.data;
    } catch (error) {
      console.error("Error loading chats:", error);
      if (error.response?.status !== 401) {
        toast.error("Error al cargar los chats");
      }
    } finally {
      set({ isUsersLoading: false });
    }
  },
  
  getAllContacts: async () => {
    const { authUser } = useAuthStore.getState();
    if (!authUser) {
      console.log("No hay usuario autenticado, no se cargan contactos");
      return;
    }
    
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get('/messages/contacts');
      set({ allContacts: res.data });
      console.log(`${res.data.length} contactos cargados`);
    } catch (error) {
      console.error("Error loading contacts:", error);
      if (error.response?.status !== 401) {
        toast.error("Error al cargar los contactos");
      }
    } finally {
      set({ isUsersLoading: false });
    }
  },
  
  // Obtener mensajes del usuario seleccionado
  getCurrentMessages: () => {
    const { selectedUser, messagesCache } = get();
    if (!selectedUser) return [];
    return messagesCache[selectedUser._id] || [];
  },
  
  getMessagesByUserId: async (userId) => {
    if (!userId) return;
    
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      
      set((state) => ({
        messagesCache: {
          ...state.messagesCache,
          [userId]: res.data
        }
      }));
      
      console.log(`${res.data.length} mensajes cargados para usuario ${userId}`);
      
      const { socket } = useAuthStore.getState();
      if (socket && socket.connected) {
        const unreadMessages = res.data.filter(
          msg => msg.senderId === userId && msg.status !== "read"
        );
        
        if (unreadMessages.length > 0) {
          console.log(`Marcando ${unreadMessages.length} mensajes como leidos en el servidor`);
          socket.emit("chat_opened", { senderId: userId });
        }
      }
    } catch (error) {
      console.error("Error loading messages:", error);
      toast.error("Error al cargar los mensajes");
    } finally {
      set({ isMessagesLoading: false });
    }
  },
  
  sendMessage: async (messageData, payload) => {
    const { selectedUser, messagesCache } = get();
    const { authUser } = useAuthStore.getState();
    
    if (!selectedUser || !authUser) {
      console.log("No se puede enviar: selectedUser o authUser null");
      return;
    }
    
    console.log("Enviando mensaje a:", selectedUser.fullName);
    
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const optimisticMessage = {
      _id: tempId,
      senderId: authUser._id,
      receiverId: selectedUser._id,
      text: messageData.text || '',
      image: messageData.image || null,
      status: MESSAGE_STATUS.SENDING,
      createdAt: new Date().toISOString(),
      isOptimistic: true
    };
    
    const currentMessages = messagesCache[selectedUser._id] || [];
    
    set((state) => ({
      messagesCache: {
        ...state.messagesCache,
        [selectedUser._id]: [...currentMessages, optimisticMessage]
      }
    }));
    
    setTimeout(() => {
      const messageEnd = document.getElementById('message-end');
      messageEnd?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    
    try {
      const res = await axiosInstance.post(
        `/messages/send/${selectedUser._id}`,
        payload,
        {
          headers: payload instanceof FormData 
            ? { 'Content-Type': 'multipart/form-data' }
            : { 'Content-Type': 'application/json' }
        }
      );
      
      set((state) => ({
        messagesCache: {
          ...state.messagesCache,
          [selectedUser._id]: state.messagesCache[selectedUser._id].map(msg =>
            msg._id === tempId ? { ...res.data, isOptimistic: false, status: MESSAGE_STATUS.SENT } : msg
          )
        }
      }));
      
      set((state) => ({
        chats: state.chats.map(chat =>
          chat.user?._id === selectedUser._id
            ? { ...chat, lastMessage: res.data }
            : chat
        )
      }));
      
      console.log(`Mensaje enviado: ${res.data._id}`);
      
    } catch (error) {
      console.error("Error sending message:", error);
      
      set((state) => ({
        messagesCache: {
          ...state.messagesCache,
          [selectedUser._id]: state.messagesCache[selectedUser._id].map(msg =>
            msg._id === tempId 
              ? { ...msg, status: "error", isOptimistic: false }
              : msg
          )
        }
      }));
      
      toast.error("Error al enviar el mensaje");
    }
  },
  
  updateMessageStatus: (messageId, newStatus) => {
    const { selectedUser, messagesCache } = get();
    if (!selectedUser) return;
    
    const currentMessages = messagesCache[selectedUser._id] || [];
    const currentMessage = currentMessages.find(msg => msg._id === messageId);
    
    if (!currentMessage) {
      console.log(`Mensaje ${messageId} no encontrado en el store`);
      return;
    }
    
    const currentStatus = currentMessage.status;
    
    if (!shouldUpdateStatus(currentStatus, newStatus)) {
      console.log(`Ignorando actualizacion ${currentStatus} -> ${newStatus} para mensaje ${messageId}`);
      return;
    }
    
    set((state) => ({
      messagesCache: {
        ...state.messagesCache,
        [selectedUser._id]: state.messagesCache[selectedUser._id].map(msg =>
          msg._id === messageId ? { ...msg, status: newStatus } : msg
        )
      }
    }));
    
    console.log(`Estado actualizado: ${messageId} -> ${newStatus}`);
  },
  
  updateMultipleMessagesStatus: (messageIds, newStatus) => {
    const { selectedUser, messagesCache } = get();
    if (!selectedUser) return;
    
    const currentMessages = messagesCache[selectedUser._id] || [];
    if (!messageIds || messageIds.length === 0) return;
    
    let updatedCount = 0;
    const updatedMessages = currentMessages.map(msg => {
      if (messageIds.includes(msg._id)) {
        const currentStatus = msg.status;
        if (shouldUpdateStatus(currentStatus, newStatus)) {
          updatedCount++;
          return { ...msg, status: newStatus };
        }
      }
      return msg;
    });
    
    if (updatedCount > 0) {
      set((state) => ({
        messagesCache: {
          ...state.messagesCache,
          [selectedUser._id]: updatedMessages
        }
      }));
      console.log(`${updatedCount} mensajes actualizados a estado ${newStatus}`);
    }
  },
  
  markMessagesAsRead: (senderId) => {
    const { selectedUser, messagesCache } = get();
    if (!selectedUser) return;
    
    const currentMessages = messagesCache[selectedUser._id] || [];
    let updatedCount = 0;
    
    const updatedMessages = currentMessages.map(msg =>
      msg.senderId === senderId && shouldUpdateStatus(msg.status, MESSAGE_STATUS.READ)
        ? { ...msg, status: MESSAGE_STATUS.READ }
        : msg
    );
    
    updatedMessages.forEach((msg, i) => {
      if (msg.status !== currentMessages[i].status) updatedCount++;
    });
    
    if (updatedCount > 0) {
      set((state) => ({
        messagesCache: {
          ...state.messagesCache,
          [selectedUser._id]: updatedMessages
        }
      }));
      console.log(`${updatedCount} mensajes de ${senderId} marcados como leidos`);
    }
  },
  
  markMessagesAsReadOnServer: async (senderId) => {
    try {
      await axiosInstance.post(`/messages/read/${senderId}`);
      console.log(`Servidor notificado: mensajes de ${senderId} leidos`);
    } catch (error) {
      console.error("Error marking messages as read on server:", error);
    }
  },
  
  addMessageToCache: (message) => {
    const { selectedUser, messagesCache } = get();
    const { authUser } = useAuthStore.getState();
    
    // Determinar a que chat pertenece el mensaje
    const chatUserId = message.senderId === authUser?._id ? message.receiverId : message.senderId;
    
    if (!chatUserId) return;
    
    const currentMessages = messagesCache[chatUserId] || [];
    const exists = currentMessages.some(m => m._id === message._id);
    
    if (!exists) {
      set((state) => ({
        messagesCache: {
          ...state.messagesCache,
          [chatUserId]: [...(state.messagesCache[chatUserId] || []), message]
        }
      }));
      console.log(`Mensaje agregado al cache para chat ${chatUserId}: ${message._id}`);
    }
  },
  
  subscribeToMessages: () => {
    const { socket } = useAuthStore.getState();
    if (!socket) {
      console.log("No hay socket disponible para suscribir");
      return;
    }
    
    console.log("Configurando suscripcion a eventos de mensajes...");
    
    socket.off("newMessage");
    socket.off("message_status_updated");
    socket.off("message_delivered_ack");
    socket.off("chat_marked_read");
    socket.off("pending_messages_batch");
    
    socket.on("newMessage", (newMessage) => {
      console.log("NUEVO MENSAJE RECIBIDO");
      console.log("Mensaje:", newMessage);
      
      const { selectedUser, messagesCache, chats } = get();
      const { authUser } = useAuthStore.getState();
      
      const isForMe = newMessage.receiverId === authUser?._id;
      
      if (!isForMe) {
        console.log("Mensaje no es para mi, ignorando");
        return;
      }
      
      const chatUserId = newMessage.senderId;
      const chatMessages = messagesCache[chatUserId] || [];
      const exists = chatMessages.some(m => m._id === newMessage._id);
      
      if (exists) {
        console.log("Mensaje duplicado, omitiendo");
        return;
      }
      
      const isChatOpen = (selectedUser && newMessage.senderId === selectedUser._id);
      console.log(`Chat con emisor esta abierto: ${isChatOpen}`);
      
      console.log(`Enviando ACK para mensaje ${newMessage._id}`);
      socket.emit("message_received_ack", { messageId: newMessage._id });
      
      set((state) => ({
        messagesCache: {
          ...state.messagesCache,
          [chatUserId]: [...(state.messagesCache[chatUserId] || []), newMessage]
        }
      }));
      
      const chatIndex = chats.findIndex(chat => chat.user?._id === newMessage.senderId);
      
      if (chatIndex !== -1) {
        const updatedChats = [...chats];
        const currentUnreadCount = updatedChats[chatIndex].unreadCount || 0;
        const newUnreadCount = isChatOpen ? currentUnreadCount : currentUnreadCount + 1;
        
        updatedChats[chatIndex] = {
          ...updatedChats[chatIndex],
          lastMessage: newMessage,
          unreadCount: newUnreadCount,
          updatedAt: new Date()
        };
        set({ chats: updatedChats });
      } else {
        get().getMyChatPartners();
      }
      
      if (isChatOpen) {
        setTimeout(() => {
          console.log(`Enviando READ para mensaje ${newMessage._id}`);
          socket.emit("message_read", { messageId: newMessage._id });
        }, 500);
        
        setTimeout(() => {
          const messageEnd = document.getElementById('message-end');
          if (messageEnd) {
            messageEnd.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      } else {
        const senderName = newMessage.sender?.fullName || "Alguien";
        toast.success(`${senderName} te envio un mensaje`, {
          duration: 3000,
        });
      }
    });
    
    socket.on("message_delivered_ack", (data) => {
      console.log("Evento message_delivered_ack RECIBIDO");
      console.log("Data:", data);
      
      const { messageIds, receiverId } = data;
      
      if (Array.isArray(messageIds) && messageIds.length > 0) {
        get().updateMultipleMessagesStatus(messageIds, MESSAGE_STATUS.DELIVERED);
      } else if (messageIds && typeof messageIds === 'string') {
        get().updateMessageStatus(messageIds, MESSAGE_STATUS.DELIVERED);
      } else {
        const { selectedUser } = get();
        if (selectedUser) {
          get().getMessagesByUserId(selectedUser._id);
        }
      }
    });
    
    socket.on("message_status_updated", ({ messageId, status }) => {
      console.log(`Evento message_status_updated: ${messageId} -> ${status}`);
      get().updateMessageStatus(messageId, status);
    });
    
    socket.on("chat_marked_read", ({ byUserId, count }) => {
      const { selectedUser, messagesCache } = get();
      const { authUser } = useAuthStore.getState();
      
      if (byUserId === authUser?._id) return;
      if (!selectedUser) return;
      
      const currentMessages = messagesCache[selectedUser._id] || [];
      let updatedCount = 0;
      const updatedMessages = currentMessages.map(msg =>
        msg.senderId === authUser?._id && msg.receiverId === byUserId && shouldUpdateStatus(msg.status, MESSAGE_STATUS.READ)
          ? { ...msg, status: MESSAGE_STATUS.READ }
          : msg
      );
      
      updatedMessages.forEach((msg, i) => {
        if (msg.status !== currentMessages[i].status) updatedCount++;
      });
      
      if (updatedCount > 0) {
        set((state) => ({
          messagesCache: {
            ...state.messagesCache,
            [selectedUser._id]: updatedMessages
          }
        }));
        console.log(`${updatedCount} mensajes marcados como leidos por ${byUserId}`);
      }
    });
    
    socket.on("pending_messages_batch", (pendingMessages) => {
      console.log(`Recibiendo ${pendingMessages.length} mensajes pendientes`);
      const { selectedUser, messagesCache } = get();
      
      pendingMessages.forEach(msg => {
        const chatUserId = msg.senderId;
        const chatMessages = messagesCache[chatUserId] || [];
        const exists = chatMessages.some(m => m._id === msg._id);
        
        if (!exists) {
          console.log(`Enviando ACK para mensaje pendiente: ${msg._id}`);
          socket.emit("message_received_ack", { messageId: msg._id });
          
          set((state) => ({
            messagesCache: {
              ...state.messagesCache,
              [chatUserId]: [...(state.messagesCache[chatUserId] || []), msg]
            }
          }));
          
          if (selectedUser && msg.senderId === selectedUser._id) {
            setTimeout(() => {
              console.log(`Enviando READ para mensaje pendiente: ${msg._id}`);
              socket.emit("message_read", { messageId: msg._id });
            }, 500);
          }
        }
      });
      
      get().getMyChatPartners();
    });
    
    console.log("Suscrito a eventos de mensajes");
  },
  
  unsubscribeFromMessages: () => {
    const { socket } = useAuthStore.getState();
    if (!socket) return;
    
    socket.off("newMessage");
    socket.off("message_status_updated");
    socket.off("message_delivered_ack");
    socket.off("chat_marked_read");
    socket.off("pending_messages_batch");
    
    console.log("Desuscrito de eventos de mensajes");
  },
  
  setSelectedUser: async (user) => {
    if (user === null) {
      console.log("Usuario deseleccionado explicitamente");
      set({ selectedUser: null });
      return;
    }
    
    if (!user || !user._id) {
      console.warn("setSelectedUser: usuario invalido", user);
      return;
    }
    
    const currentUser = get().selectedUser;
    if (currentUser?._id === user._id) {
      console.log(`Usuario ya seleccionado: ${user.fullName}`);
      return;
    }
    
    set({ selectedUser: user });
    console.log(`Usuario seleccionado: ${user.fullName} (${user._id})`);
    
    const { socket } = useAuthStore.getState();
    if (socket && socket.connected) {
      console.log(`Notificando al servidor: chat abierto con ${user._id}`);
      socket.emit("chat_opened", { senderId: user._id });
    }
    
    get().markMessagesAsRead(user._id);
    
    try {
      await get().markMessagesAsReadOnServer(user._id);
    } catch (error) {
      console.error("Error marcando mensajes como leidos en servidor:", error);
    }
    
    const { chats } = get();
    const updatedChats = chats.map(chat => {
      if (chat.user?._id === user._id) {
        return { ...chat, unreadCount: 0 };
      }
      return chat;
    });
    set({ chats: updatedChats });
  },
  
  resetChatState: () => {
    console.log("Resetear estado del chat");
    get().unsubscribeFromMessages();
    
    set({
      selectedUser: null,
      messagesCache: {},
      chats: [],
      allContacts: [],
      activeTab: 'chats',
      isUsersLoading: false,
      isMessagesLoading: false,
      messageInputText: ''
    });
  },
  
  setMessageInputText: (text) => {
    set({ messageInputText: text });
  },
  
  forceRefreshChats: async () => {
    console.log("Force refresh de chats");
    await get().getMyChatPartners();
  },
  
  sendTypingStart: (receiverId) => {
    const { socket } = useAuthStore.getState();
    if (socket) {
      socket.emit("typing_start", { receiverId });
    }
  },
  
  sendTypingStop: (receiverId) => {
    const { socket } = useAuthStore.getState();
    if (socket) {
      socket.emit("typing_stop", { receiverId });
    }
  }
}));