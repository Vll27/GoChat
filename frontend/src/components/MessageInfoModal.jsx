import React from 'react';
import { X, Clock, CheckCheck, User, Calendar } from 'lucide-react';
import { format } from 'date-fns';

const MessageInfoModal = ({ message, onClose }) => {
  if (!message) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), "dd/MM/yyyy 'a las' HH:mm:ss");
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'sending': return 'Enviando...';
      case 'sent': return 'Enviado';
      case 'delivered': return 'Entregado';
      case 'read': return 'Leído';
      default: return status;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'read': return <CheckCheck className="w-4 h-4 text-blue-400" />;
      case 'delivered': return <CheckCheck className="w-4 h-4 text-gray-400" />;
      case 'sent': return <CheckCheck className="w-4 h-4 text-gray-400" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-800 rounded-2xl w-full max-w-md mx-4 shadow-2xl border border-slate-700">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-slate-100">Información del mensaje</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {message.text && (
            <div className="bg-slate-700/50 rounded-lg p-3">
              <p className="text-slate-200 text-sm break-words">
                {message.text}
              </p>
            </div>
          )}

          {message.image && (
            <div className="rounded-lg overflow-hidden">
              <img src={message.image} alt="Mensaje" className="max-w-full h-auto rounded-lg" />
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center gap-3 text-sm">
              <User className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-slate-400">De</p>
                <p className="text-slate-200">{message.sender?.fullName || 'Desconocido'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <User className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-slate-400">Para</p>
                <p className="text-slate-200">{message.receiver?.fullName || 'Desconocido'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-slate-400">Enviado</p>
                <p className="text-slate-200">{formatDate(message.createdAt)}</p>
              </div>
            </div>

            {message.editedAt && (
              <div className="flex items-center gap-3 text-sm">
                <Clock className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-slate-400">Editado</p>
                  <p className="text-slate-200">{formatDate(message.editedAt)}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 text-sm">
              {getStatusIcon(message.status)}
              <div>
                <p className="text-slate-400">Estado</p>
                <p className="text-slate-200">{getStatusText(message.status)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-700">
          <button
            onClick={onClose}
            className="w-full py-2 rounded-lg bg-slate-700 text-slate-200 hover:bg-slate-600 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default MessageInfoModal;