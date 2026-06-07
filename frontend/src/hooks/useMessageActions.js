import { useCallback } from 'react';
import { axiosInstance } from '../lib/axios';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import toast from 'react-hot-toast';

const useMessageActions = () => {
  const { socket } = useAuthStore();
  const { updateMessageText, deleteMessageFromCache } = useChatStore();

  // ✅ CORREGIDO: Verificar si el mensaje puede ser editado (menos de 5 minutos)
  const canEditMessage = useCallback((message) => {
    if (!message || !message.senderId) return false;
    
    const { authUser } = useAuthStore.getState();
    // 🔧 FIX: Convertir ambos a string para comparar correctamente
    const isSender = message.senderId?.toString() === authUser?._id?.toString();
    
    console.log("🔍 canEditMessage:", { 
      messageId: message._id,
      isSender, 
      senderId: message.senderId?.toString(),
      authUserId: authUser?._id?.toString()
    });
    
    if (!isSender) return false;
    
    // Verificar que createdAt existe
    if (!message.createdAt) {
      console.warn("⚠️ Mensaje sin createdAt:", message._id);
      return false;
    }
    
    try {
      const messageTime = new Date(message.createdAt).getTime();
      const currentTime = new Date().getTime();
      
      if (isNaN(messageTime)) {
        console.warn("⚠️ createdAt inválido:", message.createdAt);
        return false;
      }
      
      const minutesDiff = (currentTime - messageTime) / (1000 * 60);
      const canEdit = minutesDiff < 5;
      
      console.log(`⏱️ Tiempo transcurrido: ${minutesDiff.toFixed(2)} minutos, Puede editar: ${canEdit}`);
      
      return canEdit;
    } catch (error) {
      console.error("Error en canEditMessage:", error);
      return false;
    }
  }, []);

  const copyMessageText = useCallback(async (text, messageId) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Mensaje copiado al portapapeles");
      
      try {
        await axiosInstance.post(`/messages/copy/${messageId}`);
      } catch (error) {
        console.log("Error registrando copia:", error);
      }
    } catch (error) {
      console.error("Error al copiar:", error);
      toast.error("No se pudo copiar el mensaje");
    }
  }, []);

  const getMessageInfo = useCallback(async (messageId) => {
    try {
      const res = await axiosInstance.get(`/messages/info/${messageId}`);
      return res.data;
    } catch (error) {
      console.error("Error obteniendo info del mensaje:", error);
      toast.error("No se pudo obtener la información del mensaje");
      return null;
    }
  }, []);

  // ✅ MEJORADO: Edición de mensaje con mejor manejo de errores
  const editMessage = useCallback(async (messageId, newText, oldText) => {
    if (!newText || newText.trim() === "") {
      toast.error("El mensaje no puede estar vacío");
      return false;
    }
    
    if (newText === oldText) {
      toast.error("No se realizaron cambios");
      return false;
    }
    
    console.log("📝 Editando mensaje:", { messageId, newText: newText.trim() });
    
    try {
      // Actualización optimista inmediata
      updateMessageText(messageId, newText.trim());
      
      // Llamada al backend
      const res = await axiosInstance.patch(`/messages/edit/${messageId}`, { 
        text: newText.trim() 
      });
      
      console.log("✅ Respuesta del backend:", res.data);
      
      // Emitir evento de socket para actualizar en tiempo real
      if (socket && socket.connected) {
        socket.emit("edit_message", { 
          messageId, 
          newText: newText.trim(),
          editedAt: new Date().toISOString()
        });
      }
      
      toast.success("Mensaje editado correctamente");
      return true;
      
    } catch (error) {
      console.error("❌ Error editando mensaje:", error);
      
      // Revertir cambio optimista
      updateMessageText(messageId, oldText);
      
      const errorMsg = error.response?.data?.message || "No se pudo editar el mensaje";
      toast.error(errorMsg);
      return false;
    }
  }, [socket, updateMessageText]);

  const deleteMessage = useCallback(async (messageId, forEveryone = false) => {
    try {
      deleteMessageFromCache(messageId);
      
      const res = await axiosInstance.delete(`/messages/delete/${messageId}?forEveryone=${forEveryone}`);
      
      console.log("✅ Mensaje eliminado:", res.data);
      
      if (socket && socket.connected) {
        socket.emit("delete_message", { messageId, forEveryone });
      }
      
      toast.success(forEveryone ? "Mensaje eliminado para todos" : "Mensaje eliminado");
      return true;
    } catch (error) {
      console.error("❌ Error eliminando mensaje:", error);
      toast.error(error.response?.data?.message || "No se pudo eliminar el mensaje");
      return false;
    }
  }, [socket, deleteMessageFromCache]);

  return {
    copyMessageText,
    getMessageInfo,
    editMessage,
    deleteMessage,
    canEditMessage,
  };
};

export default useMessageActions;