import { useState, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import BorderAnimatedContainer from "../components/BorderAnimatedContainer";
import ProfileHeader from "../components/ProfileHeader";
import ActiveTabSwitch from "../components/ActiveTabSwitch";
import ChatsList from "../components/ChatsList";
import ContactList from "../components/ContactList";
import ChatContainer from "../components/ChatContainer";
import NoConversationPlaceholder from "../components/NoConversationPlaceholder";

function ChatPage() {
  const { activeTab, selectedUser, setSelectedUser } = useChatStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // ← Inicialmente CERRADO
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      // En móvil: sidebar cerrado, en desktop: sidebar abierto
      if (mobile) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    // Ejecutar inmediatamente al montar
    handleResize();
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (selectedUser && isMobile) {
      setIsSidebarOpen(false);
    }
  }, [selectedUser, isMobile]);

  useEffect(() => {
    if (isSidebarOpen && isMobile) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isSidebarOpen, isMobile]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="w-full h-screen bg-slate-900 absolute inset-0">
      <BorderAnimatedContainer className="w-full h-full">
        <div className="flex w-full h-full relative">
          
          {/* Sidebar - MEJORADA la lógica de visibilidad */}
          <aside
            className={`bg-slate-800/50 backdrop-blur-sm flex flex-col transition-all duration-300 ease-in-out h-full z-20
              ${isSidebarOpen ? (isMobile ? "w-80" : "w-80") : (isMobile ? "w-0 -left-full" : "w-20")} 
              ${isMobile ? "absolute" : "relative"}
            `}
          >
            {/* Header del sidebar */}
            <div className={`${!isSidebarOpen && !isMobile ? "hidden" : "flex"} items-center justify-between p-3 border-b border-slate-700/50 min-h-[64px] flex-shrink-0`}>
              <div className="flex items-center gap-3">
                <ProfileHeader 
                  compact={!isSidebarOpen && !isMobile} 
                  onMenuToggle={toggleSidebar}
                />
              </div>
            </div>

            {/* Tabs */}
            <div className={`${!isSidebarOpen && !isMobile ? "hidden" : "block"} p-3 flex-shrink-0`}>
              <ActiveTabSwitch compact={!isSidebarOpen && !isMobile} />
            </div>

            {/* Lista de chats/contactos */}
            <div className={`${!isSidebarOpen && !isMobile ? "hidden" : "flex-1"} overflow-y-auto p-3 min-h-0`}>
              {activeTab === "chats" ? (
                <ChatsList compact={!isSidebarOpen && !isMobile} />
              ) : (
                <ContactList compact={!isSidebarOpen && !isMobile} />
              )}
            </div>
          </aside>

          {/* Mobile backdrop - SOLO cuando sidebar está abierto en móvil */}
          {isSidebarOpen && isMobile && (
            <div
              className="md:hidden fixed inset-0 bg-black/60 z-10"
              onClick={() => setIsSidebarOpen(false)}
              aria-hidden
            />
          )}

          {/* ÁREA PRINCIPAL DEL CHAT */}
          <main className="flex-1 flex flex-col bg-slate-900/50 backdrop-blur-sm min-h-0 h-full w-full overflow-hidden">
            
            {/* Botón para abrir sidebar en móvil - SOLO cuando está CERRADO y en móvil */}
            {isMobile && !isSidebarOpen && (
              <div className="md:hidden flex items-center p-3 border-b border-slate-700/50 flex-shrink-0">
                <button
                  onClick={toggleSidebar}
                  className="p-2 rounded-md bg-slate-800/60 text-slate-200 hover:bg-slate-700/50"
                  aria-label="Open menu"
                >
                  ☰
                </button>
              </div>
            )}

            {/* Botón sidebar desktop cuando está colapsado */}
            {!isSidebarOpen && !isMobile && (
              <div className="absolute top-3 left-3 z-10">
                <button
                  onClick={toggleSidebar}
                  className="p-2 rounded-md bg-slate-800/70 text-slate-200 hover:bg-slate-700/50 backdrop-blur-sm"
                  aria-label="Open sidebar"
                >
                  ☰
                </button>
              </div>
            )}

            {/* CONTENEDOR DEL CHAT */}
            <div className="flex-1 min-h-0 w-full h-full">
              {selectedUser ? <ChatContainer /> : <NoConversationPlaceholder />}
            </div>
          </main>
        </div>
      </BorderAnimatedContainer>
    </div>
  );
}

export default ChatPage;