import { useRef, useState, useEffect } from "react";
import useKeyboardSound from "../hooks/useKeyboardSound";
import { useChatStore } from "../store/useChatStore";
import toast from "react-hot-toast";
import { ImageIcon, SendIcon, XIcon, SmileIcon, SearchIcon } from "lucide-react";

function MessageInput() {
  const { playRandomKeyStrokeSound } = useKeyboardSound();
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("frequently");

  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const textInputRef = useRef(null);
  const searchInputRef = useRef(null);

  const { sendMessage, isSoundEnabled } = useChatStore();

  // Categorías de emojis como WhatsApp/Telegram
  const emojiCategories = {
    frequently: {
      name: "Frecuentes",
      emojis: ['😂', '❤️', '😍', '🤣', '😊', '🙏', '🥰', '😎', '👍', '😁', '🔥', '🙌', '😘', '💕', '😉', '👏', '😜', '🤔', '🤗', '🎉']
    },
    people: {
      name: "Caritas",
      emojis: [
        '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
        '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
        '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩',
        '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
        '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬',
        '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗'
      ]
    },
    gestures: {
      name: "Manos",
      emojis: [
        '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞',
        '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍',
        '👎', '👊', '✊', '🤛', '🤜', '🤝', '🙏', '✍️', '🤳', '💪'
      ]
    },
    nature: {
      name: "Animales",
      emojis: [
        '🐵', '🐒', '🦍', '🦧', '🐶', '🐕', '🦮', '🐩', '🐺', '🦊',
        '🦝', '🐱', '🐈', '🦁', '🐯', '🐅', '🐆', '🐴', '🐎', '🦄',
        '🦓', '🦌', '🐮', '🐂', '🐃', '🐄', '🐷', '🐖', '🐗', '🐽',
        '🐸', '🐲', '🐉', '🦖', '🦕', '🐢', '🐊', '🐍', '🦎', '🐇'
      ]
    },
    food: {
      name: "Comida",
      emojis: [
        '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈',
        '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦',
        '🍕', '🌭', '🍔', '🍟', '🥪', '🌮', '🌯', '🥗', '🍿', '🧁',
        '🍰', '🎂', '🍪', '🍩', '🍫', '🍬', '🍭', '🍮', '🍯', '☕'
      ]
    },
    activities: {
      name: "Actividades",
      emojis: [
        '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸',
        '🥊', '🎯', '🛹', '🛼', '⛸️', '🎿', '⛷️', '🏂', '🪂', '🏄',
        '🎮', '👾', '🕹️', '🎲', '♟️', '🎳', '🎪', '🎭', '🎨', '🧩'
      ]
    },
    travel: {
      name: "Viajes",
      emojis: [
        '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐',
        '✈️', '🛩️', '🛫', '🛬', '🚀', '🛸', '🚁', '🛶', '⛵', '🚤',
        '🏠', '🏡', '🏢', '🏣', '🏤', '🏥', '🏦', '🏨', '🏪', '🏫'
      ]
    },
    objects: {
      name: "Objetos",
      emojis: [
        '⌚', '📱', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '📷', '📸',
        '💡', '🔦', '🕯️', '📔', '📕', '📖', '📗', '📘', '📙', '📚',
        '💰', '💎', '⚖️', '🛠️', '🔧', '🔨', '⚙️', '🔗', '⛓️', '💣'
      ]
    },
    symbols: {
      name: "Símbolos",
      emojis: [
        '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
        '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️',
        '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐',
        '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐'
      ]
    }
  };

  // Cerrar emoji picker al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Focus en search input cuando se abre el picker
  useEffect(() => {
    if (showEmojiPicker && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [showEmojiPicker]);

  // Filtrar emojis basado en la búsqueda
  const filteredEmojis = searchQuery 
    ? Object.values(emojiCategories).flatMap(category => 
        category.emojis.filter(emoji => 
          emoji.toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    : emojiCategories[activeCategory].emojis;

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!text.trim() && !imagePreview) return;
    if (isSoundEnabled) playRandomKeyStrokeSound();

    sendMessage({
      text: text.trim(),
      image: imagePreview,
    });
    setText("");
    setImagePreview("");
    setShowEmojiPicker(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
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
    setText(prev => prev + emoji);
    setTimeout(() => {
      textInputRef.current?.focus();
    }, 0);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  return (
    <div className="p-4 border-t border-slate-700/50">
      {imagePreview && (
        <div className="max-w-3xl mx-auto mb-3 flex items-center">
          <div className="relative">
            <img
              src={imagePreview}
              alt="Preview"
              className="w-20 h-20 object-cover rounded-lg border border-slate-700"
            />
            <button
              onClick={removeImage}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-slate-200 hover:bg-slate-700 border border-slate-600"
              type="button"
            >
              <XIcon className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto flex items-center gap-3">
        {/* Botón Emoji */}
        <div className="relative flex-shrink-0" ref={emojiPickerRef}>
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className={`p-2 rounded-lg transition-all duration-200 ${
              showEmojiPicker 
                ? "bg-cyan-600 text-white" 
                : "bg-slate-800/50 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
            }`}
            title="Seleccionar emoji"
          >
            <SmileIcon className="w-5 h-5" />
          </button>

          {/* Picker de Emojis */}
          {showEmojiPicker && (
            <div className="absolute bottom-full left-0 mb-2 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-2xl shadow-2xl w-80 h-96 flex flex-col overflow-hidden">
              
              {/* Header con búsqueda */}
              <div className="p-3 border-b border-slate-200 dark:border-slate-600">
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar emojis..."
                    className="w-full bg-slate-100 dark:bg-slate-700 border-none rounded-lg py-2 pl-10 pr-4 text-slate-800 dark:text-slate-200 placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <XIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Categorías */}
              {!searchQuery && (
                <div className="flex border-b border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50">
                  {Object.entries(emojiCategories).map(([key, category]) => (
                    <button
                      key={key}
                      onClick={() => setActiveCategory(key)}
                      className={`flex-1 py-2 text-xs font-medium transition-colors ${
                        activeCategory === key
                          ? "text-cyan-600 dark:text-cyan-400 border-b-2 border-cyan-600 dark:border-cyan-400 bg-white dark:bg-slate-800"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Grid de emojis */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
                {!searchQuery && (
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-2 px-1">
                    {emojiCategories[activeCategory].name}
                  </div>
                )}
                <div className="grid grid-cols-8 gap-1">
                  {filteredEmojis.map((emoji, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleEmojiClick(emoji)}
                      className="text-2xl hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg p-2 transition-all duration-150 w-10 h-10 flex items-center justify-center hover:scale-110 active:scale-95"
                      title={`Emoji: ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                {filteredEmojis.length === 0 && searchQuery && (
                  <div className="text-center text-slate-500 dark:text-slate-400 py-8">
                    <div className="text-4xl mb-2">😕</div>
                    <div className="text-sm">No se encontraron emojis</div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-slate-200 dark:border-slate-600 p-3 bg-slate-50 dark:bg-slate-700/50">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {searchQuery ? `${filteredEmojis.length} resultados` : `Emojis ${emojiCategories[activeCategory].name.toLowerCase()}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(false)}
                    className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600"
                    title="Cerrar"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input de texto */}
        <div className="flex-1">
          <input
            ref={textInputRef}
            type="text"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              isSoundEnabled && playRandomKeyStrokeSound();
            }}
            onKeyPress={handleKeyPress}
            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg py-3 px-4 text-slate-200 placeholder-slate-400 focus:outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all duration-200"
            placeholder="Escribí un mensaje..."
          />
        </div>

        {/* Botones de acción */}
        <div className="flex items-center gap-2 flex-shrink-0">
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
            className={`p-2 rounded-lg transition-all duration-200 ${
              imagePreview 
                ? "bg-cyan-600 text-white" 
                : "bg-slate-800/50 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
            }`}
            title="Subir imagen"
          >
            <ImageIcon className="w-5 h-5" />
          </button>
          
          <button
            type="submit"
            disabled={!text.trim() && !imagePreview}
            className="p-2 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-lg font-medium hover:from-cyan-600 hover:to-cyan-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg shadow-cyan-500/20"
            title="Enviar mensaje"
          >
            <SendIcon className="w-5 h-5" />
          </button>
        </div>
      </form>

      {/* Estilos personalizados para el scrollbar */}
      <style>
        {`
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(100, 116, 139, 0.3);
            border-radius: 3px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(100, 116, 139, 0.5);
          }
        `}
      </style>
    </div>
  );
}

export default MessageInput;