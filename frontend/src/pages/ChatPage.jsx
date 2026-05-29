import { useState, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import ProfileHeader from "../components/ProfileHeader";
import ActiveTabSwitch from "../components/ActiveTabSwitch";
import ChatsList from "../components/ChatsList";
import ContactList from "../components/ContactList";
import ChatContainer from "../components/ChatContainer";

function ChatPage() {
  const { activeTab, selectedUser, setSelectedUser } = useChatStore();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
  // Fondo negro sólido, estático y limpio para descansar la vista
  <div className="w-full h-screen bg-black absolute inset-0 overflow-hidden">
    
    <div className="w-full h-full relative z-10">
      {/* Se elimina BorderAnimatedContainer por cansar la vista y se mantiene un fondo negro para optimizar la lectura.*/}
        {/* Contenedor viewport con máscara para ocultar lo que se desplaza a los lados */}
        <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
          
          {/* ================= BURBUJA 1: LISTA DE CONTACTOS / CHATS ================= */}
          <div
            className={`w-full max-w-md h-[90vh] bg-slate-800/60 backdrop-blur-md rounded-2xl border border-slate-700/40 flex flex-col p-4 shadow-2xl transition-all duration-500 ease-in-out absolute z-10
              ${selectedUser 
                ? "-translate-x-[120%] opacity-0 pointer-events-none scale-95" 
                : "translate-x-0 opacity-100 scale-100"
              }
            `}
          >
            {/* Header del panel central */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/50 flex-shrink-0">
              <ProfileHeader compact={false} />
            </div>

            {/* Selector de pestañas */}
            <div className="py-3 flex-shrink-0">
              <ActiveTabSwitch compact={false} />
            </div>

            {/* Listas scrolleables */}
            <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
              {activeTab === "chats" ? (
                <ChatsList compact={false} />
              ) : (
                <ContactList compact={false} />
              )}
            </div>
          </div>

          {/* ================= BURBUJA 2: CONTENEDOR DE LA CONVERSACIÓN ACTIVA ================= */}
          <div
            className={`w-full max-w-4xl h-[90vh] bg-slate-800/40 backdrop-blur-md rounded-2xl border border-slate-700/30 flex flex-col shadow-2xl transition-all duration-500 ease-in-out absolute overflow-hidden
              ${selectedUser 
                ? "translate-x-0 opacity-100 scale-100 z-20" 
                : "translate-x-[120%] opacity-0 pointer-events-none scale-95 z-0"
              }
            `}
          >
            {selectedUser && (
              <div className="w-full h-full flex flex-col relative">
                {/* El contenedor real de tu chat */}
                <div className="w-full h-full flex-1 min-h-0">
                  <ChatContainer />
                </div>
              </div>
            )}
          </div>

        </div>
    </div>
  </div>
);
}

export default ChatPage;