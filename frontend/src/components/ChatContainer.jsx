import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, PlayIcon, XIcon, MoreVertical } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { useConfigStore } from "../store/useConfigStore";
import useMessageStatus from "../hooks/useMessageStatus";
import useMessageActions from "../hooks/useMessageActions";
import useMessageReactions from "../hooks/useMessageReactions";
import ChatHeader from "./ChatHeader";
import NoChatHistoryPlaceholder from "./NoChatHistoryPlaceholder";
import MessageInput from "./MessageInput";
import MessagesLoadingSkeleton from "./MessagesLoadingSkeleton";
import MessageStatusIcon from "./MessageStatusIcon";
import MessageReactions from "./MessageReactions";
import EmojiPickerButton from "./EmojiPickerButton";
import MessageContextMenu from "./MessageContextMenu";
import MessageInfoModal from "./MessageInfoModal";
import EditMessageModal from "./EditMessageModal";
import toast from "react-hot-toast";

function ChatContainer() {
  // Estados para tu carrusel multimedia
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(-1);
  const [isMediaModalVisible, setIsMediaModalVisible] = useState(false);
  
  // Estados para las nuevas funciones de tu compañero (menús, edición, info)
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMessageInfo, setSelectedMessageInfo] = useState(null);
  const [pendingEditMessage, setPendingEditMessage] = useState(null);
  
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
  const { copyMessageText, getMessageInfo, editMessage, deleteMessage, canEditMessage } = useMessageActions();
  const { addReaction, removeReaction, getUserReaction, availableEmojis } = useMessageReactions();
  
  const messageEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const closeModalTimerRef = useRef(null);
  const isFirstLoad = useRef(true);
  const chatOpenedSent = useRef(false);
  const lastSelectedUserId = useRef(null);

  // Obtener mensajes de la caché
  const messages = selectedUser ? (messagesCache[selectedUser._id] || []) : [];
  
  // Tu lógica para detectar videos e imágenes
  const getMediaType = (message) => {
    if (message.mediaType) return message.mediaType;
    if (typeof message.image === "string" && /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(message.image)) {
      return "video";
    }
    return "image";
  };

  const mediaMessages = messages.filter((message) => message.image);

  // Abrir menú contextual desde el botón
  const openMenu = (e, message) => {
    e.stopPropagation();
    if (message.isDeleted || message.text === "Mensaje eliminado") return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    
    setSelectedMessage(message);
    setContextMenu({
      x: rect.right - 20,
      y: rect.top + rect.height / 2,
      messageRect: rect
    });
  };

  // MODIFICADO: Cierre del menú sin limpiar selectedMessage inmediatamente
  const closeContextMenu = () => {
    setContextMenu(null);
    // ✅ No limpiar selectedMessage aquí para que el modal pueda usarlo
  };

  // ==================== ACCIONES DEL MENÚ ====================

  const handleCopy = async (text) => {
    await copyMessageText(text, selectedMessage?._id);
    closeContextMenu();
    setTimeout(() => setSelectedMessage(null), 100);
  };

  const handleInfo = async () => {
    const info = await getMessageInfo(selectedMessage?._id);
    setSelectedMessageInfo(info);
    setShowInfoModal(true);
    closeContextMenu();
    setTimeout(() => setSelectedMessage(null), 100);
  };

  // ✅ CORREGIDO: Guardar el mensaje antes de cerrar el menú
  const handleEdit = () => {
    if (!selectedMessage) return;
    
    if (!canEditMessage(selectedMessage)) {
      toast.error("Solo puedes editar mensajes enviados en los últimos 5 minutos");
      closeContextMenu();
      setTimeout(() => setSelectedMessage(null), 100);
      return;
    }
    
    // Guardar una copia del mensaje antes de cerrar el menú
    const messageToEdit = selectedMessage;
    
    // Cerrar el menú
    setContextMenu(null);
    
    // Abrir el modal con el mensaje guardado
    setTimeout(() => {
      setPendingEditMessage(messageToEdit);
      setShowEditModal(true);
    }, 10);
  };

  const handleDelete = async () => {
    const messageId = selectedMessage?._id;
    closeContextMenu();
    setTimeout(() => setSelectedMessage(null), 100);
    await deleteMessage(messageId, false);
  };

  const handleDeleteForEveryone = async () => {
    const messageId = selectedMessage?._id;
    closeContextMenu();
    setTimeout(() => setSelectedMessage(null), 100);
    await deleteMessage(messageId, true);
  };

  // ✅ CORREGIDO: Usar pendingEditMessage en lugar de selectedMessage
  const handleSaveEdit = async (newText) => {
    if (!pendingEditMessage) return;
    
    if (!canEditMessage(pendingEditMessage)) {
      toast.error("El tiempo para editar este mensaje ha expirado");
      setShowEditModal(false);
      setPendingEditMessage(null);
      setSelectedMessage(null);
      return;
    }
    
    const success = await editMessage(pendingEditMessage._id, newText, pendingEditMessage?.text);
    
    setShowEditModal(false);
    
    setTimeout(() => {
      setPendingEditMessage(null);
      setSelectedMessage(null);
    }, 100);
    
    if (success) {
      toast.success("Mensaje editado correctamente");
      setTimeout(() => {
        const messageEnd = document.getElementById('message-end');
        messageEnd?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const handleReply = () => {
    toast.success(`Respondiendo a: ${selectedMessage?.text?.substring(0, 30)}...`);
    closeContextMenu();
    setTimeout(() => setSelectedMessage(null), 100);
  };

  const handleForward = () => {
    toast.info("Función de reenviar en desarrollo");
    closeContextMenu();
    setTimeout(() => setSelectedMessage(null), 100);
  };

  const handlePin = () => {
    toast.info("Función de fijar en desarrollo");
    closeContextMenu();
    setTimeout(() => setSelectedMessage(null), 100);
  };

  const handleStar = () => {
    toast.info("Función de destacar en desarrollo");
    closeContextMenu();
    setTimeout(() => setSelectedMessage(null), 100);
  };

  const handleSelect = () => {
    toast.info("Función de seleccionar en desarrollo");
    closeContextMenu();
    setTimeout(() => setSelectedMessage(null), 100);
  };

  const handleReport = () => {
    toast.info("Función de reportar en desarrollo");
    closeContextMenu();
    setTimeout(() => setSelectedMessage(null), 100);
  };

  // ==================== REACCIONES ====================

  const handleAddReaction = async (messageId, emoji) => {
    await addReaction(messageId, emoji);
  };

  const handleRemoveReaction = async (messageId) => {
    await removeReaction(messageId);
  };

  // ==================== EFECTOS ====================

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
  }, [selectedUser, socket, messages, updateMessageStatus, sendChatOpened]);

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

  useEffect(() => {
    if (selectedUser && selectedUser._id) {
      console.log("Cargando mensajes para:", selectedUser.fullName);
      getMessagesByUserId(selectedUser._id);
      isFirstLoad.current = true;
      chatOpenedSent.current = false;
    }
  }, [selectedUser, getMessagesByUserId]);

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

  const isMessageDeleted = (msg) => {
    return msg.isDeleted || msg.text === "Mensaje eliminado";
  };

  return (
    <div 
      className="flex flex-col h-full w-full relative transition-all duration-300 overflow-x-hidden"
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

      <div className="relative z-10 flex flex-col h-full w-full min-h-0 overflow-x-hidden">
        <ChatHeader />
        
        <div 
            ref={messagesContainerRef}
            className="flex-1 chat-container-scroll w-full min-h-0"
          >
          {messages.length > 0 && !isMessagesLoading ? (
            <div className="w-full min-h-full flex flex-col justify-end overflow-x-hidden">
              <div className="w-full p-2 md:p-4 space-y-3 overflow-x-hidden">
                {messages.map((msg) => {
                  const isDeleted = isMessageDeleted(msg);
                  const isOwnMessage = msg.senderId?.toString() === authUser._id?.toString();
                  const userReaction = getUserReaction(msg.reactions, authUser._id);
                  
                  return (
                    <div
                      key={msg._id + (msg.isEdited ? '-edited-' + msg.editedAt : '')}
                      className={`group relative flex ${isOwnMessage ? "justify-end" : "justify-start"} items-center gap-2 overflow-x-hidden`}
                    >
                      {/* Botón de reacción flotante */}
                      {!isDeleted && (
                        <div className={`${isOwnMessage ? 'order-first' : 'order-last'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                          <EmojiPickerButton
                            onEmojiSelect={(emoji) => handleAddReaction(msg._id, emoji)}
                            currentEmoji={userReaction}
                            size="sm"
                          />
                        </div>
                      )}
                      
                      {/* Burbuja de mensaje */}
                      <div
                        className={`relative max-w-[85%] sm:max-w-[75%] md:max-w-[65%] lg:max-w-[55%] rounded-2xl px-4 py-3 shadow-md break-words ${
                          isOwnMessage
                            ? "text-white rounded-br-none"
                            : "text-slate-100 rounded-bl-none border border-slate-700/20"
                        } ${isDeleted ? 'opacity-60' : ''} ${msg.isOptimistic ? "opacity-70 animate-pulse" : ""}`}
                        style={{
                          backgroundColor: isOwnMessage ? themeColor || "#06b6d4" : receiverColor || "#1e293b",
                          fontWeight: isTextBold ? "700" : "400",
                          fontSize: `${chatFontSize || 16}px`,
                        }}
                      >
                        {msg.image && !isDeleted && getMediaType(msg) === "video" ? (
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
                        ) : msg.image && !isDeleted ? (
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
                          <p className={`break-words whitespace-pre-wrap text-base leading-relaxed w-full ${isDeleted ? 'italic' : ''}`}>
                            {isDeleted ? "Mensaje eliminado" : msg.text}
                          </p>
                        )}
                        
                        {msg.isEdited && !isDeleted && (
                          <span 
                            className="text-[10px] opacity-60 ml-1 inline-flex items-center gap-0.5"
                            title={`Editado ${formatMessageTime(msg.editedAt)}`}
                          >
                            (editado)
                          </span>
                        )}
                        
                        <div className={`text-xs mt-2 opacity-75 flex items-center gap-1 flex-wrap ${isOwnMessage ? "justify-end" : "justify-start"}`}>
                          <span>{formatMessageTime(msg.createdAt)}</span>
                          {msg.isOptimistic && " ⏳"}
                          {isOwnMessage && msg.status && !isDeleted && !msg.isOptimistic && (
                            <MessageStatusIcon status={msg.status} />
                          )}
                        </div>
                        
                        {/* Reacciones debajo del mensaje */}
                        {msg.reactions && msg.reactions.length > 0 && !isDeleted && (
                          <MessageReactions
                            reactions={msg.reactions}
                            onAddReaction={(emoji) => handleAddReaction(msg._id, emoji)}
                            onRemoveReaction={() => handleRemoveReaction(msg._id)}
                            currentUserId={authUser._id}
                            availableEmojis={availableEmojis}
                            isOwnMessage={isOwnMessage}
                          />
                        )}
                      </div>
                      
                      {/* Botón de menú (tres puntos) */}
                      {!isDeleted && (
                        <button
                          onClick={(e) => openMenu(e, msg)}
                          className={`p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-700 ${
                            isOwnMessage ? 'order-last' : 'order-first'
                          }`}
                          title="Opciones"
                        >
                          <MoreVertical className="w-4 h-4 text-slate-400" />
                        </button>
                      )}
                    </div>
                  );
                })}
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

      {/* Menú contextual */}
      {contextMenu && selectedMessage && (
        <MessageContextMenu
          message={selectedMessage}
          position={contextMenu}
          onClose={closeContextMenu}
          onCopy={handleCopy}
          onInfo={handleInfo}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onDeleteForEveryone={handleDeleteForEveryone}
          onReply={handleReply}
          onForward={handleForward}
          onPin={handlePin}
          onStar={handleStar}
          onSelect={handleSelect}
          onReport={handleReport}
          isSender={selectedMessage?.senderId?.toString() === authUser._id?.toString()}
          isGroup={false}
        />
      )}

      {/* Modal de información */}
      {showInfoModal && selectedMessageInfo && (
        <MessageInfoModal
          message={selectedMessageInfo}
          onClose={() => {
            setShowInfoModal(false);
            setSelectedMessageInfo(null);
          }}
        />
      )}

      {/* Modal de edición - ✅ USAR pendingEditMessage */}
      {showEditModal && pendingEditMessage && (
        <EditMessageModal
          message={pendingEditMessage}
          onSave={handleSaveEdit}
          onClose={() => {
            setShowEditModal(false);
            setPendingEditMessage(null);
            setSelectedMessage(null);
          }}
        />
      )}
    </div>
  );
}

export default ChatContainer;