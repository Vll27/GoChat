import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send, Clock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const EditMessageModal = ({ message, onSave, onClose }) => {
  const [editedText, setEditedText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [isExpired, setIsExpired] = useState(false);
  const textareaRef = useRef(null);
  const modalRef = useRef(null);

  // Inicializar estado cuando cambia el mensaje
  useEffect(() => {
    if (message) {
      setEditedText(message.text || '');
      setIsSubmitting(false);
    }
  }, [message]);

  // Focus y selección del texto al abrir
  useEffect(() => {
    if (textareaRef.current && message) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [message]);

  // Temporizador para mostrar tiempo restante (actualiza cada segundo)
  useEffect(() => {
    if (!message?.createdAt) return;

    const updateTimeLeft = () => {
      try {
        const messageTime = new Date(message.createdAt).getTime();
        const currentTime = new Date().getTime();
        
        if (isNaN(messageTime)) {
          setIsExpired(true);
          setTimeLeft(null);
          return;
        }
        
        const elapsed = (currentTime - messageTime) / 1000;
        const remaining = 300 - elapsed; // 5 minutos = 300 segundos
        
        if (remaining <= 0) {
          setIsExpired(true);
          setTimeLeft(0);
          return;
        }
        
        const minutes = Math.floor(remaining / 60);
        const seconds = Math.floor(remaining % 60);
        setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      } catch (error) {
        console.error("Error calculando tiempo:", error);
        setIsExpired(true);
      }
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);
    
    return () => clearInterval(interval);
  }, [message?.createdAt]);

  // Manejar cierre con ESC
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    
    if (message) {
      document.addEventListener('keydown', handleEscape);
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [message, onClose]);

  // Prevenir scroll del body cuando el modal está abierto
  useEffect(() => {
    if (message) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [message]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isSubmitting) return;
    
    if (isExpired) {
      toast.error("El tiempo para editar este mensaje ha expirado");
      onClose();
      return;
    }
    
    const trimmedText = editedText.trim();
    
    if (!trimmedText) {
      toast.error("El mensaje no puede estar vacío");
      return;
    }
    
    if (trimmedText === message.text) {
      toast.error("No realizaste ningún cambio");
      onClose();
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await onSave(trimmedText);
      onClose();
    } catch (error) {
      console.error("Error al guardar:", error);
      toast.error("Error al guardar los cambios");
    } finally {
      setIsSubmitting(false);
    }
  }, [editedText, isExpired, message, onSave, onClose, isSubmitting]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey && !isExpired && !isSubmitting) {
      e.preventDefault();
      handleSubmit(e);
    }
  }, [isExpired, isSubmitting, handleSubmit]);

  // Cerrar al hacer click fuera del modal
  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  if (!message) return null;

  return (
    <div 
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={handleBackdropClick}
    >
      <div 
      ref={modalRef}
      className="bg-slate-800 rounded-2xl w-full max-w-md mx-4 shadow-2xl border border-slate-700 animate-zoom-in"
    >
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-slate-100">
            Editar mensaje
            {!isExpired && timeLeft && (
              <span className="ml-2 text-xs text-cyan-400 bg-cyan-500/20 px-2 py-0.5 rounded-full">
                {timeLeft}
              </span>
            )}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-700 transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          {isExpired ? (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 text-center">
              <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <p className="text-red-300 font-medium">Tiempo de edición expirado</p>
              <p className="text-red-400/80 text-sm mt-1">
                Solo puedes editar mensajes dentro de los primeros 5 minutos
              </p>
            </div>
          ) : (
            <>
              <textarea
                ref={textareaRef}
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-slate-700 rounded-lg px-4 py-3 text-slate-200 border border-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 resize-none transition-all"
                rows={4}
                placeholder="Escribe tu mensaje..."
                disabled={isSubmitting}
              />
              
              <div className="flex items-center justify-between mt-2">
                <div className="text-xs text-slate-400">
                  <Clock className="w-3 h-3 inline mr-1" />
                  Tienes {timeLeft} restantes
                </div>
                <div className="text-xs text-slate-500">
                  <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-[10px]">Enter</kbd> enviar • 
                  <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-[10px] ml-1">Shift+Enter</kbd> nueva línea
                </div>
              </div>
            </>
          )}
          
          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors font-medium"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isExpired || !editedText.trim() || editedText === message.text || isSubmitting}
              className="flex-1 py-2 rounded-lg bg-cyan-500 text-white hover:bg-cyan-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Guardar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditMessageModal;