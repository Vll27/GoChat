import { useState, useEffect } from "react";
import { useConfigStore } from "../store/useConfigStore";
import { useNavigate } from "react-router";
// Importamos un icono de flecha/salida para que se vea más profesional (opcional)
import { LogOut, Image, Palette, Type, Layout } from "lucide-react"; 
import BorderAnimatedContainer from "../components/BorderAnimatedContainer";
import WallpaperConfig from "../components/WallpaperConfig";
import ThemeConfig from "../components/ThemeConfig";
import AppColor from "../components/AppColor.jsx";
import TextFont from "../components/TextFontConfig.jsx";

function ConfigPage() {
  const { activeConfigTab, setActiveConfigTab, isSubConfigOpen, setIsSubConfigOpen } = useConfigStore();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="w-full h-screen bg-black absolute inset-0 overflow-hidden">
      <div className="w-full h-full relative z-10">
        {/* Hay que suponer que la gente tardará mucho configurando que se estresarán por BorderAnimatedContainer */}
          <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
            
            {/* ================= BURBUJA 1: MENÚ DE PESTAÑAS (IZQUIERDA) ================= */}
            <div
              className={`w-full max-w-md h-[90vh] bg-slate-800/60 backdrop-blur-md rounded-2xl border border-slate-700/40 flex flex-col p-6 shadow-2xl transition-all duration-500 ease-in-out absolute z-10
                ${isSubConfigOpen 
                  ? "-translate-x-[120%] opacity-0 pointer-events-none scale-95" 
                  : "translate-x-0 opacity-100 scale-100"
                }
              `}
            >
              {/* Título centrado y arriba */}
              <h1 className="text-2xl font-bold text-center text-slate-100 tracking-wide border-b border-slate-700/50 pb-4 mb-6">
                Configuración
              </h1>

              {/* Lista de Pestañas */}
<div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
  
  {/* Opc 1: Fondo de Pantalla */}
  <button
    onClick={() => { setActiveConfigTab("fondo"); setIsSubConfigOpen(true); }}
    className={`w-full p-4 rounded-xl flex items-center gap-4 text-sm font-medium transition-all duration-200 border text-left
      ${activeConfigTab === "fondo"
        ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30 shadow-lg shadow-cyan-500/5"
        : "bg-slate-900/40 text-slate-300 border-slate-800 hover:bg-slate-800/50 hover:text-white"
      }
    `}
  >
    <Image className="w-5 h-5 flex-shrink-0" />
    <span>Fondo de pantalla</span>
  </button>

  {/* Opc 2: Colores del tema */}
  <button
    onClick={() => { setActiveConfigTab("colores"); setIsSubConfigOpen(true); }}
    className={`w-full p-4 rounded-xl flex items-center gap-4 text-sm font-medium transition-all duration-200 border text-left
      ${activeConfigTab === "colores"
        ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30 shadow-lg shadow-cyan-500/5"
        : "bg-slate-900/40 text-slate-300 border-slate-800 hover:bg-slate-800/50 hover:text-white"
      }
    `}
  >
    <Palette className="w-5 h-5 flex-shrink-0" />
    <span>Colores de la burbuja de chat</span>
  </button>

  {/* Opc 3: Fuentes de texto */}
  <button
    onClick={() => { setActiveConfigTab("fuentes"); setIsSubConfigOpen(true); }}
    className={`w-full p-4 rounded-xl flex items-center gap-4 text-sm font-medium transition-all duration-200 border text-left
      ${activeConfigTab === "fuentes"
        ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30 shadow-lg shadow-cyan-500/5"
        : "bg-slate-900/40 text-slate-300 border-slate-800 hover:bg-slate-800/50 hover:text-white"
      }
    `}
  >
    <Type className="w-5 h-5 flex-shrink-0" />
    <span>Fuentes de texto</span>
  </button>

  { /* Opc 4: Diseño de la interfaz */}
  <button
    onClick={() => { setActiveConfigTab("appColor"); setIsSubConfigOpen(true);}}
    className={`w-full p-4 rounded-xl flex items-center gap-4 text-sm font-medium transition-all duration-200 border text-left
      ${activeConfigTab === "appColor" 
        ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30 shadow-lg shadow-cyan-500/5" 
        : "bg-slate-900/40 text-slate-300 border-slate-800 hover:bg-slate-800/50 hover:text-white"
      }
    `}
  >
    <Layout className="w-5 h-5 flex-shrink-0" />
    <span>Diseño de la interfaz</span>
  </button>

</div>

              {/* ================= BOTÓN: VOLVER A TUS CHATS ================= */}
              <div className="mt-4 pt-4 border-t border-slate-700/50">
                <button
                  onClick={() => { navigate("/"); }} // Navegar a la pestaña de chats.
                  className="w-full p-3.5 rounded-xl flex items-center justify-center gap-3 text-sm font-semibold transition-all duration-200 bg-gradient-to-r from-rose-500/10 to-rose-600/10 text-rose-400 border border-rose-500/20 hover:from-rose-500/20 hover:to-rose-600/20 hover:text-rose-300 shadow-lg shadow-rose-900/5 active:scale-[0.98]"
                >
                  <LogOut className="w-4 h-4 rotate-180" /> {/* Icono de salida invertido como "volver" */}
                  <span>Volver a tus chats</span>
                </button>
              </div>

            </div>

            {/* ================= BURBUJA 2: OPCIONES DETALLADAS DE PESTAÑA (DERECHA) ================= */}
            <div
              className={`w-full max-w-4xl h-[90vh] bg-slate-800/40 backdrop-blur-md rounded-2xl border border-slate-700/30 flex flex-col p-6 shadow-2xl transition-all duration-500 ease-in-out absolute overflow-hidden
              ${isSubConfigOpen 
              ? "translate-x-0 opacity-100 scale-100 z-20" 
              : "translate-x-[120%] opacity-0 pointer-events-none scale-95 z-0"
              }
            `}
            >
              
            <div className="w-full h-full flex flex-col relative">
  {/* El botón volver solo se oculta si estamos en fondo o colores para usar los internos */}
  {activeConfigTab !== "fondo" && activeConfigTab !== "colores" && activeConfigTab !== "appColor" && (
    <button
      onClick={() => setIsSubConfigOpen(false)}
      className="absolute top-0 left-0 z-50 p-2.5 rounded-xl bg-slate-900/80 text-cyan-400 hover:text-cyan-300 border border-cyan-500/20 shadow-lg hover:bg-slate-900 transition-all duration-200 text-xs font-medium"
    >
      ← Volver
    </button>
  )}
  
  <div className="w-full h-full flex-1 min-h-0 text-slate-200">
    {activeConfigTab === "fondo" && <WallpaperConfig />}
    {activeConfigTab === "colores" && <ThemeConfig />} {/* ← Reemplazado aquí */}
    {activeConfigTab === "fuentes" && <TextFont />}
    {activeConfigTab === "appColor" && <AppColor />}
  </div>
</div>
          </div>

          </div>
      </div>
    </div>
  );
}

export default ConfigPage;