import { useEffect } from "react";
import { useConfigStore } from "../store/useConfigStore";
import toast from "react-hot-toast";

function ThemeConfig() {
  const {
    themeColor, receiverColor, isTextBold, chatFontSize, // Requerimos los originales
    previewThemeColor, setPreviewThemeColor,
    previewReceiverColor, setPreviewReceiverColor,
    previewIsTextBold, setPreviewIsTextBold,
    previewChatFontSize, setPreviewChatFontSize,
    saveThemeChanges, cancelThemeChanges, setIsSubConfigOpen
  } = useConfigStore();

  // Sincronizar estados locales con el almacenamiento para que no se quede colgado
  useEffect(() => {
    setPreviewThemeColor(themeColor);
    setPreviewReceiverColor(receiverColor);
    setPreviewIsTextBold(isTextBold);
    setPreviewChatFontSize(chatFontSize);
  }, [themeColor, receiverColor, isTextBold, chatFontSize]);

  const handleSave = () => {
    saveThemeChanges();
    toast.success("Ajustes de color aplicados");
  };

  return (
    <div className="w-full h-full flex flex-col lg:flex-row gap-6 lg:gap-12 items-center justify-center animate-fadeIn">
      
      {/* CONTROLES */}
      <div className="w-full lg:w-5/12 h-[78vh] bg-slate-900/60 border border-slate-700/40 rounded-2xl p-6 flex flex-col justify-between shadow-xl relative">
        <button
          onClick={() => { cancelThemeChanges(); setIsSubConfigOpen(false); }}
          className="absolute top-4 left-4 p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700/50 text-xs"
        >
          ← Volver
        </button>

        <div className="mt-12 flex flex-col gap-5 overflow-y-auto pr-1 custom-scrollbar flex-1">
          <div className="text-center">
            <h2 className="text-base font-semibold text-slate-100">¡Personalizá ya tu experiencia!</h2>
          </div>

          {/* Color Remitente */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-400">Color de la aplicación</label>
            <div className="flex items-center gap-3 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/80">
              <input type="color" value={previewThemeColor} onChange={(e) => setPreviewThemeColor(e.target.value)} className="w-10 h-8 rounded cursor-pointer bg-transparent" />
              <input type="text" value={previewThemeColor.toUpperCase()} onChange={(e) => setPreviewThemeColor(e.target.value)} maxLength={7} className="flex-1 bg-slate-900 border border-slate-700/40 rounded px-2.5 py-1 text-xs font-mono text-slate-200" />
            </div>
          </div>

          {/* Color Emisor */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-400">Burbuja de tus contactos</label>
            <div className="flex items-center gap-3 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/80">
              <input type="color" value={previewReceiverColor} onChange={(e) => setPreviewReceiverColor(e.target.value)} className="w-10 h-8 rounded cursor-pointer bg-transparent" />
              <input type="text" value={previewReceiverColor.toUpperCase()} onChange={(e) => setPreviewReceiverColor(e.target.value)} maxLength={7} className="flex-1 bg-slate-900 border border-slate-700/40 rounded px-2.5 py-1 text-xs font-mono text-slate-200" />
            </div>
          </div>

          {/* Tamaño y Grosor */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-slate-400">Texto ({previewChatFontSize}px)</label>
              <input type="range" min="12" max="22" value={previewChatFontSize} onChange={(e) => setPreviewChatFontSize(Number(e.target.value))} className="w-full accent-cyan-500 mt-2" />
            </div>
            <div className="flex items-center justify-between bg-slate-950/30 px-3 rounded-xl border border-slate-800/80 h-11 mt-auto">
              <label className="text-[11px] font-medium text-slate-400">Negrita</label>
              <input type="checkbox" checked={previewIsTextBold} onChange={(e) => setPreviewIsTextBold(e.target.checked)} className="w-3.5 h-3.5 text-cyan-600 rounded bg-slate-900 border-slate-700" />
            </div>
          </div>
        </div>

        <button onClick={handleSave} className="w-full mt-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium text-xs rounded-xl border-l-4 transition-all duration-200" style={{ borderColor: previewThemeColor }}>
          Guardar cambios
        </button>
      </div>

      {/* PREVISUALIZACIÓN */}
      <div className="w-full lg:w-7/12 h-[78vh] bg-slate-900/40 border border-slate-700/20 rounded-2xl p-4 flex flex-col justify-center items-center shadow-xl relative overflow-hidden">
        <span className="absolute top-3 right-4 bg-slate-950/80 text-[9px] tracking-wider text-slate-400 uppercase font-semibold px-2 py-0.5 rounded border border-slate-800 z-30">
          Vista previa de los cambios
        </span>

        <div className="w-full h-full rounded-xl bg-black border border-slate-800 flex p-3 gap-3 relative">
          
          {/* Burbuja 1: Sidebar (Tabs/Contactos) */}
          <div className="w-1/3 h-full bg-slate-800/60 backdrop-blur-md rounded-xl border border-slate-700/40 p-2 flex flex-col gap-2">
            {/* Header / Perfil */}
            <div className="flex items-center gap-1.5 border-b border-slate-700/40 pb-2">
              <div className="size-5 rounded-full" style={{ backgroundColor: previewThemeColor }} />
              <div className="h-2 w-12 bg-slate-600 rounded" />
            </div>
            {/* ActiveTabSwitch simulado */}
            <div className="h-6 w-full rounded-lg bg-slate-950/50 p-0.5 flex gap-1">
              <div className="flex-1 rounded-md text-[9px] font-bold text-center flex items-center justify-center shadow-sm" style={{ backgroundColor: previewThemeColor, color: '#fff' }}>Chats</div>
              <div className="flex-1 text-[9px] text-slate-500 text-center flex items-center justify-center">Ajustes</div>
            </div>
            {/* ContactList/ChatsList */}
            <div className="p-1.5 rounded-lg flex items-center gap-1.5" style={{ backgroundColor: `${previewThemeColor}15` }}>
              <div className="size-3.5 rounded-full bg-slate-600" />
              <div className="h-1.5 w-8 bg-slate-400 rounded" />
            </div>
          </div>

          {/* Burbuja 2: ChatContainer */}
          <div className="w-2/3 h-full bg-slate-800/40 backdrop-blur-md rounded-xl border border-slate-700/30 p-3 flex flex-col justify-between">
            <div className="h-5 w-full bg-slate-900/40 rounded flex items-center px-2 border border-slate-800">
              <div className="h-1.5 w-16 bg-slate-600 rounded" />
            </div>

            {/* Mensajes */}
            <div className="flex flex-col gap-2 my-auto" style={{ fontSize: `${previewChatFontSize - 3}px`, fontWeight: previewIsTextBold ? "700" : "400" }}>
              {/* Emisor (Ellos) */}
              <div className="p-2 rounded-xl rounded-bl-none text-white max-w-[85%] self-start border border-black/10 shadow-sm" style={{ backgroundColor: previewReceiverColor }}>
                Mensaje del emisor
              </div>
              {/* Remitente (Tú) */}
              <div className="p-2 rounded-xl rounded-br-none text-white max-w-[85%] self-end border border-black/10 shadow-sm" style={{ backgroundColor: previewThemeColor }}>
                Tu respuesta clara
              </div>
            </div>

            <div className="flex gap-1.5">
              <div className="flex-1 h-5 bg-slate-900/40 rounded border border-slate-700/20" />
              <div className="size-5 rounded flex items-center justify-center text-white text-[9px]" style={{ backgroundColor: previewThemeColor }}>✈️</div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}

export default ThemeConfig;