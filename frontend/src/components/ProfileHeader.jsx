import { useState, useRef } from "react";
import { 
  LogOutIcon, 
  VolumeOffIcon, 
  Volume2Icon, 
  Bell, 
  UserPlus, 
  MoreVerticalIcon
} from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
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
    <div className={`${compact ? "p-3" : "p-6"} relative`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* AVATAR */}
          <div className="avatar online flex-shrink-0">
            <button
              className={`${compact ? "w-10 h-10" : "w-14 h-14"} rounded-full overflow-hidden relative group`}
              onClick={() => fileInputRef.current.click()}
              title={authUser.fullName}
            >
              <img
                src={selectedImg || authUser.profilePic || "/avatar.png"}
                alt="User image"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                {!compact && <span className="text-white text-xs">Change</span>}
              </div>
            </button>

            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

          {/* USERNAME & ONLINE TEXT */}
          {!compact && (
            <div className="min-w-0 flex-1">
              <h3 className="text-slate-200 font-medium text-base truncate" title={authUser.fullName}>
                {authUser.fullName}
              </h3>
              <p className="text-slate-400 text-xs">Online</p>
            </div>
          )}
        </div>

        {/* MENU BUTTON - Para todos los dispositivos */}
        {!compact && (
          <div className="flex-shrink-0 ml-16"> {/* Cambié ml-3 por ml-6 */}
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="text-slate-400 hover:text-slate-200 transition-colors p-2 rounded-full hover:bg-slate-700"
              title="Menu"
            >
              <MoreVerticalIcon className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* MENU DROPDOWN - Para todos los dispositivos */}
        {showMenu && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40"
              onClick={() => setShowMenu(false)}
            />
            {/* Menu */}
            <div className="absolute top-full right-0 mt-1 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50">
              <div className="p-2 space-y-1">
                {/* Find users */}
                <button
                  onClick={() => handleMenuAction(() => setShowSearchModal(true))}
                  className="w-full flex items-center gap-3 px-3 py-3 text-slate-300 hover:bg-slate-700 rounded-md transition-colors text-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Agregar</span>
                </button>

                {/* Contact requests */}
                <button
                  onClick={() => handleMenuAction(() => setShowRequestsModal(true))}
                  className="w-full flex items-center gap-3 px-3 py-3 text-slate-300 hover:bg-slate-700 rounded-md transition-colors text-sm relative"
                >
                  <Bell className="w-4 h-4" />
                  <span>Solicitudes de contacto</span>
                  <div className="absolute right-3">
                    <NotificationBadge />
                  </div>
                </button>

                {/* Sound toggle */}
                <button
                  onClick={() => handleMenuAction(handleToggleSound)}
                  className="w-full flex items-center gap-3 px-3 py-3 text-slate-300 hover:bg-slate-700 rounded-md transition-colors text-sm"
                >
                  {isSoundEnabled ? (
                    <Volume2Icon className="w-4 h-4" />
                  ) : (
                    <VolumeOffIcon className="w-4 h-4" />
                  )}
                  <span>{isSoundEnabled ? "Silenciar sonido" : "Enable sound"}</span>
                </button>

                {/* Logout */}
                <button
                  onClick={() => handleMenuAction(logout)}
                  className="w-full flex items-center gap-3 px-3 py-3 text-red-400 hover:bg-slate-700 rounded-md transition-colors text-sm"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-slate-900 rounded p-4 w-11/12 max-w-md">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-slate-200 font-medium">Solicitudes de contacto</h4>
                <button className="text-slate-400" onClick={() => setShowRequestsModal(false)}>Salir</button>
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