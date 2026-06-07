import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useDebouncedCallback } from "use-debounce";
import useKeyboardSound from "../hooks/useKeyboardSound";
import { useMediaPreview } from "../hooks/useMediaPreview";
import { useChatStore } from "../store/useChatStore";
import useMessageStatus from "../hooks/useMessageStatus";
import toast from "react-hot-toast";
import { ImageIcon, SendIcon, XIcon, SmileIcon } from "lucide-react";

function MessageInput() {
  const { playRandomKeyStrokeSound } = useKeyboardSound();
// Traemos el estado global de tu compañero para los borradores
  const { messageInputText, setMessageInputText, selectedUser } = useChatStore();
  
  // Creamos un puente para que tu código actual siga funcionando sin cambios
  const text = messageInputText || "";
  const setText = setMessageInputText || (() => {});

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("frequently");

  // Tu hook para manejar fotos y videos
  const {
    mediaFile,
    mediaPreview,
    mediaType,
    selectMedia,
    clearMedia,
  } = useMediaPreview();

  const fileInputRef = useRef(null);
  const textInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const emojiButtonRef = useRef(null);
  const emojiPickerRef = useRef(null);
  
  const { sendMessage, isSoundEnabled } = useChatStore();
  const { sendTypingStart, sendTypingStop } = useMessageStatus();

  // Cerrar emoji picker al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target) &&
          emojiButtonRef.current && !emojiButtonRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced typing indicator (WhatsApp style)
  const debouncedTypingStart = useDebouncedCallback(() => {
    if (selectedUser) {
      sendTypingStart(selectedUser._id);
    }
  }, 300);

  const handleTyping = () => {
    if (!selectedUser) return;
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    } else {
      debouncedTypingStart();
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStop(selectedUser._id);
      typingTimeoutRef.current = null;
    }, 1000);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
// Indicador de "dejó de escribir" de tu compañero
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      sendTypingStop(selectedUser._id);
    }

    const trimmedText = text.trim();
    if (!trimmedText && !mediaFile) return;
    if (isSoundEnabled) playRandomKeyStrokeSound();

    let payloadForServer;
    if (mediaFile) {
      const fd = new FormData();
      if (trimmedText) fd.append("text", trimmedText);
      fd.append("image", mediaFile);
      payloadForServer = fd;
    } else {
      payloadForServer = { text: trimmedText, image: mediaPreview, mediaType };
    }

    if (payloadForServer instanceof FormData) {
      for (let [key, value] of payloadForServer.entries()) {
        console.log(`FormData Entry - Key: ${key}, Value:`, value);
      }
    } else {
      console.log("Payload JSON enviado:", payloadForServer);
    }

    try {
      await sendMessage({
        text: trimmedText,
        image: mediaPreview,
        mediaType,
      }, payloadForServer);

      setText("");
      clearMedia();
      setShowEmojiPicker(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Error enviando mensaje multimedia:", error);
    }
  };

  const handleMediaChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      selectMedia(file);
    } catch (error) {
      toast.error("Please select an image or video file");
      return;
    }
  };

  const removeMedia = () => {
    clearMedia();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleEmojiClick = (emoji) => {
    setMessageInputText(messageInputText + emoji);
    textInputRef.current?.focus();
    handleTyping();
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    } else {
      handleTyping();
    }
  };

  const emojis = [
    '😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰',
    '😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🤩','🥳','😏',
    '😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠',
    '😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥',
    '😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵','🤐',
    '🥴','🤢','🤮','🤧','😷','🤒','🤕','🤑','🤠','👋','🤚','🖐️','✋','🖖','👌','🤌',
    '🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','👊','✊',
    '🤛','🤜','🤝','🙏','✍️','🤳','💪','❤️','🔥','🎉','✨','💀','⭐','🌙','⚡','🌈'
  ];

  return (
<div className="p-4 border-t border-slate-700/50 bg-gradient-to-r from-slate-900/50 to-slate-800/50 backdrop-blur-sm">
      {mediaPreview && (
        <div className="max-w-3xl mx-auto mb-3 flex items-center">
          <div className="relative">
            {mediaType === "video" ? (
              <video
                src={mediaPreview}
                controls
                className="w-28 h-20 object-cover rounded-lg border-2 border-cyan-500/50 bg-black"
              />
            ) : (
              <img
                src={mediaPreview}
                alt="Preview"
                className="w-20 h-20 object-cover rounded-lg border-2 border-cyan-500/50"
              />
            )}
            <button
              onClick={clearMedia}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-white hover:bg-red-600 transition-colors"
              type="button"
            >
              <XIcon className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex items-center gap-3">
        <button
          ref={emojiButtonRef}
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="p-2 rounded-full bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 transition-all duration-200 hover:scale-110"
        >
          <SmileIcon className="w-5 h-5" />
        </button>

        <div className="flex-1">
          <input
            ref={textInputRef}
            type="text"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (typeof isSoundEnabled !== 'undefined' && isSoundEnabled && typeof playRandomKeyStrokeSound === 'function') {
                playRandomKeyStrokeSound();
              }
              if (typeof handleTyping === 'function') handleTyping();
            }}
            onKeyPress={typeof handleKeyPress === 'function' ? handleKeyPress : undefined}
            className="w-full bg-slate-700/50 border border-slate-600 rounded-full py-3 px-5 text-slate-200 placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all duration-200"
            placeholder="Escribe un mensaje..."
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="file"
            accept="image/*,video/*"
            ref={fileInputRef}
            onChange={handleMediaChange}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`p-2 rounded-full transition-all duration-200 hover:scale-110 ${
              mediaPreview 
                ? "bg-cyan-600 text-white" 
                : "bg-slate-700/50 text-slate-300 hover:text-slate-100 hover:bg-slate-600/50"
            }`}
            title="Subir archivo"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          
          <button
            type="submit"
            disabled={!text.trim() && !mediaFile}
            className="p-2 flex items-center justify-center rounded-full bg-gradient-to-r from-cyan-500 to-cyan-600 text-white hover:from-cyan-600 hover:to-cyan-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 hover:scale-110 shadow-lg shadow-cyan-500/25"
            title="Enviar mensaje"
          >
            <SendIcon className="w-5 h-5" />
          </button>
        </div>
      </form>

      {/* Emoji Picker usando Portal - se renderiza en el body */}
      {showEmojiPicker && createPortal(
        <div 
          ref={emojiPickerRef}
          className="bg-slate-800 rounded-xl shadow-2xl border border-slate-700 p-2"
          style={{
            position: 'fixed',
            bottom: '80px',
            left: '20px',
            zIndex: 999999,
            width: '340px',
            maxWidth: 'calc(100vw - 40px)'
          }}
        >
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-700">
            <span className="text-xs text-slate-400">Emojis</span>
            <button
              onClick={() => setShowEmojiPicker(false)}
              className="p-1 rounded-full hover:bg-slate-700"
            >
              <XIcon className="w-3 h-3 text-slate-400" />
            </button>
          </div>
          <div className="grid grid-cols-8 gap-1 max-h-60 overflow-y-auto">
            {emojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleEmojiClick(emoji)}
                className="text-2xl hover:bg-slate-700 rounded-lg p-1 transition-all duration-150 hover:scale-125"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default MessageInput;