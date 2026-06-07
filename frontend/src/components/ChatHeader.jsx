import { XIcon } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "../store/useAuthStore";

function ChatHeader() {
  const { selectedUser, setSelectedUser, forceRefreshChats } = useChatStore();
  const { onlineUsers, socket, authUser } = useAuthStore();
  const [lastSeenText, setLastSeenText] = useState("");
  
  const isOnline = onlineUsers.includes(selectedUser?._id);
  
  const formatLastSeen = useCallback((lastSeen) => {
    if (!lastSeen) return "últ. vez desconocida";
    
    const now = new Date();
    const lastSeenDate = new Date(lastSeen);
    const diffInSeconds = Math.floor((now - lastSeenDate) / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    
    if (diffInSeconds < 60) {
      return `últ. vez hace ${diffInSeconds} segundos`;
    }
    
    if (diffInMinutes < 60) {
      return `últ. vez hace ${diffInMinutes} ${diffInMinutes === 1 ? 'minuto' : 'minutos'}`;
    }
    
    const formatTime = (date) => {
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    };
    
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfLastSeen = new Date(lastSeenDate.getFullYear(), lastSeenDate.getMonth(), lastSeenDate.getDate());
    const diffInDays = Math.floor((startOfToday - startOfLastSeen) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) {
      return `últ. vez hoy a las ${formatTime(lastSeenDate)}`;  
    }
    
    if (diffInDays === 1) {
      return `últ. vez ayer a las ${formatTime(lastSeenDate)}`;  
    }
    
    const formatDateWithYear = (date) => {
      return date.toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric'
      });
    };
    
    return `últ. vez ${formatDateWithYear(lastSeenDate)} a las ${formatTime(lastSeenDate)}`;  
  }, []);
  
  const updateText = useCallback(() => {
    if (!selectedUser) return;
    
    const online = onlineUsers.includes(selectedUser._id);
    if (online) {
      setLastSeenText("En línea");
    } else if (selectedUser.lastSeen) {
      setLastSeenText(formatLastSeen(selectedUser.lastSeen));
    } else {
      setLastSeenText("últ. vez desconocida");  
    }
  }, [selectedUser, onlineUsers, formatLastSeen]);
  
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
  
  useEffect(() => {
    if (!socket || !selectedUser || !authUser) return;
    
    const handleStatusChange = ({ userId, status, lastSeen }) => {
      if (!authUser) return;
      if (userId === selectedUser._id) {
        console.log(`🔄 Header: ${selectedUser.fullName} -> ${status}`);
        
        useChatStore.setState((state) => ({
          selectedUser: {
            ...state.selectedUser,
            lastSeenStatus: status,
            lastSeen: lastSeen
          }
        }));
        
        updateText();
        
        setTimeout(() => {
          if (authUser) forceRefreshChats();
        }, 50);
      }
    };
    
    const handleUserOffline = ({ userId, lastSeen }) => {
      if (!authUser) return;
      if (userId === selectedUser._id) {
        console.log(`🔴 Header: ${selectedUser.fullName} se ha desconectado`);
        
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
  }, [socket, selectedUser, updateText, forceRefreshChats, authUser]);
  
  // ✅ CORREGIDO: Solo cerrar con ESC si hay usuario seleccionado
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === "Escape" && selectedUser) {
        console.log("🔴 ESC presionado - cerrando chat");
        setSelectedUser(null);
      }
    };
    
    window.addEventListener("keydown", handleEscKey);
    return () => window.removeEventListener("keydown", handleEscKey);
  }, [setSelectedUser, selectedUser]);
  
  if (!selectedUser || !authUser) return null;
  
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