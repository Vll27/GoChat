import { useEffect } from "react";
import { useConfigStore } from "../store/useConfigStore";
import toast from "react-hot-toast";
import { Image, Palette } from "lucide-react"; // Iconos opcionales para dejarlo más estético

function AppColor() {
  const {
    appBorderColor, sidebarBgColor, appBgColor,
    appBgIsImage, appBgImage, // 👈 Estados definitivos nuevos
    previewAppBorderColor, setPreviewAppBorderColor,
    previewSidebarBgColor, setPreviewSidebarBgColor,
    previewAppBgColor, setPreviewAppBgColor,
    previewAppBgIsImage, setPreviewAppBgIsImage, // 👈 Estados de preview nuevos
    previewAppBgImage, setPreviewAppBgImage,     // 👈 Guardará la URL de la imagen en preview
    saveAppColorChanges, cancelAppColorChanges, setIsSubConfigOpen
  } = useConfigStore();

  useEffect(() => {
    setPreviewAppBorderColor(appBorderColor);
    setPreviewSidebarBgColor(sidebarBgColor);
    setPreviewAppBgColor(appBgColor);
    // Sincronizamos los nuevos estados al montar el componente
    if (setPreviewAppBgIsImage) setPreviewAppBgIsImage(appBgIsImage || false);
    if (setPreviewAppBgImage) setPreviewAppBgImage(appBgImage || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000"); 
  }, [appBorderColor, sidebarBgColor, appBgColor, appBgIsImage, appBgImage]);

  // Manejo de cambio de imagen local (puedes usar URLs o implementar un FileReader más adelante)
  const handleImageUrlChange = (e) => {
    if (setPreviewAppBgImage) setPreviewAppBgImage(e.target.value);
  };

  return (
    <div className="w-full h-full flex flex-col lg:flex-row gap-6 lg:gap-12 items-center justify-center animate-fadeIn">
      
      {/* CONTROLES */}
      <div className="w-full lg:w-5/12 h-[78vh] bg-slate-900/60 border border-slate-700/40 rounded-2xl p-6 flex flex-col justify-between shadow-xl relative">
        <button
          onClick={() => { cancelAppColorChanges(); setIsSubConfigOpen(false); }}
          className="absolute top-4 left-4 p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700/50 text-xs"
        >
          ← Volver
        </button>

        <div className="mt-12 flex flex-col gap-5 overflow-y-auto pr-1 custom-scrollbar flex-1">
          <div className="text-center">
            <h2 className="text-base font-semibold text-slate-100">Diseño de la Interfaz</h2>
          </div>

          {/* CHECKBOX: FONDO PERSONALIZADO */}
          <div className="flex items-center justify-between bg-slate-950/20 p-3 rounded-xl border border-slate-800/60">
            <div className="flex flex-col gap-0.5">
              <label htmlFor="custom-bg-check" className="text-xs font-medium text-slate-200 cursor-pointer">
                Fondo de la aplicación personalizado
              </label>
              <span className="text-[10px] text-slate-500">Usá una imagen externa en vez de un color plano</span>
            </div>
            <input 
              id="custom-bg-check"
              type="checkbox" 
              checked={previewAppBgIsImage}
              onChange={(e) => setPreviewAppBgIsImage(e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500/20 cursor-pointer"
            />
          </div>

          {/* RENDERIZADO CONDICIONAL: IMAGEN VS COLOR PICKER */}
          {previewAppBgIsImage ? (
            /* CONTROL DE IMAGEN DE FONDO */
            <div className="flex flex-col gap-1.5 animate-slideIn">
              <label className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
                <Image className="w-3.5 h-3.5 text-cyan-400" /> URL de la Imagen de Fondo
              </label>
              <div className="flex flex-col gap-2 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/80">
                <input 
                  type="text" 
                  value={previewAppBgImage} 
                  onChange={handleImageUrlChange}
                  placeholder="Introduce la URL de tu imagen (https://...)" 
                  className="w-full bg-slate-900 border border-slate-700/40 rounded px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50" 
                />
              </div>
            </div>
          ) : (
            /* CONTROL DEL COLOR DE FONDO GENERAL */
            <div className="flex flex-col gap-1.5 animate-slideIn">
              <label className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-cyan-400" /> Fondo de la aplicación (General)
              </label>
              <div className="flex items-center gap-3 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/80">
                <input 
                  type="color" 
                  value={previewAppBgColor} 
                  onChange={(e) => setPreviewAppBgColor(e.target.value)} 
                  className="w-10 h-8 rounded cursor-pointer bg-transparent" 
                />
                <input 
                  type="text" 
                  value={previewAppBgColor.toUpperCase()} 
                  onChange={(e) => setPreviewAppBgColor(e.target.value)} 
                  maxLength={7} 
                  className="flex-1 bg-slate-900 border border-slate-700/40 rounded px-2.5 py-1 text-xs font-mono text-slate-200" 
                />
              </div>
            </div>
          )}

          {/* Color del Contorno */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-400">Color del Contorno / Bordes</label>
            <div className="flex items-center gap-3 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/80">
              <input 
                type="color" 
                value={previewAppBorderColor} 
                onChange={(e) => setPreviewAppBorderColor(e.target.value)} 
                className="w-10 h-8 rounded cursor-pointer bg-transparent" 
              />
              <input 
                type="text" 
                value={previewAppBorderColor.toUpperCase()} 
                onChange={(e) => setPreviewAppBorderColor(e.target.value)} 
                maxLength={7} 
                className="flex-1 bg-slate-900 border border-slate-700/40 rounded px-2.5 py-1 text-xs font-mono text-slate-200" 
              />
            </div>
          </div>

          {/* Color de la Barra Lateral */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-400">Fondo de tu lista de chats</label>
            <div className="flex items-center gap-3 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/80">
              <input 
                type="color" 
                value={previewSidebarBgColor} 
                onChange={(e) => setPreviewSidebarBgColor(e.target.value)} 
                className="w-10 h-8 rounded cursor-pointer bg-transparent" 
              />
              <input 
                type="text" 
                value={previewSidebarBgColor.toUpperCase()} 
                onChange={(e) => setPreviewSidebarBgColor(e.target.value)} 
                maxLength={7} 
                className="flex-1 bg-slate-900 border border-slate-700/40 rounded px-2.5 py-1 text-xs font-mono text-slate-200" 
              />
            </div>
          </div>
        </div>

        <button 
          onClick={() => {
            saveAppColorChanges();
            toast.success("Configuración de interfaz guardada");
          }} 
          className="w-full mt-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium text-xs rounded-xl border-b-2 transition-all duration-200" 
          style={{ borderColor: previewAppBorderColor }}
        >
          Guardar cambios
        </button>
      </div>

      {/* PREVISUALIZACIÓN AFECTADA POR EL CONDICIONAL */}
      <div className="w-full lg:w-7/12 h-[78vh] bg-slate-900/40 border border-slate-700/20 rounded-2xl p-6 flex flex-col justify-center items-center shadow-xl relative overflow-hidden">
        <span className="absolute top-3 right-4 bg-slate-950/80 text-[9px] tracking-wider text-slate-400 uppercase font-semibold px-2 py-0.5 rounded border border-slate-800 z-30">
          Vista Previa
        </span>

        {/* Contenedor principal de la simulación */}
        <div 
          className="w-full h-full rounded-xl flex p-4 gap-3 relative transition-all duration-300 items-center justify-center bg-cover bg-center"
          style={{ 
            // Si el checkbox está activo, inyectamos la imagen de fondo; de lo contrario, el color plano
            backgroundImage: previewAppBgIsImage ? `url(${previewAppBgImage})` : "none",
            backgroundColor: previewAppBgIsImage ? "transparent" : previewAppBgColor 
          }}
        >
          {/* El marco interno */}
          <div 
            className="w-full h-full rounded-xl flex p-3 gap-3 relative border transition-all duration-300"
            style={{ 
              backgroundColor: previewAppBgIsImage ? "rgba(15, 23, 42, 0.4)" : "transparent", // Le da un ligero contraste oscuro si hay imagen de fondo
              backdropBlur: previewAppBgIsImage ? "4px" : "0px",
              border: `2px solid ${previewAppBorderColor}` 
            }}
          >
            {/* Sidebar simulado */}
            <div 
              className="w-1/3 h-full rounded-xl border p-2 flex flex-col gap-2 transition-all duration-300"
              style={{ 
                backgroundColor: previewSidebarBgColor,
                borderColor: `${previewAppBorderColor}66`
              }}
            >
              <div className="flex items-center gap-1.5 border-b border-slate-700/40 pb-2">
                <div className="size-4 rounded-full bg-cyan-500" />
                <div className="h-1.5 w-10 bg-slate-600 rounded" />
              </div>
              <div className="h-5 w-full rounded bg-slate-950/30 flex gap-1 p-0.5">
                <div className="flex-1 bg-slate-700 rounded text-[8px] text-center flex items-center justify-center text-white font-bold">Chats</div>
                <div className="flex-1 text-[8px] text-slate-500 text-center flex items-center justify-center">Ajustes</div>
              </div>
            </div>

            {/* ChatContainer simulado */}
            <div 
              className="w-2/3 h-full bg-slate-950/20 backdrop-blur-md rounded-xl border p-3 flex flex-col justify-between transition-all duration-300"
              style={{ borderColor: `${previewAppBorderColor}44` }}
            >
              <div className="h-4 w-full bg-slate-900/40 rounded flex items-center px-2" />
              <div className="h-4 bg-slate-900/40 rounded" />
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

export default AppColor;