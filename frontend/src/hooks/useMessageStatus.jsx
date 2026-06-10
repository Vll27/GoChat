import { useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';

export const useMessageStatus = () => {
  const { socket } = useAuthStore();
  const { updateMessageStatus, selectedUser, messages, updateMultipleMessagesStatus, markMessagesAsRead } = useChatStore();
  const ackTimeoutRef = useRef({});

  // Notificar que el cliente RECIBIO el mensaje (ACK)
  const sendMessageReceivedAck = useCallback((messageId) => {
    if (!socket || !messageId) return;
    
    // Evitar ACK duplicados
    if (ackTimeoutRef.current[messageId]) return;
    
    console.log(`useMessageStatus: Enviando ACK para mensaje ${messageId}`);
    socket.emit("message_received_ack", { messageId });
    ackTimeoutRef.current[messageId] = setTimeout(() => {
      delete ackTimeoutRef.current[messageId];
    }, 5000);
  }, [socket]);

  // Notificar que el cliente LEYO el mensaje
  const sendMessageRead = useCallback((messageId) => {
    if (!socket || !messageId) return;
    console.log(`useMessageStatus: Enviando read para mensaje ${messageId}`);
    socket.emit("message_read", { messageId });
  }, [socket]);

  // Notificar que el chat esta abierto (marca todos como leidos)
  const sendChatOpened = useCallback((senderId) => {
    if (!socket || !senderId) return;
    console.log(`useMessageStatus: Enviando chat_opened para sender ${senderId}`);
    socket.emit("chat_opened", { senderId });
  }, [socket]);

  // Typing indicator
  const sendTypingStart = useCallback((receiverId) => {
    if (!socket || !receiverId) return;
    socket.emit("typing_start", { receiverId });
  }, [socket]);

  const sendTypingStop = useCallback((receiverId) => {
    if (!socket || !receiverId) return;
    socket.emit("typing_stop", { receiverId });
  }, [socket]);

  // Escuchar eventos del servidor
  useEffect(() => {
    if (!socket) return;

    const handleMessageDeliveredAck = ({ messageId, status }) => {
      console.log(`useMessageStatus: message_delivered_ack recibido para ${messageId} -> ${status}`);
      if (messageId) {
        updateMessageStatus(messageId, status);
      }
    };

    const handleMessageStatusUpdated = ({ messageId, status }) => {
      console.log(`useMessageStatus: message_status_updated recibido para ${messageId} -> ${status}`);
      if (messageId) {
        updateMessageStatus(messageId, status);
      }
    };

    const handleChatMarkedRead = ({ byUserId, count }) => {
      console.log(`useMessageStatus: chat_marked_read recibido - ${count} mensajes leidos por ${byUserId}`);
      
      // Usar la funcion existente del store para marcar como leidos
      if (byUserId) {
        markMessagesAsRead(byUserId);
      }
    };

    const handlePendingMessagesBatch = (pendingMessages) => {
      // Verificar que pendingMessages existe y es un array
      if (!pendingMessages || !Array.isArray(pendingMessages)) {
        console.log("useMessageStatus: pending_messages_batch no es un array", pendingMessages);
        return;
      }
      
      console.log(`useMessageStatus: Recibidos ${pendingMessages.length} mensajes pendientes`);
      
      pendingMessages.forEach(msg => {
        if (msg && msg._id) {
          // Agregar al store
          useChatStore.getState().addMessage(msg);
          // Enviar ACK
          sendMessageReceivedAck(msg._id);
        }
      });
    };

    socket.on("message_delivered_ack", handleMessageDeliveredAck);
    socket.on("message_status_updated", handleMessageStatusUpdated);
    socket.on("chat_marked_read", handleChatMarkedRead);
    socket.on("pending_messages_batch", handlePendingMessagesBatch);

    return () => {
      socket.off("message_delivered_ack", handleMessageDeliveredAck);
      socket.off("message_status_updated", handleMessageStatusUpdated);
      socket.off("chat_marked_read", handleChatMarkedRead);
      socket.off("pending_messages_batch", handlePendingMessagesBatch);
    };
  }, [socket, updateMessageStatus, markMessagesAsRead, sendMessageReceivedAck]);

  // Cuando se abre un chat, enviar evento y marcar como leidos localmente
  useEffect(() => {
    if (selectedUser && selectedUser._id && socket && messages && Array.isArray(messages)) {
      sendChatOpened(selectedUser._id);
      
      // Marcar localmente como leidos los mensajes de este sender
      const unreadMessages = messages.filter(
        msg => msg.senderId === selectedUser._id && msg.status !== "read"
      );
      
      if (unreadMessages.length > 0) {
        console.log(`useMessageStatus: Marcando ${unreadMessages.length} mensajes como leidos localmente`);
        unreadMessages.forEach(msg => {
          updateMessageStatus(msg._id, "read");
        });
      }
    }
  }, [selectedUser, messages, socket, sendChatOpened, updateMessageStatus]);

  // Solicitar mensajes pendientes al reconectar
  useEffect(() => {
    if (!socket) return;
    
    const handleConnect = () => {
      console.log("useMessageStatus: Socket reconectado, solicitando mensajes pendientes...");
      socket.emit("request_pending_messages");
    };
    
    socket.on("connect", handleConnect);
    
    return () => {
      socket.off("connect", handleConnect);
    };
  }, [socket]);

  return {
    sendMessageReceivedAck,
    sendMessageRead,
    sendChatOpened,
    sendTypingStart,
    sendTypingStop
  };
};

export default useMessageStatus;