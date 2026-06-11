import { Navigate, Route, Routes } from "react-router";
import ChatPage from "./pages/ChatPage";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import ConfigPage from "./pages/ConfigPage";
import { useAuthStore } from "./store/useAuthStore";
import { useChatStore } from "./store/useChatStore";
import { useEffect, useRef } from "react";
import PageLoader from "./components/PageLoader";
import { Toaster } from "react-hot-toast";
import { useConfigStore } from "./store/useConfigStore";

function App() {
  const { checkAuth, isCheckingAuth, authUser, socket } = useAuthStore();
  const { subscribeToMessages, unsubscribeFromMessages } = useChatStore();
  const appBgColor = useConfigStore((state) => state.appBgColor);
  const { currentFont } = useChatStore();

  // 🏁 DECLARACIÓN REQUERIDA PARA LA SUSCRIPCIÓN DEL SOCKET:
  const isSubscribed = useRef(false);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Solicitar permisos para notificaciones
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then(permission => {
        console.log("Permiso de notificacion:", permission);
      });
    }
  }, []);

  // Deteccion de foco de ventana (¡CORREGIDO NATALMENTE!)
  useEffect(() => {
    const handleFocus = () => {
      console.log("Ventana en foco");
      
      if (socket && authUser && socket.connected) {
        socket.emit("request_pending_messages");
      }
    };

    const handleBlur = () => {
      console.log("Ventana fuera de foco");
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log("Pagina oculta");
      } else {
        console.log("Pagina visible");
        
        if (socket && authUser && socket.connected) {
          socket.emit("request_pending_messages");
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [socket, authUser]);

  // Punto unico de suscripcion - solo aqui se suscribe
  useEffect(() => {
    if (authUser && socket && socket.connected && !isSubscribed.current) {
      console.log("App: Suscribiendo a eventos de mensajes (unico punto)");
      subscribeToMessages();
      isSubscribed.current = true;
      
      socket.emit("request_pending_messages");
    }
    
    return () => {
      if (isSubscribed.current && authUser && socket) {
        console.log("App: Desuscribiendo eventos de mensajes");
        unsubscribeFromMessages();
        isSubscribed.current = false;
      }
    };
  }, [authUser, socket, subscribeToMessages, unsubscribeFromMessages]);

  // Verificar socket conectado y reconectar suscripcion si es necesario
  useEffect(() => {
    if (!authUser || !socket) return;
    
    const handleSocketConnect = () => {
      console.log("App: Socket reconectado, asegurando suscripcion...");
      if (!isSubscribed.current) {
        subscribeToMessages();
        isSubscribed.current = true;
      }
      socket.emit("request_pending_messages");
    };
    
    socket.on("connect", handleSocketConnect);
    
    return () => {
      socket.off("connect", handleSocketConnect);
    };
  }, [authUser, socket, subscribeToMessages]);

  if (isCheckingAuth) return <PageLoader />;

  return (
    <div 
      // Cambiamos 'min-h-screen' por 'h-screen w-screen' para asegurar que el div ocupe toda la pantalla real
      className={`h-screen w-screen relative overflow-hidden transition-colors duration-500 ease-in-out flex flex-col ${currentFont}`}
      style={{ 
        backgroundColor: appBgColor || "#000000" 
      }}
    >
      {(!appBgColor || appBgColor === "#000000" || appBgColor === "#0f172a") && (
        <div className="absolute inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px]" />
          <div className="absolute top-0 -left-4 size-96 bg-pink-500 opacity-20 blur-[100px]" />
          <div className="absolute bottom-0 -right-4 size-96 bg-cyan-500 opacity-20 blur-[100px]" />
        </div>
      )}

      <div className="relative z-10 flex-1 w-full h-full">
        <Routes>
          <Route path="/" element={authUser ? <ChatPage /> : <Navigate to={"/login"} />} />
          <Route path="/login" element={!authUser ? <LoginPage /> : <Navigate to={"/"} />} />
          <Route path="/signup" element={!authUser ? <SignUpPage /> : <Navigate to={"/"} />} />
          <Route path="/config" element={authUser ? <ConfigPage /> : <Navigate to={"/login"} />} />
        </Routes>
      </div>

      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
            border: '1px solid #334155'
          }
        }}
      />
    </div>
  );
}

export default App;