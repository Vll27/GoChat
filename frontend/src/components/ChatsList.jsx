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

  useEffect(() => {
    if (!socket || !authUser) return;
    
    const handleUserStatusChange = ({ userId, status, lastSeen }) => {
      if (!authUser || !isMounted.current) return;
      
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

  useEffect(() => {
    if (!socket || !authUser) return;
    
    const handleMessageStatusUpdated = ({ messageId, status }) => {
      updateMessageStatus(messageId, status);
      
      const { messages, chats } = useChatStore.getState();
      const updatedMessage = messages.find(m => m._id === messageId);
      if (!updatedMessage) return;
      
      const chatIndex = chats.findIndex(chat => chat.user?._id === updatedMessage.senderId);
      if (chatIndex !== -1 && chats[chatIndex].lastMessage?._id === messageId) {
        const updatedChats = [...chats];
        updatedChats[chatIndex] = {
          ...updatedChats[chatIndex],
          lastMessage: { ...updatedChats[chatIndex].lastMessage, status }
        };
        useChatStore.setState({ chats: updatedChats });
      }
    };
    
    const handleMessageDeliveredAck = (data) => {
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
    
    const handleMessageDeleted = ({ messageId, deletedForEveryone }) => {
      const { messages, chats } = useChatStore.getState();
      
      const chatIndex = chats.findIndex(chat => chat.lastMessage?._id === messageId);
      if (chatIndex !== -1) {
        const updatedChats = [...chats];
        updatedChats[chatIndex] = {
          ...updatedChats[chatIndex],
          lastMessage: {
            ...updatedChats[chatIndex].lastMessage,
            text: "Mensaje eliminado",
            image: null,
            isDeleted: true,
            deletedForEveryone
          }
        };
        useChatStore.setState({ chats: updatedChats });
      }
    };
    
    const handleMessageReactionUpdated = ({ messageId, reactions }) => {
      const { chats } = useChatStore.getState();
      
      const chatIndex = chats.findIndex(chat => chat.lastMessage?._id === messageId);
      if (chatIndex !== -1) {
        const lastReaction = reactions?.length > 0 ? reactions[reactions.length - 1] : null;
        
        const updatedChats = [...chats];
        updatedChats[chatIndex] = {
          ...updatedChats[chatIndex],
          lastMessage: {
            ...updatedChats[chatIndex].lastMessage,
            reactions,
            lastReactionEmoji: lastReaction?.emoji || null,
            lastReactionUser: lastReaction?.userId?._id || lastReaction?.userId || null
          }
        };
        useChatStore.setState({ chats: updatedChats });
      }
    };
    
    socket.on("message_status_updated", handleMessageStatusUpdated);
    socket.on("message_delivered_ack", handleMessageDeliveredAck);
    socket.on("chat_marked_read", handleChatMarkedRead);
    socket.on("message_deleted", handleMessageDeleted);
    socket.on("message_reaction_updated", handleMessageReactionUpdated);
    
    return () => {
      socket.off("message_status_updated", handleMessageStatusUpdated);
      socket.off("message_delivered_ack", handleMessageDeliveredAck);
      socket.off("chat_marked_read", handleChatMarkedRead);
      socket.off("message_deleted", handleMessageDeleted);
      socket.off("message_reaction_updated", handleMessageReactionUpdated);
    };
  }, [socket, authUser, updateMessageStatus, updateMultipleMessagesStatus]);

  useEffect(() => {
    if (!authUser) return;
    
    const interval = setInterval(() => {
      getMyChatPartners();
    }, 10000);
    
    return () => clearInterval(interval);
  }, [authUser, getMyChatPartners]);

  if (!authUser) return null;
  if (isUsersLoading && chats.length === 0) return <UsersLoadingSkeleton />;
  if (chats.length === 0) return <NoChatsFound />;

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
                <div className="w-12 h-12 rounded-full bg-slate-600 flex items-center justify-center overflow-hidden">
                  <img 
                    src={chat.user?.profilePic || "/avatar.png"} 
                    alt={chat.user?.fullName} 
                    className="w-full h-full object-cover"
                  />
                </div>
                {isOnline && (
                  <div className="relative -mt-3 ml-8 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-slate-800"></div>
                )}
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
                    {reactionEmoji && (
                      <span className="text-sm flex-shrink-0">{reactionEmoji}</span>
                    )}
                    <p className={`text-sm truncate ${isDeleted ? 'text-slate-500 italic' : 'text-slate-400'}`}>
                      {formatLastMessage(chat)}
                    </p>
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