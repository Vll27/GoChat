import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, XIcon } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import ChatHeader from "./ChatHeader";
import NoChatHistoryPlaceholder from "./NoChatHistoryPlaceholder";
import MessageInput from "./MessageInput";
import MessagesLoadingSkeleton from "./MessagesLoadingSkeleton";
import { useConfigStore } from "../store/useConfigStore"; // 1. Importamos el store de configuración

function ChatContainer() {
  const [selectedImg, setSelectedImg] = useState(null);
  const [selectedImgIndex, setSelectedImgIndex] = useState(-1);
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);
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
  const closeModalTimerRef = useRef(null);

  const imageMessages = messages.filter((message) => message.image);

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

  const openImageModal = (imageUrl, index) => {
    if (closeModalTimerRef.current) {
      clearTimeout(closeModalTimerRef.current);
    }

    setSelectedImg(imageUrl);
    setSelectedImgIndex(index);
    setIsImageModalVisible(false);

    requestAnimationFrame(() => {
      setIsImageModalVisible(true);
    });
  };

  const closeImageModal = () => {
    setIsImageModalVisible(false);

    if (closeModalTimerRef.current) {
      clearTimeout(closeModalTimerRef.current);
    }

    closeModalTimerRef.current = setTimeout(() => {
      setSelectedImg(null);
      setSelectedImgIndex(-1);
    }, 180);
  };

  const navigateImage = (direction) => {
    if (!imageMessages.length) return;

    const nextIndex = (selectedImgIndex + direction + imageMessages.length) % imageMessages.length;
    const nextImage = imageMessages[nextIndex];

    if (!nextImage?.image) return;

    setSelectedImg(nextImage.image);
    setSelectedImgIndex(nextIndex);
  };

  useEffect(() => {
    if (!selectedImg) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeImageModal();
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        event.stopPropagation();
        navigateImage(-1);
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        event.stopPropagation();
        navigateImage(1);
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [selectedImg, selectedImgIndex, imageMessages]);

  useEffect(() => {
    return () => {
      if (closeModalTimerRef.current) {
        clearTimeout(closeModalTimerRef.current);
      }
    };
  }, []);

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
                        <button
                        type="button"
                        onClick={() => openImageModal(msg.image, imageMessages.findIndex((imageMessage) => imageMessage._id === msg._id))}
                        className="block mb-2 rounded-lg overflow-hidden max-w-full"
                        title="Abrir imagen"
                      >
                        <img 
                            src={msg.image} 
                            alt="Imagen enviada" 
                            className="rounded-lg max-w-full h-auto object-cover max-h-64 hover:opacity-90 transition-opacity cursor-zoom-in" 
                          />
                        </button>
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

      {selectedImg && (
        <div
          className={`fixed inset-0 z-[999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity duration-200 ${
            isImageModalVisible ? "opacity-100" : "opacity-0"
          }`}
          onClick={closeImageModal}
        >
          <div
            className={`relative max-w-5xl max-h-full transform transition-all duration-200 ease-out ${
              isImageModalVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeImageModal}
              className="absolute -top-3 -right-3 z-10 w-10 h-10 rounded-full bg-slate-900/90 text-white flex items-center justify-center border border-slate-700 hover:bg-slate-800 transition-colors"
              aria-label="Cerrar imagen"
              title="Cerrar"
            >
              ✕
            </button>

            <img
              src={selectedImg}
              alt="Preview fullscreen"
              className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
            />

            {imageMessages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => navigateImage(-1)}
                  className="absolute left-[-3.5rem] top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-slate-900/90 text-white border border-slate-700 flex items-center justify-center hover:bg-slate-800 transition-colors"
                  aria-label="Imagen anterior"
                  title="Anterior"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={() => navigateImage(1)}
                  className="absolute right-[-3.5rem] top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-slate-900/90 text-white border border-slate-700 flex items-center justify-center hover:bg-slate-800 transition-colors"
                  aria-label="Imagen siguiente"
                  title="Siguiente"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            <div className="absolute bottom-[-2.5rem] left-1/2 -translate-x-1/2 text-xs text-slate-300 bg-slate-900/80 border border-slate-700 rounded-full px-3 py-1">
              {selectedImgIndex + 1} / {imageMessages.length}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export default ChatContainer;