import { useState, useRef } from "react";
import {
  LogOutIcon,
  VolumeOffIcon,
  Volume2Icon,
  Bell,
  UserPlus,
  Settings,
  Camera
} from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { useNavigate } from "react-router";
import NotificationBadge from "./NotificationBadge";
import ContactRequests from "./ContactRequests";
import SearchUsersModal from "./SearchUsersModal";

const mouseClickSound = new Audio("/sounds/mouse-click.mp3");

function ProfileHeader({ compact = false }) {
  const { logout, authUser, updateProfile } = useAuthStore();
  const { isSoundEnabled, toggleSound } = useChatStore();
  const [selectedImg, setSelectedImg] = useState(null);
  const [showRequestsModal, setShowRequestsModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onloadend = async () => {
      const base64Image = reader.result;
      setSelectedImg(base64Image);
      await updateProfile({ profilePic: base64Image });
    };
  };

  const handleToggleSound = () => {
    mouseClickSound.currentTime = 0;
    mouseClickSound.play().catch((error) => console.log("Audio play failed:", error));
    toggleSound();
  };

  const handleMenuAction = (action) => {
    action();
    setShowMenu(false);
  };

  return (
    <div className={`${compact ? "p-1" : "p-2"} relative w-full`}>
      <div className="flex items-center justify-between w-full">
        
        {/* TARJETA INTERACTIVA DE PERFIL (Actúa como el 'group' principal) */}
        <div 
          onClick={() => !compact && setShowMenu(!showMenu)}
          className={`flex items-center gap-3 flex-1 min-w-0 rounded-xl transition-all duration-300 relative
            ${!compact ? "cursor-pointer p-2 hover:bg-slate-700/30 group" : ""}
          `}
        >
          {/* AVATAR ESTÁTICO */}
          <div className="avatar online flex-shrink-0">
            <div className={`${compact ? "w-10 h-10" : "w-12 h-12"} rounded-full overflow-hidden`}>
              <img
                src={selectedImg || authUser.profilePic || "/avatar.png"}
                alt="User image"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* ÁREA DE TEXTO E ICONO EN HOVER */}
          {!compact && (
            <div className="flex items-center justify-between flex-1 min-w-0 w-full pr-1">
              {/* Bloque de Textos */}
              <div className="min-w-0 flex-1 transition-all duration-300 group-hover:pr-7">
                {/* El nombre se trunca dinámicamente */}
                <h3 className="text-slate-200 font-medium text-sm truncate" title={authUser.fullName}>
                  {authUser.fullName}
                </h3>
                <p className="text-emerald-400 text-xs">
                  Conectado
                </p>
              </div>

              {/* RUEDITA DE CONFIGURACIÓN ANIMADA */}
              <div className="absolute right-3 opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300 flex items-center justify-center">
                <Settings 
                  className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 group-hover:rotate-45 transition-all duration-300" 
                />
              </div>
            </div>
          )}
        </div>

        {/* INPUT OCULTO PARA LA IMAGEN */}
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleImageUpload}
          className="hidden"
        />

        {/* MENU DROPDOWN */}
        {showMenu && !compact && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(false);
              }}
            />

            {/* Menu */}
            <div className="absolute top-full left-2 right-2 mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 animate-fadeIn">
              <div className="p-1.5 space-y-0.5">
                {/* Find users */}
                <button
                  onClick={() => handleMenuAction(() => setShowSearchModal(true))}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-300 hover:bg-slate-700/60 rounded-lg transition-colors text-sm"
                >
                  <UserPlus className="w-4 h-4 text-slate-400" />
                  <span>Agregar</span>
                </button>

                {/* Contact requests */}
                <button
                  onClick={() => handleMenuAction(() => setShowRequestsModal(true))}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-300 hover:bg-slate-700/60 rounded-lg transition-colors text-sm relative"
                >
                  <Bell className="w-4 h-4 text-slate-400" />
                  <span>Mis solicitudes</span>
                  <div className="absolute right-3">
                    <NotificationBadge />
                  </div>
                </button>

                {/* Cambiar foto de perfil */}
                <button
                  onClick={() => handleMenuAction(() => fileInputRef.current.click())}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-300 hover:bg-slate-700/60 rounded-lg transition-colors text-sm"
                >
                  <Camera className="w-4 h-4 text-slate-400" />
                  <span>Cambiar foto de perfil</span>
                </button>

                {/* Sound toggle */}
                <button
                  onClick={() => handleMenuAction(handleToggleSound)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-300 hover:bg-slate-700/60 rounded-lg transition-colors text-sm"
                >
                  {isSoundEnabled ? (
                    <Volume2Icon className="w-4 h-4 text-slate-400" />
                  ) : (
                    <VolumeOffIcon className="w-4 h-4 text-slate-400" />
                  )}
                  <span>{isSoundEnabled ? "Silenciar sonidos" : "Activar sonidos"}</span>
                </button>

                {/* Configuración */}
                <button
                  onClick={() => handleMenuAction(() => navigate("/config"))}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-300 hover:bg-slate-700/60 rounded-lg transition-colors text-sm border-t border-slate-700/50 mt-1 pt-2"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>Configuración</span>
                </button>

                {/* Logout */}
                <button
                  onClick={() => handleMenuAction(logout)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-sm"
                >
                  <LogOutIcon className="w-4 h-4" />
                  <span>Cerrar sesión</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* REQUESTS MODAL */}
        {showRequestsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowRequestsModal(false)}>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 w-11/12 max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-slate-200 font-bold text-lg">Mis solicitudes</h4>
                <button className="text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-200 transition-colors" onClick={() => setShowRequestsModal(false)}>Cerrar</button>
              </div>
              <ContactRequests />
            </div>
          </div>
        )}

        {/* SEARCH MODAL */}
        <SearchUsersModal isOpen={showSearchModal} onClose={() => setShowSearchModal(false)} />
      </div>
    </div>
  );
}

export default ProfileHeader;