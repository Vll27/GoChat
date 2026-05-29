import { useEffect, useRef } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import ChatHeader from "./ChatHeader";
import NoChatHistoryPlaceholder from "./NoChatHistoryPlaceholder";
import MessageInput from "./MessageInput";
import MessagesLoadingSkeleton from "./MessagesLoadingSkeleton";
import { useConfigStore } from "../store/useConfigStore"; // 1. Importamos el store de configuración

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
  
  const { chatWallpaper } = useConfigStore(); // 2. Consumimos el fondo definitivo guardado
  const { themeColor, receiverColor, isTextBold, chatFontSize, globalFont } = useConfigStore();

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
    /* 3. CORREGIDO: Aplicamos el fondo dinámico en la raíz del contenedor del chat */
    <div 
      className="flex flex-col h-full w-full relative transition-all duration-300 bg-black"
      style={{
        backgroundImage: chatWallpaper ? `url(${chatWallpaper})` : "none",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* 4. OPTIMIZACIÓN UX: Capa oscura reguladora de contraste para proteger la lectura */}
      {chatWallpaper && (
        <div className="absolute inset-0 bg-black/40 pointer-events-none z-0" />
      )}

      {/* 5. ESTRUCTURA: Envolvemos los componentes internos con z-10 y posición relativa 
          para que se rendericen por encima del fondo o de la capa oscura */}
      <div className="relative z-10 flex flex-col h-full w-full min-h-0">
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
                      className={`max-w-xs md:max-w-md lg:max-w-lg xl:max-w-xl rounded-2xl px-4 py-3 shadow-md ${
      msg.senderId === authUser._id
        ? "text-white rounded-br-none" 
        : "text-slate-100 rounded-bl-none border border-slate-700/20"
    } ${msg.isOptimistic ? "opacity-70 animate-pulse" : ""}`}
    // Controlamos el fondo de forma dinámica e infalible mediante style
    style={
      msg.senderId === authUser._id
        ? {
            backgroundColor: "var(--theme-primary)",
            fontWeight: "var(--chat-font-weight)",
            fontSize: "var(--chat-font-size)",
          }
        : {
            backgroundColor: "var(--theme-receiver)",
            fontWeight: "var(--chat-font-weight)",
            fontSize: "var(--chat-font-size)",
          }
    }
                    >
                      {msg.image && (
                        <img 
                          src={msg.image} 
                          alt="Imagen enviada" 
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
    </div>
  );
}

export default ChatContainer;