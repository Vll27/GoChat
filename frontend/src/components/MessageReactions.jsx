import React, { useState, useRef, useEffect } from 'react';
import { Smile, X } from 'lucide-react';

const MessageReactions = ({ 
  reactions = [], 
  onAddReaction, 
  onRemoveReaction,
  currentUserId,
  availableEmojis = ["👍", "❤️", "😂", "😮", "😢", "😡", "🎉", "🔥", "👏", "🙏"],
  isOwnMessage = false
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipContent, setTooltipContent] = useState('');
  const pickerRef = useRef(null);
  const buttonRef = useRef(null);

  const groupedReactions = {};
  reactions.forEach((reaction) => {
    const emoji = reaction.emoji;
    const userId = reaction.userId?._id || reaction.userId;
    if (!groupedReactions[emoji]) {
      groupedReactions[emoji] = {
        emoji,
        count: 0,
        users: [],
      };
    }
    groupedReactions[emoji].count++;
    groupedReactions[emoji].users.push(reaction.userId);
  });

  const reactionList = Object.values(groupedReactions);

  const getUserReaction = () => {
    const userReaction = reactions.find(
      r => (r.userId?._id === currentUserId || r.userId === currentUserId)
    );
    return userReaction?.emoji || null;
  };

  const currentUserReaction = getUserReaction();

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

  const handleEmojiSelect = (emoji) => {
    if (currentUserReaction === emoji) {
      onRemoveReaction();
    } else {
      onAddReaction(emoji);
    }
    setShowPicker(false);
  };

  const handleReactionHover = (emoji, users) => {
    const userNames = users.map(u => u?.fullName || 'Usuario').join(', ');
    setTooltipContent(`${emoji} - ${userNames}`);
    setShowTooltip(true);
  };

  return (
    <div className="relative flex items-center gap-1 mt-1">
      {reactionList.map((reaction) => (
        <div
          key={reaction.emoji}
          className="relative"
          onMouseEnter={() => handleReactionHover(reaction.emoji, reaction.users)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <button
            onClick={() => handleEmojiSelect(reaction.emoji)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors ${
              currentUserReaction === reaction.emoji
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <span className="text-sm">{reaction.emoji}</span>
            <span className="text-xs">{reaction.count}</span>
          </button>
        </div>
      ))}

      <div className="relative">
        <button
          ref={buttonRef}
          onClick={() => setShowPicker(!showPicker)}
          className={`p-1 rounded-full transition-colors ${
            currentUserReaction
              ? 'text-cyan-400 hover:bg-cyan-500/20'
              : 'text-slate-400 hover:bg-slate-700'
          }`}
          title="Agregar reacción"
        >
          <Smile className="w-3.5 h-3.5" />
        </button>

        {showPicker && (
          <div
            ref={pickerRef}
            className="absolute bottom-full left-0 mb-2 bg-slate-800 rounded-xl shadow-xl border border-slate-700 p-2 z-50"
            style={{ minWidth: '280px' }}
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
              {availableEmojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleEmojiSelect(emoji)}
                  className={`p-2 rounded-lg text-xl hover:bg-slate-700 transition-colors ${
                    currentUserReaction === emoji ? 'bg-cyan-500/20' : ''
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {showTooltip && tooltipContent && (
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap z-50 shadow-lg">
          {tooltipContent}
        </div>
      )}
    </div>
  );
};

export default MessageReactions;