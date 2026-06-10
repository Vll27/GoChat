import React, { useState, useRef, useEffect } from 'react';
import { Smile, X } from 'lucide-react';

const MAIN_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "😡", "🎉", "🔥", "👏", "🙏"];

const EmojiPickerButton = ({ onEmojiSelect, currentEmoji = null, size = "sm" }) => {
  const [showPicker, setShowPicker] = useState(false);
  const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0, position: 'bottom' });
  const pickerRef = useRef(null);
  const buttonRef = useRef(null);

  const sizeClasses = {
    sm: "w-5 h-5",
    md: "w-6 h-6",
    lg: "w-7 h-7"
  };

  const calculatePosition = () => {
    if (!buttonRef.current) return;
    
    const buttonRect = buttonRef.current.getBoundingClientRect();
    const pickerHeight = 220;
    const spaceBelow = window.innerHeight - buttonRect.bottom;
    const spaceAbove = buttonRect.top;
    
    let top, position;
    
    if (spaceBelow >= pickerHeight + 10) {
      top = buttonRect.bottom + 5;
      position = 'bottom';
    } else if (spaceAbove >= pickerHeight + 10) {
      top = buttonRect.top - pickerHeight - 5;
      position = 'top';
    } else {
      top = buttonRect.bottom + 5;
      position = 'bottom';
    }
    
    let left = buttonRect.left - 100;
    if (left < 5) left = 5;
    if (left + 230 > window.innerWidth - 5) left = window.innerWidth - 235;
    
    setPickerPosition({ top, left, position });
  };

  const togglePicker = (e) => {
    e.stopPropagation();
    if (!showPicker) {
      calculatePosition();
      setShowPicker(true);
    } else {
      setShowPicker(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target) &&
          buttonRef.current && !buttonRef.current.contains(event.target)) {
        setShowPicker(false);
      }
    };
    
    const handleEscape = (event) => {
      if (event.key === 'Escape' && showPicker) {
        setShowPicker(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showPicker]);

  useEffect(() => {
    if (!showPicker) return;
    
    const handleScroll = () => calculatePosition();
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [showPicker]);

  const handleSelect = (emoji) => {
    onEmojiSelect(emoji);
    setShowPicker(false);
  };

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        type="button"
        onClick={togglePicker}
        className={`p-1 rounded-full transition-all duration-200 ${
          currentEmoji
            ? 'bg-cyan-500/20 text-cyan-400'
            : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
        }`}
        title="Reaccionar"
      >
        {currentEmoji ? (
          <span className="text-sm">{currentEmoji}</span>
        ) : (
          <Smile className={sizeClasses[size]} />
        )}
      </button>

      {showPicker && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setShowPicker(false)} />
          
          <div
            ref={pickerRef}
            className="fixed z-[9999] bg-slate-800 rounded-xl shadow-2xl border border-slate-700 overflow-hidden animate-fade-in"
            style={{
              top: pickerPosition.top,
              left: pickerPosition.left,
              width: '230px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700">
              <span className="text-xs text-slate-400">Reacciones</span>
              <button 
                onClick={() => setShowPicker(false)} 
                className="p-0.5 rounded hover:bg-slate-700 transition-colors"
              >
                <X className="w-3 h-3 text-slate-400" />
              </button>
            </div>
            <div className="p-2 grid grid-cols-5 gap-0.5">
              {MAIN_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleSelect(emoji)}
                  className={`p-1.5 rounded-lg text-lg hover:bg-slate-700 transition-all hover:scale-110 ${
                    currentEmoji === emoji ? 'bg-cyan-500/20 ring-1 ring-cyan-500' : ''
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <div className="px-3 py-1.5 border-t border-slate-700 text-center">
              <p className="text-[10px] text-slate-500">Click para reaccionar</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default EmojiPickerButton;