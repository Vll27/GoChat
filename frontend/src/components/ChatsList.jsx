import { useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import UsersLoadingSkeleton from "./UsersLoadingSkeleton";
import NoChatsFound from "./NoChatsFound";
import { getShortLastSeen } from "../utils/lastSeenFormatter";

function ChatsList({ compact = false }) {
  const { 
    getMyChatPartners, 
    chats, 
    isUsersLoading, 
    setSelectedUser,
    selectedUser,
    markMessagesAsRead
  } = useChatStore();
  const { onlineUsers, socket } = useAuthStore();

  useEffect(() => {
    console.log("📋 Cargando chats...");
    getMyChatPartners();
  }, [getMyChatPartners]);

  useEffect(() => {
    if (!socket) return;
    
    const handleChatsUpdated = () => {
      console.log("🔄 Actualizando lista de chats...");
      getMyChatPartners();
    };
    
    const handleUserStatusChange = ({ userId, status, lastSeen }) => {
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

    socket.on("chatsUpdated", handleChatsUpdated);
    socket.on("userStatusChanged", handleUserStatusChange);

    return () => {
      socket.off("chatsUpdated", handleChatsUpdated);
      socket.off("userStatusChanged", handleUserStatusChange);
    };
  }, [socket, getMyChatPartners]);

  const handleChatClick = (chat) => {
    console.log("💬 Seleccionando chat:", chat.user.fullName);
    setSelectedUser(chat.user);
    markMessagesAsRead(chat.user._id);
  };

  const formatLastMessage = (chat) => {
    if (!chat.lastMessage) return "Sin mensajes";
    
    const lastMsg = chat.lastMessage;
    if (lastMsg.text) {
      return lastMsg.text.length > 30 
        ? lastMsg.text.substring(0, 30) + '...' 
        : lastMsg.text;
    }
    if (lastMsg.mediaType === "video") return "🎥 Video";
    if (lastMsg.image) return "📷 Imagen";
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
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getCompactTooltip = (chat) => {
    const lastMessage = formatLastMessage(chat);
    const time = chat.lastMessage ? formatTime(chat.lastMessage.createdAt) : '';
    const isOnline = onlineUsers.includes(chat.user?._id);
    const lastSeen = getShortLastSeen(chat.user?.lastSeen, isOnline);
    return `${chat.user?.fullName}\n${lastMessage}${time ? `\n${time}` : ''}${lastSeen ? `\n${lastSeen}` : ''}`;
  };

  if (isUsersLoading) return <UsersLoadingSkeleton />;
  if (chats.length === 0) return <NoChatsFound />;

  return (
    <div className="space-y-2">
      {chats.map((chat) => {
        const isOnline = onlineUsers.includes(chat.user?._id);
        const shortLastSeen = getShortLastSeen(chat.user?.lastSeen, isOnline);
        
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
                  <span className="bg-cyan-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center text-[10px]">
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
                
                <p className="text-sm text-slate-400 truncate">
                  {formatLastMessage(chat)}
                </p>
                
                {chat.unreadCount > 0 && (
                  <div className="flex justify-end mt-1">
                    <span className="bg-cyan-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
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