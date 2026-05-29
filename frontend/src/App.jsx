import { Navigate, Route, Routes } from "react-router";
import ChatPage from "./pages/ChatPage";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import ConfigPage from "./pages/ConfigPage";
import { useAuthStore } from "./store/useAuthStore";
import { useChatStore } from "./store/useChatStore";
import { useEffect } from "react";
import PageLoader from "./components/PageLoader";
import { Toaster } from "react-hot-toast";

function App() {
  const { checkAuth, isCheckingAuth, authUser } = useAuthStore();
  const { setWindowFocus } = useChatStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Solicitar permisos para notificaciones
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then(permission => {
        console.log(" Permiso de notificación:", permission);
      });
    }
  }, []);

  // Detección de foco de ventana
  useEffect(() => {
    const handleFocus = () => {
      setWindowFocus(true);
      console.log(" Ventana en foco - Sonidos silenciados");
    };

    const handleBlur = () => {
      setWindowFocus(false);
      console.log(" Ventana fuera de foco - Sonidos activados");
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setWindowFocus(false);
        console.log(" Página oculta - Sonidos activados");
      } else {
        setWindowFocus(true);
        console.log(" Página visible - Sonidos silenciados");
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Estado inicial
    setWindowFocus(document.hasFocus());

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [setWindowFocus]);

  if (isCheckingAuth) return <PageLoader />;

  return (
    <div className="min-h-screen bg-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px]" />
      <div className="absolute top-0 -left-4 size-96 bg-pink-500 opacity-20 blur-[100px]" />
      <div className="absolute bottom-0 -right-4 size-96 bg-cyan-500 opacity-20 blur-[100px]" />

      <Routes>
        <Route path="/" element={authUser ? <ChatPage /> : <Navigate to={"/login"} />} />
        <Route path="/login" element={!authUser ? <LoginPage /> : <Navigate to={"/"} />} />
        <Route path="/signup" element={!authUser ? <SignUpPage /> : <Navigate to={"/"} />} />
        <Route path="/config" element={authUser ? <ConfigPage /> : <Navigate to = {"/login"} />}></Route>
      </Routes>

      <Toaster />
    </div>
  );
}

export default App;