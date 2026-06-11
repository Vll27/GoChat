import { useCallback } from 'react';
import { axiosInstance } from '../lib/axios';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import toast from 'react-hot-toast';

const useMessageReactions = () => {
  const { socket } = useAuthStore();
  const { updateMessageReactions, messagesCache, selectedUser } = useChatStore();

  // ✅ ACTUALIZACIÓN OPTIMISTA - Instantánea
  const addReaction = useCallback(async (messageId, emoji) => {
    if (!emoji) return false;
    
    const { authUser } = useAuthStore.getState();
    const currentMessages = messagesCache[selectedUser?._id] || [];
    const message = currentMessages.find(m => m._id === messageId);
    
    if (!message) return false;
    
    // 🔥 ACTUALIZACIÓN OPTIMISTA (aparece instantáneo)
    const existingReactionIndex = message.reactions?.findIndex(
      (r) => r.userId?._id === authUser._id || r.userId === authUser._id
    );
    
    let optimisticReactions = [...(message.reactions || [])];
    
    if (existingReactionIndex !== -1) {
      // Actualizar reacción existente
      optimisticReactions[existingReactionIndex] = {
        ...optimisticReactions[existingReactionIndex],
        emoji: emoji,
        createdAt: new Date().toISOString()
      };
    } else {
      // Agregar nueva reacción
      optimisticReactions.push({
        userId: authUser._id,
        emoji: emoji,
        createdAt: new Date().toISOString()
      });
    }
    
    // Actualizar UI instantáneamente
    updateMessageReactions(messageId, optimisticReactions);
    
    try {
      // Enviar al backend en segundo plano
      const res = await axiosInstance.post(`/messages/react/${messageId}`, { emoji });
      
      // Sincronizar con la respuesta del backend (por si hay diferencias)
      if (res.data.reactions) {
        updateMessageReactions(messageId, res.data.reactions);
      }
      
      // Emitir evento de socket para otros usuarios
      if (socket && socket.connected) {
        socket.emit("react_to_message", { messageId, emoji });
      }
      
      return true;
    } catch (error) {
      console.error("Error agregando reacción:", error);
      
      // Revertir cambio optimista si falló
      updateMessageReactions(messageId, message.reactions || []);
      toast.error("No se pudo agregar la reacción");
      return false;
    }
  }, [socket, updateMessageReactions, messagesCache, selectedUser]);

  // ✅ ACTUALIZACIÓN OPTIMISTA para eliminar
  const removeReaction = useCallback(async (messageId) => {
    const { authUser } = useAuthStore.getState();
    const currentMessages = messagesCache[selectedUser?._id] || [];
    const message = currentMessages.find(m => m._id === messageId);
    
    if (!message) return false;
    
    // 🔥 ACTUALIZACIÓN OPTIMISTA (desaparece instantáneo)
    const optimisticReactions = (message.reactions || []).filter(
      (r) => (r.userId?._id !== authUser._id && r.userId !== authUser._id)
    );
    
    updateMessageReactions(messageId, optimisticReactions);
    
    try {
      const res = await axiosInstance.delete(`/messages/react/${messageId}`);
      
      if (res.data.reactions) {
        updateMessageReactions(messageId, res.data.reactions);
      }
      
      if (socket && socket.connected) {
        socket.emit("remove_reaction", { messageId });
      }
      
      return true;
    } catch (error) {
      console.error("Error eliminando reacción:", error);
      updateMessageReactions(messageId, message.reactions || []);
      toast.error("No se pudo eliminar la reacción");
      return false;
    }
  }, [socket, updateMessageReactions, messagesCache, selectedUser]);

  const getReactions = useCallback(async (messageId) => {
    try {
      const res = await axiosInstance.get(`/messages/react/${messageId}`);
      return res.data;
    } catch (error) {
      console.error("Error obteniendo reacciones:", error);
      return null;
    }
  }, []);

  const getUserReaction = useCallback((reactions, userId) => {
    const userReaction = reactions?.find(r => {
      const reactionUserId = r.userId?._id || r.userId;
      return reactionUserId?.toString() === userId?.toString();
    });
    return userReaction?.emoji || null;
  }, []);

  const groupReactions = useCallback((reactions) => {
    const grouped = {};
    reactions?.forEach((reaction) => {
      const emoji = reaction.emoji;
      if (!grouped[emoji]) {
        grouped[emoji] = {
          emoji,
          count: 0,
          users: [],
        };
      }
      grouped[emoji].count++;
      grouped[emoji].users.push(reaction.userId);
    });
    return Object.values(grouped);
  }, []);

  const availableEmojis = ["👍", "❤️", "😂", "😮", "😢", "😡", "🎉", "🔥", "👏", "🙏"];

  return {
    addReaction,
    removeReaction,
    getReactions,
    getUserReaction,
    groupReactions,
    availableEmojis,
  };
};

export default useMessageReactions;