import { useRef, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useDebouncedCallback } from "use-debounce";
import useKeyboardSound from "../hooks/useKeyboardSound";
import { useChatStore } from "../store/useChatStore";
import useMessageStatus from "../hooks/useMessageStatus";
import toast from "react-hot-toast";
import { ImageIcon, SendIcon, XIcon, SmileIcon } from "lucide-react";

function MessageInput() {
  const { playRandomKeyStrokeSound } = useKeyboardSound();
  const { messageInputText, setMessageInputText, selectedUser } = useChatStore();
  const [imagePreview, setImagePreview] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0 });
  const fileInputRef = useRef(null);
  const textInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const emojiButtonRef = useRef(null);
  const emojiPickerRef = useRef(null);
  
  const { sendMessage, isSoundEnabled } = useChatStore();
  const { sendTypingStart, sendTypingStop } = useMessageStatus();

  // Calcular posición del emoji picker
  const calculatePickerPosition = useCallback(() => {
    if (!emojiButtonRef.current) return;
    
    const buttonRect = emojiButtonRef.current.getBoundingClientRect();
    const pickerWidth = 340;
    const pickerHeight = 320;
    
    // Espacio disponible
    const spaceBelow = window.innerHeight - buttonRect.bottom;
    const spaceAbove = buttonRect.top;
    
    let top, left;
    
    // Mostrar arriba si hay espacio, si no, abajo
    if (spaceAbove >= pickerHeight + 10) {
      top = buttonRect.top - pickerHeight - 10;
    } else if (spaceBelow >= pickerHeight + 10) {
      top = buttonRect.bottom + 10;
    } else {
      // Si no hay espacio, mostrar arriba con scroll
      top = 10;
    }
    
    // Calcular left centrado con el botón
    left = buttonRect.left - (pickerWidth / 2) + (buttonRect.width / 2);
    
    // Asegurar que no se salga de la pantalla
    if (left < 10) left = 10;
    if (left + pickerWidth > window.innerWidth - 10) {
      left = window.innerWidth - pickerWidth - 10;
    }
    
    setPickerPosition({ top, left });
  }, []);

  // Abrir/cerrar picker
  const toggleEmojiPicker = () => {
    if (!showEmojiPicker) {
      calculatePickerPosition();
      setShowEmojiPicker(true);
    } else {
      setShowEmojiPicker(false);
    }
  };

  // Cerrar emoji picker al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target) &&
          emojiButtonRef.current && !emojiButtonRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };
    
    const handleEscape = (event) => {
      if (event.key === 'Escape' && showEmojiPicker) {
        setShowEmojiPicker(false);
      }
    };
    
    const handleScroll = () => {
      if (showEmojiPicker) {
        calculatePickerPosition();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [showEmojiPicker, calculatePickerPosition]);

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
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      sendTypingStop(selectedUser._id);
    }
    
    const trimmedText = messageInputText.trim();
    if (!trimmedText && !imagePreview) return;
    if (isSoundEnabled) playRandomKeyStrokeSound();

    const file = fileInputRef.current?.files?.[0];
    let payloadForServer;
    if (file) {
      const fd = new FormData();
      if (trimmedText) fd.append("text", trimmedText);
      fd.append("image", file);
      payloadForServer = fd;
    } else {
      payloadForServer = { text: trimmedText, image: imagePreview };
    }

    await sendMessage({
      text: trimmedText, 
      image: imagePreview,
    }, payloadForServer);

    setMessageInputText("");
    setImagePreview(null);
    setShowEmojiPicker(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file.type.startsWith("image/")) {
      toast.error("Solo se permiten imágenes");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
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
      {imagePreview && (
        <div className="max-w-3xl mx-auto mb-3 flex items-center">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-lg border-2 border-cyan-500/50"
            />
            <button
              onClick={removeImage}
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
          onClick={toggleEmojiPicker}
          className="p-2 rounded-full bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 transition-all duration-200 hover:scale-110"
        >
          <SmileIcon className="w-5 h-5" />
        </button>

        <div className="flex-1">
          <input
            ref={textInputRef}
            type="text"
            value={messageInputText}
            onChange={(e) => {
              setMessageInputText(e.target.value);
              if (isSoundEnabled) playRandomKeyStrokeSound();
              handleTyping();
            }}
            onKeyPress={handleKeyPress}
            className="w-full bg-slate-700/50 border border-slate-600 rounded-full py-3 px-5 text-slate-200 placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all duration-200"
            placeholder="Escribe un mensaje..."
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleImageChange}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-full bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 transition-all duration-200 hover:scale-110"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          
          <button
            type="submit"
            disabled={!messageInputText.trim() && !imagePreview}
            className="p-2 rounded-full bg-gradient-to-r from-cyan-500 to-cyan-600 text-white hover:from-cyan-600 hover:to-cyan-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 hover:scale-110 shadow-lg shadow-cyan-500/25"
          >
            <SendIcon className="w-5 h-5" />
          </button>
        </div>
      </form>

      {/* Emoji Picker con posicionamiento dinámico */}
      {showEmojiPicker && createPortal(
        <div 
          ref={emojiPickerRef}
          className="bg-slate-800 rounded-xl shadow-2xl border border-slate-700 p-2 animate-fade-in"
          style={{
            position: 'fixed',
            top: pickerPosition.top,
            left: pickerPosition.left,
            zIndex: 999999,
            width: '340px',
            maxWidth: 'calc(100vw - 40px)'
          }}
        >
          {/* Flecha indicadora */}
          <div 
            className="absolute w-3 h-3 bg-slate-800 rotate-45 border-t border-l border-slate-700"
            style={{
              top: pickerPosition.top + 5,
              left: pickerPosition.left + 20,
              transform: 'rotate(45deg)'
            }}
          />
          
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-700">
            <span className="text-xs text-slate-400">Emojis</span>
            <button
              onClick={() => setShowEmojiPicker(false)}
              className="p-1 rounded-full hover:bg-slate-700 transition-colors"
            >
              <XIcon className="w-3 h-3 text-slate-400" />
            </button>
          </div>
          <div className="grid grid-cols-8 gap-1 max-h-60 overflow-y-auto custom-scrollbar">
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
          <div className="text-center text-[10px] text-slate-500 mt-2 pt-1 border-t border-slate-700">
            Click para insertar emoji
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default MessageInput;