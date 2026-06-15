import { useState, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import ProfileHeader from "../components/ProfileHeader";
import ActiveTabSwitch from "../components/ActiveTabSwitch";
import ChatsList from "../components/ChatsList";
import ContactList from "../components/ContactList";
import ChatContainer from "../components/ChatContainer";
import { useConfigStore } from "../store/useConfigStore";
import { MessageSquare } from "lucide-react";

function ChatPage() {
  const { activeTab, selectedUser, setSelectedUser } = useChatStore();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      setSelectedUser(null);
    };
  }, [setSelectedUser]);

  // Estilos reactivos del store
  const appBgColor = useConfigStore((state) => state.appBgColor);
  const themeColor = useConfigStore((state) => state.themeColor);
  const receiverColor = useConfigStore((state) => state.receiverColor);
  const isTextBold = useConfigStore((state) => state.isTextBold);
  const chatFontSize = useConfigStore((state) => state.chatFontSize);
  const appBorderColor = useConfigStore((state) => state.appBorderColor);
  const sidebarBgColor = useConfigStore((state) => state.sidebarBgColor);

  return (
    <div
      className="w-full h-screen absolute inset-0 overflow-hidden text-slate-200 transition-all duration-300 flex"
      style={{
        backgroundColor: appBgColor || "#000000",
        "--theme-primary": themeColor || "#06b6d4",
        "--theme-receiver": receiverColor || "#1e293b",
        "--chat-font-weight": isTextBold ? "700" : "400",
        "--chat-font-size": `${chatFontSize || 16}px`,
        "--app-border-color": appBorderColor || "#1e293b",
        "--sidebar-bg-color": sidebarBgColor || "#0f172a"
      }}
    >
      {/* ================= COLUMNA IZQUIERDA: SIDEBAR (CONTACTOS/CHATS) ================= */}
      <aside
        className={`h-full border-r flex flex-col transition-all duration-300 z-20
          ${isMobile 
            ? (selectedUser ? "w-0 opacity-0 pointer-events-none" : "w-full") 
            : "w-full max-w-[350px] lg:max-w-[400px]"
          }
        `}
        style={{
          backgroundColor: sidebarBgColor || "#0f172a",
          borderColor: appBorderColor || "rgba(51, 65, 85, 0.4)"
        }}
      >
        {/* Header de Perfil */}
        <div 
          className="p-4 flex-shrink-0 border-b"
          style={{ borderColor: "var(--app-border-color)" }}
        >
          <ProfileHeader compact={false} />
        </div>

        {/* Selector de Pestañas */}
        <div className="px-4 py-2 flex-shrink-0">
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
      </aside>

      {/* ================= COLUMNA DERECHA: ÁREA DE CONVERSACIÓN ================= */}
      <main
        className={`h-full flex flex-col flex-1 transition-all duration-300 relative
          ${isMobile && !selectedUser ? "hidden" : "flex"}
        `}
        style={{
          // Usamos un fondo ligeramente distinto o el mismo appBgColor para consistencia
          backgroundColor: appBgColor || "#000000"
        }}
      >
        {selectedUser ? (
          <div className="w-full h-full flex flex-col animate-fadeIn">
            <ChatContainer />
          </div>
        ) : (
          /* PANTALLA DE BIENVENIDA (SIN CHAT SELECCIONADO) */
          <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-black/20">
            <div 
              className="p-6 rounded-full bg-slate-900/40 border-2 mb-6 shadow-2xl"
              style={{ borderColor: "var(--app-border-color)" }}
            >
              <MessageSquare 
                className="w-16 h-16 opacity-80" 
                style={{ color: "var(--theme-primary)" }}
              />
            </div>
            <h2 className="text-3xl font-bold text-slate-100 tracking-tight">Seleccioná un chat de tu barra lateral</h2>
            <p className="text-slate-400 max-w-md mt-3 text-sm leading-relaxed">
              ¡Dale click a tu perfil para ver más opciones!
            </p>
            
            {/* Indicador visual inferior */}
            <div 
              className="absolute bottom-10 w-32 h-1 rounded-full opacity-20"
              style={{ backgroundColor: "var(--theme-primary)" }}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default ChatPage;