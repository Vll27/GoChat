import { XIcon } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "../store/useAuthStore";

function ChatHeader() {
  const { selectedUser, setSelectedUser, forceRefreshChats } = useChatStore();
  const { onlineUsers, socket } = useAuthStore();
  const [lastSeenText, setLastSeenText] = useState("");
  
  const isOnline = onlineUsers.includes(selectedUser?._id);
  
  // Función para formatear la última conexión estilo WhatsApp
  const formatLastSeen = useCallback((lastSeen) => {
    if (!lastSeen) return "Última vez desconocida";
    
    const now = new Date();
    const lastSeenDate = new Date(lastSeen);
    const diffInSeconds = Math.floor((now - lastSeenDate) / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    
    if (diffInSeconds < 60) {
      return `Última vez hace ${diffInSeconds} segundos`;
    }
    
    if (diffInMinutes < 60) {
      return `Última vez hace ${diffInMinutes} ${diffInMinutes === 1 ? 'minuto' : 'minutos'}`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `Última vez hoy a las ${lastSeenDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    return `Última vez el ${lastSeenDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}`;
  }, []);
  
  const updateText = useCallback(() => {
    if (!selectedUser) return;
    
    const online = onlineUsers.includes(selectedUser._id);
    if (online) {
      setLastSeenText("En línea");
    } else if (selectedUser.lastSeen) {
      setLastSeenText(formatLastSeen(selectedUser.lastSeen));
    } else {
      setLastSeenText("Última vez desconocida");
    }
  }, [selectedUser, onlineUsers, formatLastSeen]);
  
  // Actualizar cada segundo cuando está offline
  useEffect(() => {
    updateText();
    
    let interval;
    if (!isOnline && selectedUser?.lastSeen) {
      interval = setInterval(updateText, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [updateText, isOnline, selectedUser]);
  
  // Escuchar eventos del socket
  useEffect(() => {
    if (!socket || !selectedUser) return;
    
    const handleStatusChange = ({ userId, status, lastSeen }) => {
      if (userId === selectedUser._id) {
        console.log(`🔄 Header: ${selectedUser.fullName} -> ${status} a las ${new Date(lastSeen).toLocaleTimeString()}`);
        
        useChatStore.setState((state) => ({
          selectedUser: {
            ...state.selectedUser,
            lastSeenStatus: status,
            lastSeen: lastSeen
          }
        }));
        
        updateText();
        
        setTimeout(() => {
          forceRefreshChats();
        }, 50);
      }
    };
    
    const handleUserOffline = ({ userId, lastSeen }) => {
      if (userId === selectedUser._id) {
        console.log(`🔴 Header: ${selectedUser.fullName} se ha desconectado a las ${new Date(lastSeen).toLocaleTimeString()}`);
        
        useChatStore.setState((state) => ({
          selectedUser: {
            ...state.selectedUser,
            lastSeenStatus: "offline",
            lastSeen: lastSeen
          }
        }));
        
        updateText();
      }
    };
    
    socket.on("userStatusChanged", handleStatusChange);
    socket.on("userOffline", handleUserOffline);
    
    return () => {
      socket.off("userStatusChanged", handleStatusChange);
      socket.off("userOffline", handleUserOffline);
    };
  }, [socket, selectedUser, updateText, forceRefreshChats]);
  
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === "Escape") setSelectedUser(null);
    };
    
    window.addEventListener("keydown", handleEscKey);
    return () => window.removeEventListener("keydown", handleEscKey);
  }, [setSelectedUser]);
  
  if (!selectedUser) return null;
  
  return (
    <div className="flex justify-between items-center bg-slate-800/50 border-b border-slate-700/50 max-h-[84px] px-6 flex-1">
      <div className="flex items-center space-x-3">
        <div className={`avatar ${isOnline ? "online" : "offline"}`}>
          <div className="w-12 h-12 rounded-full overflow-hidden">
            <img 
              src={selectedUser.profilePic || "/avatar.png"} 
              alt={selectedUser.fullName} 
              className="w-full h-full object-cover" 
            />
          </div>
        </div>
        
        <div>
          <h3 className="text-slate-200 font-medium truncate max-w-[220px]">
            {selectedUser.fullName}
          </h3>
          <p className="text-slate-400 text-sm truncate max-w-[220px]">
            {isOnline ? (
              <span className="text-green-500">● En línea</span>
            ) : (
              <span className="text-slate-400 text-xs">
                {lastSeenText}
              </span>
            )}
          </p>
        </div>
      </div>
      
      <button onClick={() => setSelectedUser(null)}>
        <XIcon className="w-5 h-5 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer" />
      </button>
    </div>
  );
}

export default ChatHeader;