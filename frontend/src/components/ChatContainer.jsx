import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, PlayIcon, XIcon } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import ChatHeader from "./ChatHeader";
import NoChatHistoryPlaceholder from "./NoChatHistoryPlaceholder";
import MessageInput from "./MessageInput";
import MessagesLoadingSkeleton from "./MessagesLoadingSkeleton";

function ChatContainer() {
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(-1);
  const [isMediaModalVisible, setIsMediaModalVisible] = useState(false);
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
  const closeModalTimerRef = useRef(null);

  const getMediaType = (message) => {
    if (message.mediaType) return message.mediaType;
    if (typeof message.image === "string" && /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(message.image)) {
      return "video";
    }
    return "image";
  };

  const mediaMessages = messages.filter((message) => message.image);

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

  const openMediaModal = (mediaUrl, index) => {
    if (closeModalTimerRef.current) {
      clearTimeout(closeModalTimerRef.current);
    }

    setSelectedMedia(mediaUrl);
    setSelectedMediaIndex(index);
    setIsMediaModalVisible(false);

    requestAnimationFrame(() => {
      setIsMediaModalVisible(true);
    });
  };

  const closeMediaModal = () => {
    setIsMediaModalVisible(false);

    if (closeModalTimerRef.current) {
      clearTimeout(closeModalTimerRef.current);
    }

    closeModalTimerRef.current = setTimeout(() => {
      setSelectedMedia(null);
      setSelectedMediaIndex(-1);
    }, 180);
  };

  const navigateMedia = (direction) => {
    if (!mediaMessages.length) return;

    const nextIndex = (selectedMediaIndex + direction + mediaMessages.length) % mediaMessages.length;
    const nextMedia = mediaMessages[nextIndex];

    if (!nextMedia?.image) return;

    setSelectedMedia(nextMedia.image);
    setSelectedMediaIndex(nextIndex);
  };

  useEffect(() => {
    if (!selectedMedia) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeMediaModal();
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        event.stopPropagation();
        navigateMedia(-1);
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        event.stopPropagation();
        navigateMedia(1);
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [selectedMedia, selectedMediaIndex, mediaMessages]);

  useEffect(() => {
    return () => {
      if (closeModalTimerRef.current) {
        clearTimeout(closeModalTimerRef.current);
      }
    };
  }, []);

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
                    {msg.image && getMediaType(msg) === "video" ? (
                      <button
                        type="button"
                        onClick={() => openMediaModal(msg.image, mediaMessages.findIndex((mediaMessage) => mediaMessage._id === msg._id))}
                        className="group relative block mb-2 rounded-lg overflow-hidden max-w-full"
                        title="Abrir video"
                      >
                        <video
                          src={msg.image}
                          muted
                          playsInline
                          preload="metadata"
                          className="rounded-lg max-w-full h-auto object-cover max-h-64 hover:opacity-90 transition-opacity cursor-zoom-in bg-black"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-100 transition-opacity group-hover:bg-black/30">
                          <div className="w-12 h-12 rounded-full bg-black/60 border border-white/20 flex items-center justify-center shadow-lg backdrop-blur-sm">
                            <PlayIcon className="w-5 h-5 text-white ml-0.5" />
                          </div>
                        </div>
                      </button>
                    ) : msg.image ? (
                      <button
                        type="button"
                        onClick={() => openMediaModal(msg.image, mediaMessages.findIndex((mediaMessage) => mediaMessage._id === msg._id))}
                        className="block mb-2 rounded-lg overflow-hidden max-w-full"
                        title="Abrir imagen"
                      >
                        <img 
                          src={msg.image} 
                          alt="Shared" 
                          className="rounded-lg max-w-full h-auto object-cover max-h-64 hover:opacity-90 transition-opacity cursor-zoom-in" 
                        />
                      </button>
                    ) : null}
                    
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

      {selectedMedia && (
        <div
          className={`fixed inset-0 z-[999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity duration-200 ${
            isMediaModalVisible ? "opacity-100" : "opacity-0"
          }`}
          onClick={closeMediaModal}
        >
          <div
            className={`relative max-w-5xl max-h-full transform transition-all duration-200 ease-out ${
              isMediaModalVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeMediaModal}
              className="absolute -top-3 -right-3 z-10 w-10 h-10 rounded-full bg-slate-900/90 text-white flex items-center justify-center border border-slate-700 hover:bg-slate-800 transition-colors"
              aria-label="Cerrar imagen"
              title="Cerrar"
            >
              ✕
            </button>

            {selectedMediaIndex > -1 && getMediaType(mediaMessages[selectedMediaIndex]) === "video" ? (
              <video
                src={selectedMedia}
                controls
                autoPlay
                playsInline
                className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl bg-black"
              />
            ) : (
              <img
                src={selectedMedia}
                alt="Preview fullscreen"
                className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
              />
            )}

            {mediaMessages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => navigateMedia(-1)}
                  className="absolute left-[-3.5rem] top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-slate-900/90 text-white border border-slate-700 flex items-center justify-center hover:bg-slate-800 transition-colors"
                  aria-label="Medio anterior"
                  title="Anterior"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={() => navigateMedia(1)}
                  className="absolute right-[-3.5rem] top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-slate-900/90 text-white border border-slate-700 flex items-center justify-center hover:bg-slate-800 transition-colors"
                  aria-label="Medio siguiente"
                  title="Siguiente"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            <div className="absolute bottom-[-2.5rem] left-1/2 -translate-x-1/2 text-xs text-slate-300 bg-slate-900/80 border border-slate-700 rounded-full px-3 py-1">
              {selectedMediaIndex + 1} / {mediaMessages.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatContainer;