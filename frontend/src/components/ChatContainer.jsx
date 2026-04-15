import { useEffect, useRef } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import ChatHeader from "./ChatHeader";
import NoChatHistoryPlaceholder from "./NoChatHistoryPlaceholder";
import MessageInput from "./MessageInput";
import MessagesLoadingSkeleton from "./MessagesLoadingSkeleton";

function ChatContainer() {
  const {
    selectedUser,
    getMessagesByUserId,
    messages,
    isMessagesLoading,
    subscribeToMessages,
    unsubscribeFromMessages,
    markMessagesAsRead
  } = useChatStore();
  const { authUser, socket } = useAuthStore();
  const messageEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (selectedUser && selectedUser._id) {
      console.log(" ChatContainer: Cargando mensajes para:", selectedUser.fullName);
      getMessagesByUserId(selectedUser._id);
      markMessagesAsRead(selectedUser._id);
      isFirstLoad.current = true;
    }

    return () => {
      console.log(" ChatContainer: Limpiando...");
    };
  }, [selectedUser, getMessagesByUserId, markMessagesAsRead]);

  // Suscripción separada del efecto principal
  useEffect(() => {
    if (selectedUser && socket) {
      console.log(" ChatContainer: Suscribiéndose a mensajes...");
      subscribeToMessages();
    }

    return () => {
      console.log(" ChatContainer: Desuscribiéndose de mensajes...");
      unsubscribeFromMessages();
    };
  }, [selectedUser, socket, subscribeToMessages, unsubscribeFromMessages]);

  // Scroll automático al final
  useEffect(() => {
    const scrollToBottom = () => {
      if (messageEndRef.current && messagesContainerRef.current) {
        const container = messagesContainerRef.current;
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
        
        if (isNearBottom || isFirstLoad.current) {
          messageEndRef.current.scrollIntoView({ 
            behavior: isFirstLoad.current ? "auto" : "smooth",
            block: "end"
          });
          isFirstLoad.current = false;
        }
      }
    };

    const timer = setTimeout(scrollToBottom, 150);
    return () => clearTimeout(timer);
  }, [messages, isMessagesLoading]);

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      });
    } else {
      return date.toLocaleDateString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      <ChatHeader />
      
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto w-full min-h-0 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800"
      >
        {messages.length > 0 && !isMessagesLoading ? (
          <div className="w-full min-h-full flex flex-col justify-end">
            <div className="w-full p-2 md:p-4 space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg._id || `temp-${msg.createdAt}-${msg.text}`}
                  className={`flex ${msg.senderId === authUser._id ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-xs md:max-w-md lg:max-w-lg xl:max-w-xl rounded-2xl px-4 py-3 ${
                      msg.senderId === authUser._id
                        ? "bg-cyan-600 text-white rounded-br-none"
                        : "bg-slate-800 text-slate-200 rounded-bl-none"
                    } ${msg.isOptimistic ? "opacity-70 animate-pulse" : ""}`}
                  >
                    {msg.image && (
                      <img 
                        src={msg.image} 
                        alt="Shared" 
                        className="rounded-lg mb-2 max-w-full h-auto object-cover max-h-64" 
                      />
                    )}
                    
                    {msg.text && (
                      <p className="break-words whitespace-pre-wrap text-base leading-relaxed">
                        {msg.text}
                      </p>
                    )}
                    
                    <div className={`text-xs mt-2 opacity-75 ${msg.senderId === authUser._id ? "text-right" : "text-left"}`}>
                      {formatMessageTime(msg.createdAt)}
                      {msg.isOptimistic && " ⏳"}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messageEndRef} className="h-4" />
            </div>
          </div>
        ) : isMessagesLoading ? (
          <MessagesLoadingSkeleton />
        ) : (
          <NoChatHistoryPlaceholder name={selectedUser?.fullName} />
        )}
      </div>

      <MessageInput />
    </div>
  );
}

export default ChatContainer;