import { useEffect, useRef } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import UsersLoadingSkeleton from "./UsersLoadingSkeleton";
import NoChatsFound from "./NoChatsFound";
import MessageStatusIcon from "./MessageStatusIcon";
import { getShortLastSeen } from "../utils/lastSeenFormatter";
import { MESSAGE_STATUS } from "../utils/messageStatusUtils";

function ChatsList({ compact = false }) {
  const {
    getMyChatPartners,
    chats,
    isUsersLoading,
    setSelectedUser,
    selectedUser,
    markMessagesAsRead,
    updateMessageStatus,
    updateMultipleMessagesStatus,
  } = useChatStore();
  const { onlineUsers, socket, authUser } = useAuthStore();
  const isMounted = useRef(true);

  // Cargar chats iniciales
  useEffect(() => {
    isMounted.current = true;
    if (authUser && isMounted.current) {
      console.log("Cargando chats...");
      getMyChatPartners();
    }
    return () => {
      isMounted.current = false;
    };
  }, [getMyChatPartners, authUser]);

  // Escuchar cambios de estado de usuarios
  useEffect(() => {
    if (!socket || !authUser) return;
    
    const handleUserStatusChange = ({ userId, status, lastSeen }) => {
      if (!authUser || !isMounted.current) return;
      
      console.log(`Usuario ${userId} cambio a: ${status}`);
      useChatStore.setState((state) => ({
        chats: state.chats.map(chat => 
          chat.user?._id === userId 
            ? { 
                ...chat, 
                user: { 
                  ...chat.user, 
                  lastSeenStatus: status,
                  lastSeen: lastSeen || chat.user.lastSeen
                } 
              }
            : chat
        ),
        selectedUser: state.selectedUser?._id === userId
          ? {
              ...state.selectedUser,
              lastSeenStatus: status,
              lastSeen: lastSeen || state.selectedUser.lastSeen
            }
          : state.selectedUser
      }));
    };

    socket.on("userStatusChanged", handleUserStatusChange);

    return () => {
      socket.off("userStatusChanged", handleUserStatusChange);
    };
  }, [socket, authUser]);

  // Escuchar nuevos mensajes para actualizar la lista de chats
  useEffect(() => {
    if (!socket || !authUser) return;
    
    const handleNewMessage = (newMessage) => {
      if (newMessage.receiverId === authUser._id) {
        console.log("ChatsList: Nuevo mensaje recibido, actualizando lista...");
        getMyChatPartners();
      }
    };
    
    socket.on("newMessage", handleNewMessage);
    
    return () => {
      socket.off("newMessage", handleNewMessage);
    };
  }, [socket, authUser, getMyChatPartners]);

  // Escuchar actualizaciones de estado de mensajes
  useEffect(() => {
    if (!socket || !authUser) return;
    
    const handleMessageStatusUpdated = ({ messageId, status }) => {
      console.log(`ChatsList: Estado de mensaje actualizado: ${messageId} -> ${status}`);
      
      updateMessageStatus(messageId, status);
      
      const { messages, chats } = useChatStore.getState();
      const updatedMessage = messages.find(m => m._id === messageId);
      if (!updatedMessage) return;
      
      const chatIndex = chats.findIndex(chat => chat.user?._id === updatedMessage.senderId);
      if (chatIndex !== -1) {
        const updatedChats = [...chats];
        if (updatedChats[chatIndex].lastMessage?._id === messageId) {
          updatedChats[chatIndex] = {
            ...updatedChats[chatIndex],
            lastMessage: { ...updatedChats[chatIndex].lastMessage, status }
          };
          useChatStore.setState({ chats: updatedChats });
          console.log(`ChatsList: Chat ${updatedMessage.senderId} actualizado con estado ${status}`);
        }
      }
    };
    
    const handleMessageDeliveredAck = (data) => {
      console.log(`ChatsList: Entregas recibidas:`, data);
      const { messageIds } = data;
      
      if (Array.isArray(messageIds) && messageIds.length > 0) {
        updateMultipleMessagesStatus(messageIds, MESSAGE_STATUS.DELIVERED);
        
        const { messages, chats } = useChatStore.getState();
        messageIds.forEach(messageId => {
          const updatedMessage = messages.find(m => m._id === messageId);
          if (updatedMessage && updatedMessage.senderId === authUser._id) {
            const chatIndex = chats.findIndex(chat => chat.user?._id === updatedMessage.receiverId);
            if (chatIndex !== -1 && chats[chatIndex].lastMessage?._id === messageId) {
              const updatedChats = [...chats];
              updatedChats[chatIndex] = {
                ...updatedChats[chatIndex],
                lastMessage: { ...updatedChats[chatIndex].lastMessage, status: MESSAGE_STATUS.DELIVERED }
              };
              useChatStore.setState({ chats: updatedChats });
            }
          }
        });
      }
    };
    
    const handleChatMarkedRead = ({ byUserId }) => {
      if (byUserId === authUser._id) return;
      console.log(`ChatsList: Chat marcado como leido por ${byUserId}`);
      
      const { chats } = useChatStore.getState();
      const updatedChats = chats.map(chat => {
        if (chat.user?._id === byUserId && chat.lastMessage?.senderId === authUser._id) {
          return {
            ...chat,
            lastMessage: { ...chat.lastMessage, status: MESSAGE_STATUS.READ }
          };
        }
        return chat;
      });
      useChatStore.setState({ chats: updatedChats });
    };
    
    socket.on("message_status_updated", handleMessageStatusUpdated);
    socket.on("message_delivered_ack", handleMessageDeliveredAck);
    socket.on("chat_marked_read", handleChatMarkedRead);
    
    return () => {
      socket.off("message_status_updated", handleMessageStatusUpdated);
      socket.off("message_delivered_ack", handleMessageDeliveredAck);
      socket.off("chat_marked_read", handleChatMarkedRead);
    };
  }, [socket, authUser, updateMessageStatus, updateMultipleMessagesStatus]);

  // Actualizar chats periodicamente
  useEffect(() => {
    if (!authUser) return;
    
    const interval = setInterval(() => {
      console.log("Actualizacion periodica de chats...");
      getMyChatPartners();
    }, 10000);
    
    return () => clearInterval(interval);
  }, [authUser, getMyChatPartners]);

  if (!authUser) return null;
  if (isUsersLoading && chats.length === 0) return <UsersLoadingSkeleton />;
  if (chats.length === 0) return <NoChatsFound />;

  const handleChatClick = (chat) => {
    console.log("Seleccionando chat:", chat.user.fullName);
    setSelectedUser(chat.user);
    markMessagesAsRead(chat.user._id);
  };

  const formatLastMessage = (chat) => {
    if (!chat.lastMessage) return "Sin mensajes";
    if (chat.lastMessage.text) {
      return chat.lastMessage.text.length > 30
        ? chat.lastMessage.text.substring(0, 30) + '...'
        : chat.lastMessage.text;
    }
    if (chat.lastMessage.image) return "Imagen";
    return "Mensaje";
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Ayer';
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getCompactTooltip = (chat) => {
    const lastMessage = formatLastMessage(chat);
    const time = chat.lastMessage ? formatTime(chat.lastMessage.createdAt) : '';
    const isOnline = onlineUsers.includes(chat.user?._id);
    const lastSeen = getShortLastSeen(chat.user?.lastSeen, isOnline);
    return `${chat.user?.fullName}\n${lastMessage}${time ? `\n${time}` : ''}${lastSeen ? `\n${lastSeen}` : ''}`;
  };

  return (
    <div className="space-y-2">
      {chats.map((chat) => {
        const isOnline = onlineUsers.includes(chat.user?._id);
        const shortLastSeen = getShortLastSeen(chat.user?.lastSeen, isOnline);
        const isMyLastMessage = chat.lastMessage?.senderId === authUser._id;
        const lastMessageStatus = chat.lastMessage?.status;
        
        return (
          <div
            key={chat._id}
            onClick={() => handleChatClick(chat)}
            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
              compact ? "justify-center hover:bg-slate-700/30" : "hover:bg-slate-700/30"
            } ${selectedUser?._id === chat.user?._id ? "bg-slate-700/50" : ""}`}
            title={compact ? getCompactTooltip(chat) : ""}
          >
            <div className="flex-shrink-0 relative">
              <div className={`${compact ? "w-12 h-12" : "w-12 h-12"} rounded-full bg-slate-600 flex items-center justify-center overflow-hidden`}>
                <img 
                  src={chat.user?.profilePic || "/avatar.png"} 
                  alt={chat.user?.fullName} 
                  className="w-full h-full object-cover"
                />
              </div>
              {isOnline && (
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-slate-800"></div>
              )}
              
              {compact && chat.unreadCount > 0 && (
                <div className="absolute -top-1 -right-1">
                  <span className="text-white text-xs rounded-full w-5 h-5 flex items-center justify-center" style={{ backgroundColor: "var(--theme-primary)" }}>
                    {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
                  </span>
                </div>
              )}
            </div>

            {!compact && (
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-medium text-slate-200 truncate">
                    {chat.user?.fullName || "Usuario Desconocido"}
                  </h4>
                  <div className="flex flex-col items-end">
                    {chat.lastMessage && (
                      <span className="text-xs text-slate-400 flex-shrink-0 ml-2">
                        {formatTime(chat.lastMessage.createdAt)}
                      </span>
                    )}
                    {shortLastSeen && !isOnline && (
                      <span className="text-[10px] text-slate-500 mt-0.5">
                        {shortLastSeen}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  {isMyLastMessage && lastMessageStatus && (
                    <MessageStatusIcon status={lastMessageStatus} className="w-3.5 h-3.5" />
                  )}
                  <p className="text-sm text-slate-400 truncate">
                    {formatLastMessage(chat)}
                  </p>
                </div>
                
                {chat.unreadCount > 0 && (
                  <div className="flex justify-end mt-1">
                    <span className="text-white text-xs rounded-full w-5 h-5 flex items-center justify-center" style={{ backgroundColor: "var(--theme-primary)" }}>
                      {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default ChatsList;