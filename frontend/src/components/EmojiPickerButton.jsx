import React, { useState, useRef, useEffect } from 'react';
import { Smile, X } from 'lucide-react';

const EmojiPickerButton = ({ onEmojiSelect, currentEmoji = null, size = "sm" }) => {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef(null);
  const buttonRef = useRef(null);

  const emojis = ["👍", "❤️", "😂", "😮", "😢", "😡", "🎉", "🔥", "👏", "🙏"];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target) &&
          buttonRef.current && !buttonRef.current.contains(event.target)) {
        setShowPicker(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (emoji) => {
    onEmojiSelect(emoji);
    setShowPicker(false);
  };

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6"
  };

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          console.log("Botón de reacción clickeado, showPicker:", !showPicker);
          setShowPicker(!showPicker);
        }}
        className={`p-1.5 rounded-full transition-colors ${
          currentEmoji
            ? 'bg-cyan-500/20 text-cyan-400'
            : 'text-slate-400 hover:bg-slate-700'
        }`}
        title="Reaccionar"
      >
        {currentEmoji ? (
          <span className="text-base">{currentEmoji}</span>
        ) : (
          <Smile className={sizeClasses[size]} />
        )}
      </button>

      {showPicker && (
        <div
          ref={pickerRef}
          className="fixed z-[9999] bg-slate-800 rounded-xl shadow-xl border border-slate-700 p-2"
          style={{
            bottom: 'auto',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            minWidth: '280px'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-700">
            <span className="text-xs text-slate-400">Reacciones</span>
            <button
              onClick={() => setShowPicker(false)}
              className="p-1 rounded-full hover:bg-slate-700"
            >
              <X className="w-3 h-3 text-slate-400" />
            </button>
          </div>
          <div className="grid grid-cols-5 gap-1">
            {emojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleSelect(emoji)}
                className={`p-2 rounded-lg text-xl hover:bg-slate-700 transition-colors ${
                  currentEmoji === emoji ? 'bg-cyan-500/20' : ''
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EmojiPickerButton;