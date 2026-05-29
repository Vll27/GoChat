import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
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
  const navigate = useNavigate();

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

          {/* Acceso a configuración */}
          {/* Solo se muestra si no hay un chat abierto para mantener limpia la pantalla de conversación */}
            {!selectedUser && (
              <div className="absolute bottom-4 left-4 z-30 flex flex-col items-center group">
                
                {/* Leyenda flotante ("Tooltip") */}
                <span className="mb-2 px-3 py-1.5 text-xs font-medium text-cyan-400 bg-slate-900/90 border border-cyan-500/30 rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0 backdrop-blur-sm whitespace-nowrap">
                  Ir a configuraciones
                </span>

                {/* Ruedita de engranaje interactiva */}
                <button
                  onClick={() => navigate("/config")}
                  className="p-3 bg-slate-800/80 text-slate-400 hover:text-cyan-400 rounded-xl border border-slate-700/50 hover:border-cyan-500/40 shadow-xl backdrop-blur-md transition-all duration-300 transform hover:scale-110 hover:animate-[spin_4s_linear_infinite]"
                  aria-label="Configuración"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    strokeWidth={1.5} 
                    stroke="currentColor" 
                    className="w-6 h-6"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.43l-1.003.767a1.123 1.123 0 0 0-.417 1.03c.004.074.006.148.006.222 0 .074-.002.148-.006.222a1.123 1.123 0 0 0 .417 1.03l1.003.767a1.125 1.125 0 0 1 .26 1.43l-1.296 2.247a1.125 1.125 0 0 1-1.37.49l-1.216-.456a1.125 1.125 0 0 0-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281a1.125 1.125 0 0 0-.644-.87a6.52 6.52 0 0 1-.22-.127a1.125 1.125 0 0 0-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.43l1.004-.767a1.122 1.122 0 0 0 .416-1.03c-.004-.074-.006-.148-.006-.222 0-.074.002-.148.006-.222a1.122 1.122 0 0 0-.416-1.03l-1.004-.767a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.49l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128c.332-.183.582-.495.644-.869l.214-1.28Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                </button>

              </div>
            )}
        </div>
    </div>
  </div>
);
}

export default ChatPage;