import { useEffect, useRef } from "react";
import { useConfigStore } from "../store/useConfigStore";
import toast from "react-hot-toast";

function WallpaperConfig() {
  const { chatWallpaper, previewWallpaper, setPreviewWallpaper, saveWallpaperChanges, cancelWallpaperChanges, setIsSubConfigOpen } = useConfigStore();
  const fileInputRef = useRef(null);

  // Al cargar por primera vez, el preview toma el valor del LocalStorage real
  useEffect(() => {
    setPreviewWallpaper(chatWallpaper);
  }, [chatWallpaper, setPreviewWallpaper]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewWallpaper(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    saveWallpaperChanges();
    toast.success("Fondo de pantalla guardado en el dispositivo");
  };

  return (
    <div className="w-full h-full flex flex-col md:flex-row gap-8 md:gap-16 items-center justify-center animate-fadeIn">
      
      {/* ─── SUB-BURBUJA 1: CONTROLES DE CONFIGURACIÓN ─── */}
      <div className="w-full md:w-1/2 h-[75vh] bg-slate-900/60 border border-slate-700/40 rounded-2xl p-6 flex flex-col justify-between shadow-xl relative">
        
        {/* Botón Volver arriba a la izquierda */}
        <button
          onClick={() => {
            cancelWallpaperChanges();
            setIsSubConfigOpen(false);
          }}
          className="absolute top-4 left-4 p-2 rounded-xl bg-slate-800 text-cyan-400 hover:text-cyan-300 border border-slate-700/50 text-xs font-medium transition-all duration-200"
        >
          ← Volver
        </button>

        <div className="mt-12 flex flex-col items-center text-center gap-4">
          <h2 className="text-lg font-semibold text-slate-100">Fondo de pantalla del chat</h2>
          <p className="text-xs text-slate-400 max-w-xs">
            Subí una imagen desde tu dispositivo para cambiarla. Esta imagen se usará en todos tus chats.
          </p>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageChange}
            accept="image/*"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-4 px-5 py-3 bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 border border-cyan-500/20 text-xs font-medium rounded-xl transition-all duration-200 flex items-center gap-2 shadow-md"
          >
            📁 Cargar imagen
          </button>
        </div>

        {/* Acciones de Guardar al fondo */}
        <div className="flex gap-3 w-full border-t border-slate-800 pt-4">
          <button
            onClick={handleSave}
            disabled={!previewWallpaper}
            className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white font-medium text-xs rounded-xl shadow-lg shadow-cyan-500/10 hover:from-cyan-600 hover:to-cyan-700 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Guardar Cambios
          </button>
        </div>
      </div>

      {/* ─── SUB-BURBUJA 2: PREVIEW EN VIVO DE LA APP ─── */}
      <div className="w-full md:w-1/2 h-[75vh] bg-slate-900/40 border border-slate-700/20 rounded-2xl p-4 flex flex-col shadow-xl overflow-hidden relative">
        <span className="absolute top-3 right-4 bg-slate-950/80 text-[10px] tracking-wider text-slate-400 uppercase font-semibold px-2 py-1 rounded-md border border-slate-800 z-30">
          Vista Previa
        </span>

        {/* Contenedor simulador de ChatContainer */}
        <div 
          className="w-full h-full rounded-xl relative overflow-hidden flex flex-col justify-between p-4 bg-black border border-slate-800 transition-all duration-300"
          style={{
            backgroundImage: previewWallpaper ? `url(${previewWallpaper})` : "none",
            backgroundSize: "cover",
            backgroundPosition: "center"
          }}
        >
          {/* Header del Chat Simulado */}
          <div className="w-full h-10 bg-slate-800/60 backdrop-blur-md rounded-lg flex items-center px-3 border border-slate-700/30 z-10">
            <div className="size-6 bg-cyan-500/20 rounded-full border border-cyan-500/40" />
            <div className="h-3 w-20 bg-slate-700 rounded ml-2" />
          </div>

          {/* Burbujas de chat ficticias */}
          <div className="flex flex-col gap-3 my-auto z-10">
            <div className="bg-slate-800/80 backdrop-blur-sm p-2.5 rounded-xl rounded-bl-none text-[11px] text-slate-300 max-w-[70%] border border-slate-700/30 self-start">
              Así se verá tu fondo en GoChat...
            </div>
            <div className="bg-cyan-500/20 backdrop-blur-sm p-2.5 rounded-xl rounded-br-none text-[11px] text-cyan-300 max-w-[70%] border border-cyan-500/30 self-end">
              ¡Que bonito!
            </div>
          </div>

          {/* Input de Chat Simulado */}
          <div className="w-full h-10 bg-slate-800/40 backdrop-blur-md rounded-lg border border-slate-700/20 z-10" />
        </div>
      </div>

    </div>
  );
}

export default WallpaperConfig;