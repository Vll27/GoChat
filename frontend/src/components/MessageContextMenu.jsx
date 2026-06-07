import React, { useEffect, useRef } from 'react';
import { 
  Info, 
  Copy, 
  Edit, 
  Trash2, 
  Trash,
  Reply,
  Forward,
  Pin,
  Star,
  CheckSquare,
  Flag
} from 'lucide-react';

const MessageContextMenu = ({ 
  message, 
  position, 
  onClose, 
  onCopy, 
  onInfo, 
  onEdit, 
  onDelete, 
  onDeleteForEveryone,
  onReply,
  onForward,
  onPin,
  onStar,
  onSelect,
  onReport,
  isSender,
  isGroup = false
}) => {
  const menuRef = useRef(null);

  const canEdit = () => {
    if (!isSender) return false;
    if (!message.text || message.text.length === 0) return false;
    if (message.isDeleted) return false;
    if (!message.createdAt) return false;
    
    try {
      const messageTime = new Date(message.createdAt).getTime();
      const currentTime = new Date().getTime();
      if (isNaN(messageTime)) return false;
      const minutesDiff = (currentTime - messageTime) / (1000 * 60);
      return minutesDiff < 5;
    } catch (error) {
      console.error("Error al calcular tiempo:", error);
      return false;
    }
  };

  // Cerrar al hacer click fuera o ESC
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    // Pequeño delay para evitar que el click que abrió el menú lo cierre
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }, 10);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const menuItems = [
    { label: 'Info. del mensaje', icon: Info, onClick: onInfo, show: true, divider: false },
    { label: 'Responder', icon: Reply, onClick: onReply, show: true, divider: false },
    { label: 'Copiar', icon: Copy, onClick: () => onCopy(message.text), show: message.text && message.text.length > 0, divider: false },
    { label: 'Reenviar', icon: Forward, onClick: onForward, show: true, divider: false },
    { label: 'Fijar', icon: Pin, onClick: onPin, show: true, divider: false },
    { label: 'Destacar', icon: Star, onClick: onStar, show: true, divider: false },
    { label: 'Seleccionar', icon: CheckSquare, onClick: onSelect, show: true, divider: false },
    { label: 'Reportar', icon: Flag, onClick: onReport, show: true, divider: false },
    { label: 'Editar', icon: Edit, onClick: onEdit, show: canEdit(), divider: false },
    { label: 'Eliminar para mí', icon: Trash2, onClick: onDelete, show: true, divider: true },
    { label: 'Eliminar para todos', icon: Trash, onClick: onDeleteForEveryone, show: isSender, divider: false },
  ];

  const visibleItems = menuItems.filter(item => item.show);
  
  if (visibleItems.length === 0) return null;

  const menuWidth = 240;
  const menuHeight = visibleItems.length * 44 + 10;
  
  let left = position.x - (menuWidth / 2);
  let top = position.y - menuHeight - 10;
  
  if (top < 10) top = position.y + 10;
  if (left < 10) left = 10;
  if (left + menuWidth > window.innerWidth - 10) left = window.innerWidth - menuWidth - 10;

  return (
    <div
      ref={menuRef}
      className="fixed z-[1000] bg-slate-800 rounded-lg shadow-xl border border-slate-700 overflow-hidden animate-fade-in"
      style={{ top, left, minWidth: '200px', maxWidth: '260px' }}
    >
      <div className="py-1 max-h-[70vh] overflow-y-auto overflow-x-hidden">
        {visibleItems.map((item, index) => (
          <React.Fragment key={index}>
            {item.divider && index > 0 && <div className="border-t border-slate-700 my-1" />}
            <button
              onClick={(e) => {
                e.stopPropagation();
                item.onClick();
              }}
              className="w-full px-4 py-2 text-left text-sm text-slate-200 hover:bg-slate-700 flex items-center gap-3 transition-colors"
            >
              <item.icon className="w-4 h-4 text-slate-400" />
              <span>{item.label}</span>
            </button>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default MessageContextMenu;