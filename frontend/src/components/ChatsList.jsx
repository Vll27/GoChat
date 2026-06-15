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

  useEffect(() => {
    // Si no hay un usuario autenticado, salite inmediatamente y frená la petición huérfana ✋
    if (!authUser) return;

    console.log("📋 Cargando chats...");
    getMyChatPartners();
  }, [getMyChatPartners, authUser]);

  useEffect(() => {
    // Si el socket o el authUser no existen, nos salimos de inmediato ✋
    if (!socket || !authUser) return; 
    
    const handleChatsUpdated = () => {
      // GUARDIÁN: Si el usuario ya le dio logout y no está autenticado, frenamos la petición de inmediato
      if (!useAuthStore.getState().authUser) return;

      console.log("🔄 Actualizando lista de chats...");
      getMyChatPartners();
    }
    return () => {
      isMounted.current = false;
    };
  }, [getMyChatPartners, authUser]);

  useEffect(() => {
    if (!socket || !authUser) return;
    
    const handleUserStatusChange = ({ userId, status, lastSeen }) => {
      // GUARDIÁN: Evitar mutar el estado de Zustand si ya nos estamos saliendo
      if (!useAuthStore.getState().authUser) return;

      console.log(`👤 Usuario ${userId} cambió a: ${status}`);
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
    // IMPORTANTE: Añadí authUser a las dependencias del efecto para que se limpie y remonte correctamente
  }, [socket, getMyChatPartners, authUser]);

  const handleChatClick = (chat) => {
    setSelectedUser(chat.user);
    markMessagesAsRead(chat.user._id);
  };

  const formatLastMessage = (chat) => {
    if (!chat.lastMessage) return "Sin mensajes";
    
    if (chat.lastMessage.isDeleted || chat.lastMessage.text === "Mensaje eliminado") {
      return "Mensaje eliminado";
    }
const msg = typeof lastMsg !== "undefined" ? lastMsg : chat.lastMessage;
    
    if (!msg) return "Mensaje";

    if (msg.mediaType === "video") return "🎥 Video";
    if (msg.image) return "📷 Imagen";
    
    if (msg.text) {
      return msg.text.length > 30
        ? msg.text.substring(0, 30) + '...'
        : msg.text;
    }
    
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

  // 🔥 Función para obtener el texto de reacción estilo WhatsApp
  const getReactionText = (chat) => {
    const lastMessage = chat.lastMessage;
    if (!lastMessage) return null;
    
    // Usar el nombre guardado en lastReactionUserName
    if (lastMessage.lastReactionUserName) {
      if (lastMessage.lastReactionUser === authUser._id) {
        return `Tú reaccionaste con ${lastMessage.lastReactionEmoji}`;
      }
      return `${lastMessage.lastReactionUserName} reaccionó con ${lastMessage.lastReactionEmoji}`;
    }
    
    // Fallback: calcular desde reactions
    const reactions = lastMessage.reactions;
    if (!reactions || reactions.length === 0) return null;
    
    const lastReaction = reactions[reactions.length - 1];
    const reactionEmoji = lastReaction?.emoji;
    const reactionUserId = lastReaction?.userId?._id || lastReaction?.userId;
    
    if (reactionUserId?.toString() === authUser._id?.toString()) {
      return `Tú reaccionaste con ${reactionEmoji}`;
    }
    
    if (chat.user?._id === reactionUserId?.toString()) {
      const firstName = chat.user.fullName?.split(' ')[0] || chat.user.fullName;
      return `${firstName} reaccionó con ${reactionEmoji}`;
    }
    
    return null;
  };

  const getReactionEmoji = (chat) => {
    if (chat.lastMessage?.lastReactionEmoji) {
      return chat.lastMessage.lastReactionEmoji;
    }
    if (chat.lastMessage?.reactions?.length > 0) {
      const lastReaction = chat.lastMessage.reactions[chat.lastMessage.reactions.length - 1];
      return lastReaction?.emoji || null;
    }
    return null;
  };

  return (
    <div className="chat-list-scroll">
      <div className="space-y-2 p-2">
        {chats.map((chat) => {
          const isOnline = onlineUsers.includes(chat.user?._id);
          const shortLastSeen = getShortLastSeen(chat.user?.lastSeen, isOnline);
          const isMyLastMessage = chat.lastMessage?.senderId === authUser._id;
          const lastMessageStatus = chat.lastMessage?.status;
          const isDeleted = chat.lastMessage?.isDeleted || chat.lastMessage?.text === "Mensaje eliminado";
          const reactionEmoji = getReactionEmoji(chat);
          const reactionText = getReactionText(chat);
          
          return (
            <div
              key={chat._id}
              onClick={() => handleChatClick(chat)}
              className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                compact ? "justify-center hover:bg-slate-700/30" : "hover:bg-slate-700/30"
              } ${selectedUser?._id === chat.user?._id ? "bg-slate-700/50" : ""}`}
              title={compact ? getCompactTooltip(chat) : ""}
            >
              <div className="flex-shrink-0">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-slate-600 flex items-center justify-center overflow-hidden">
                    <img 
                      src={chat.user?.profilePic || "/avatar.png"} 
                      alt={chat.user?.fullName} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {isOnline && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-slate-800"></div>
                  )}
                </div>
              </div>

              {!compact && (
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="font-medium text-slate-200 truncate max-w-[150px]">
                      {chat.user?.fullName || "Usuario"}
                    </h4>
                    <div className="flex flex-col items-end flex-shrink-0 ml-2">
                      {chat.lastMessage && (
                        <span className="text-xs text-slate-400 whitespace-nowrap">
                          {formatTime(chat.lastMessage.createdAt)}
                        </span>
                      )}
                      {shortLastSeen && !isOnline && (
                        <span className="text-[10px] text-slate-500 mt-0.5 whitespace-nowrap">
                          {shortLastSeen}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 min-w-0">
                    {isMyLastMessage && lastMessageStatus && !isDeleted && (
                      <MessageStatusIcon status={lastMessageStatus} className="w-3.5 h-3.5 flex-shrink-0" />
                    )}
                    
                    {/* 🔥 Mostrar texto de reacción estilo WhatsApp */}
                    {reactionText && !isDeleted ? (
                      <p className={`text-sm truncate ${reactionText.includes('Tú') ? 'text-cyan-400' : 'text-slate-400'}`}>
                        {reactionText}
                      </p>
                    ) : (
                      <p className={`text-sm truncate ${isDeleted ? 'text-slate-500 italic' : 'text-slate-400'}`}>
                        {formatLastMessage(chat)}
                      </p>
                    )}
                    
                  </div>
                  
                  {chat.unreadCount > 0 && (
                    <div className="flex justify-end mt-1">
                      <span className="text-white text-xs rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center" style={{ backgroundColor: "var(--theme-primary)" }}>
                        {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ChatsList;