import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { useConfigStore } from "../store/useConfigStore";
import useMessageStatus from "../hooks/useMessageStatus";
import ChatHeader from "./ChatHeader";
import NoChatHistoryPlaceholder from "./NoChatHistoryPlaceholder";
import MessageInput from "./MessageInput";
import MessagesLoadingSkeleton from "./MessagesLoadingSkeleton";
import MessageStatusIcon from "./MessageStatusIcon";

function ChatContainer() {
  const [selectedImg, setSelectedImg] = useState(null);
  const [selectedImgIndex, setSelectedImgIndex] = useState(-1);
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);
  
  const {
    selectedUser,
    getMessagesByUserId,
    messagesCache,
    isMessagesLoading,
    updateMessageStatus,
  } = useChatStore();
  
  const { authUser, socket } = useAuthStore();
  const { chatWallpaper, themeColor, receiverColor, isTextBold, chatFontSize } = useConfigStore();
  const { sendMessageRead, sendChatOpened } = useMessageStatus();
  
  const messageEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const isFirstLoad = useRef(true);
  const chatOpenedSent = useRef(false);
  const lastSelectedUserId = useRef(null);

  // Obtener mensajes del chat actual desde el cache
  const messages = selectedUser ? (messagesCache[selectedUser._id] || []) : [];
  const imageMessages = messages.filter((message) => message.image);

  // Marcar como leido al abrir el chat
  useEffect(() => {
    if (selectedUser && selectedUser._id && socket && socket.connected) {
      if (lastSelectedUserId.current === selectedUser._id && chatOpenedSent.current) {
        return;
      }
      
      console.log(`ChatContainer: Abriendo chat con ${selectedUser.fullName}`);
      lastSelectedUserId.current = selectedUser._id;
      
      const unreadMessages = messages.filter(
        msg => msg.senderId === selectedUser._id && msg.status !== "read"
      );
      
      if (unreadMessages.length > 0) {
        console.log(`ChatContainer: Marcando ${unreadMessages.length} mensajes como leidos`);
        unreadMessages.forEach(msg => {
          updateMessageStatus(msg._id, "read");
        });
      }
      
      sendChatOpened(selectedUser._id);
      chatOpenedSent.current = true;
    }
    
    return () => {
      // No desuscribir nada aqui
    };
  }, [selectedUser, socket, messages, updateMessageStatus, sendChatOpened]);

  // Escuchar visibilidad de la pagina
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && selectedUser && socket && socket.connected && chatOpenedSent.current) {
        console.log("Ventana visible, marcando como leidos...");
        sendChatOpened(selectedUser._id);
      }
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [selectedUser, socket, sendChatOpened]);

  // Cargar mensajes al seleccionar usuario
  useEffect(() => {
    if (selectedUser && selectedUser._id) {
      console.log("Cargando mensajes para:", selectedUser.fullName);
      getMessagesByUserId(selectedUser._id);
      isFirstLoad.current = true;
      chatOpenedSent.current = false;
    }
  }, [selectedUser, getMessagesByUserId]);

  // Auto-scroll optimizado
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
    
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [messages]);

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
    }
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const openImageModal = (imageUrl, index) => {
    setSelectedImg(imageUrl);
    setSelectedImgIndex(index);
    setIsImageModalVisible(true);
  };

  const closeImageModal = () => {
    setIsImageModalVisible(false);
    setTimeout(() => {
      setSelectedImg(null);
      setSelectedImgIndex(-1);
    }, 200);
  };

  const navigateImage = (direction) => {
    if (!imageMessages.length) return;
    const nextIndex = (selectedImgIndex + direction + imageMessages.length) % imageMessages.length;
    setSelectedImg(imageMessages[nextIndex].image);
    setSelectedImgIndex(nextIndex);
  };

  useEffect(() => {
    if (!selectedImg) return;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") closeImageModal();
      if (event.key === "ArrowLeft") navigateImage(-1);
      if (event.key === "ArrowRight") navigateImage(1);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedImg, selectedImgIndex]);

  return (
    <div 
      className="flex flex-col h-full w-full relative transition-all duration-300"
      style={{
        backgroundImage: chatWallpaper ? `url(${chatWallpaper})` : "none",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: chatWallpaper ? "transparent" : "#000000",
      }}
    >
      {chatWallpaper && (
        <div className="absolute inset-0 bg-black/40 pointer-events-none z-0" />
      )}

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
                      }`}
                      style={{
                        backgroundColor: msg.senderId === authUser._id ? themeColor || "#06b6d4" : receiverColor || "#1e293b",
                        fontWeight: isTextBold ? "700" : "400",
                        fontSize: `${chatFontSize || 16}px`,
                      }}
                    >
                      {msg.image && (
                        <button
                          type="button"
                          onClick={() => openImageModal(msg.image, imageMessages.findIndex(img => img._id === msg._id))}
                          className="block mb-2 rounded-lg overflow-hidden max-w-full"
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
                      
                      <div className={`text-xs mt-2 opacity-75 flex items-center gap-1 ${msg.senderId === authUser._id ? "justify-end" : "justify-start"}`}>
                        <span>{formatMessageTime(msg.createdAt)}</span>
                        {msg.senderId === authUser._id && msg.status && (
                          <MessageStatusIcon status={msg.status} />
                        )}
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

      {/* Image Modal */}
      {selectedImg && (
        <div
          className={`fixed inset-0 z-[999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 transition-opacity duration-200 ${
            isImageModalVisible ? "opacity-100" : "opacity-0"
          }`}
          onClick={closeImageModal}
        >
          <div
            className={`relative max-w-5xl max-h-full transform transition-all duration-200 ${
              isImageModalVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeImageModal}
              className="absolute -top-12 right-0 z-10 w-10 h-10 rounded-full bg-slate-900/90 text-white flex items-center justify-center border border-slate-700 hover:bg-slate-800"
            >
              ✕
            </button>
            <img src={selectedImg} alt="Preview" className="max-w-full max-h-[90vh] object-contain rounded-xl" />
            
            {imageMessages.length > 1 && (
              <>
                <button
                  onClick={() => navigateImage(-1)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-slate-900/90 text-white border border-slate-700 flex items-center justify-center hover:bg-slate-800"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => navigateImage(1)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-slate-900/90 text-white border border-slate-700 flex items-center justify-center hover:bg-slate-800"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-xs text-slate-300 bg-slate-900/80 rounded-full px-3 py-1">
              {selectedImgIndex + 1} / {imageMessages.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatContainer;