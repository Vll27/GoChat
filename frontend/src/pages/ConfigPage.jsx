import { useState, useEffect } from "react";
import { useConfigStore } from "../store/useConfigStore";
import BorderAnimatedContainer from "../components/BorderAnimatedContainer";

function ConfigPage() {
  const { activeConfigTab, setActiveConfigTab, isSubConfigOpen, setIsSubConfigOpen } = useConfigStore();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

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
                  <span className="text-xl">🖼️</span>
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
                  <span className="text-xl">🎨</span>
                  <span>Colores del tema</span>
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
                  <span className="text-xl">🔤</span>
                  <span>Fuentes de texto</span>
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
              <div className="w-full h-full flex flex-col relative pt-12">
                {/* Botón flotante para regresar al menú principal de configuración */}
                <button
                  onClick={() => setIsSubConfigOpen(false)}
                  className="absolute top-0 left-0 z-50 p-2.5 rounded-xl bg-slate-900/80 text-cyan-400 hover:text-cyan-300 border border-cyan-500/20 shadow-lg hover:bg-slate-900 transition-all duration-200 text-xs font-medium"
                >
                  ← Volver
                </button>
                
                {/* Zona de renderizado de opciones dinámicas */}
                <div className="w-full h-full flex-1 min-h-0 text-slate-200">
                  {activeConfigTab === "fondo" && <p className="text-center pt-10">Componente de Fondo en desarrollo...</p>}
                  {activeConfigTab === "colores" && <p className="text-center pt-10">Componente de Colores en desarrollo...</p>}
                  {activeConfigTab === "fuentes" && <p className="text-center pt-10">Componente de Fuentes en desarrollo...</p>}
                </div>
              </div>
            </div>

          </div>
      </div>
    </div>
  );
}

export default ConfigPage;