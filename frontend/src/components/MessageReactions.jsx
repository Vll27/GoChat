import React from 'react';

const MessageReactions = ({ 
  reactions = [], 
  onAddReaction, 
  onRemoveReaction,
  currentUserId,
  availableEmojis = ["👍", "❤️", "😂", "😮", "😢", "😡", "🎉", "🔥", "👏", "🙏"],
  isOwnMessage = false
}) => {
  // Obtener la reacción del usuario actual
  const getUserReaction = () => {
    const userReaction = reactions.find(
      r => (r.userId?._id === currentUserId || r.userId === currentUserId)
    );
    return userReaction?.emoji || null;
  };

  const currentUserReaction = getUserReaction();

  // Agrupar reacciones por emoji para mostrar las de otros usuarios
  const groupedReactions = {};
  reactions.forEach((reaction) => {
    const emoji = reaction.emoji;
    const userId = reaction.userId?._id || reaction.userId;
    // Excluir la reacción del usuario actual si ya tiene una
    if (userId?.toString() !== currentUserId?.toString()) {
      if (!groupedReactions[emoji]) {
        groupedReactions[emoji] = {
          emoji,
          count: 0,
          users: [],
        };
      }
      groupedReactions[emoji].count++;
      groupedReactions[emoji].users.push(reaction.userId);
    }
  });

  const otherReactions = Object.values(groupedReactions);

  const handleReactionClick = (emoji) => {
    if (currentUserReaction === emoji) {
      onRemoveReaction();
    } else {
      onAddReaction(emoji);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1 mt-1">
      {/* Reacción del usuario actual (si existe) - Estilo WhatsApp: solo el emoji */}
      {currentUserReaction && (
        <button
          onClick={() => handleReactionClick(currentUserReaction)}
          className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-sm transition-all hover:scale-105 ${
            isOwnMessage 
              ? 'bg-white/20 hover:bg-white/30' 
              : 'bg-slate-700/50 hover:bg-slate-700'
          }`}
          title="Quitar reacción"
        >
          <span className="text-base">{currentUserReaction}</span>
        </button>
      )}

      {/* Reacciones de otros usuarios (sin número, solo emoji) */}
      {otherReactions.map((reaction) => (
        <button
          key={reaction.emoji}
          onClick={() => handleReactionClick(reaction.emoji)}
          className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-sm transition-all hover:scale-105 ${
            isOwnMessage 
              ? 'bg-white/10 hover:bg-white/20' 
              : 'bg-slate-700/30 hover:bg-slate-700/50'
          }`}
          title={`Reaccionar con ${reaction.emoji}`}
        >
          <span className="text-base">{reaction.emoji}</span>
        </button>
      ))}
    </div>
  );
};

export default MessageReactions;