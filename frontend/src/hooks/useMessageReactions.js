import { useCallback } from 'react';
import { axiosInstance } from '../lib/axios';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import toast from 'react-hot-toast';

const useMessageReactions = () => {
  const { socket } = useAuthStore();
  const { updateMessageReactions } = useChatStore();

  const addReaction = useCallback(async (messageId, emoji) => {
    if (!emoji) return false;
    
    try {
      const res = await axiosInstance.post(`/messages/react/${messageId}`, { emoji });
      
      if (socket && socket.connected) {
        socket.emit("react_to_message", { messageId, emoji });
      }
      
      if (res.data.reactions) {
        updateMessageReactions(messageId, res.data.reactions);
      }
      
      return true;
    } catch (error) {
      console.error("Error agregando reacción:", error);
      toast.error("No se pudo agregar la reacción");
      return false;
    }
  }, [socket, updateMessageReactions]);

  const removeReaction = useCallback(async (messageId) => {
    try {
      const res = await axiosInstance.delete(`/messages/react/${messageId}`);
      
      if (socket && socket.connected) {
        socket.emit("remove_reaction", { messageId });
      }
      
      if (res.data.reactions) {
        updateMessageReactions(messageId, res.data.reactions);
      }
      
      return true;
    } catch (error) {
      console.error("Error eliminando reacción:", error);
      toast.error("No se pudo eliminar la reacción");
      return false;
    }
  }, [socket, updateMessageReactions]);

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
    const userReaction = reactions?.find(r => r.userId?._id === userId || r.userId === userId);
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