import { useState } from 'react';
import { Type, Check } from "lucide-react";
import { useChatStore } from "../store/useChatStore";

const AVAILABLE_FONTS = [
  { id: "font-sans", name: "Moderna (Sans)", preview: "Abc - GoChat" },
  { id: "font-serif", name: "Clásica (Serif)", preview: "Abc - GoChat" },
  { id: "font-mono", name: "Código (Mono)", preview: "Abc - GoChat" },
  { id: "font-display", name: "Juvenil (Display)", preview: "Abc - GoChat" },
];

const PREVIEW_MSG = [
    {sender: "Yader Merlo", text: "sonic"},
    {sender: "Joao Cortez", text: "¿Vas sobre por un cacao o qué?"},
    {sender: "Sebastian Castro", text: "cuadro 1 y cuadro 2"},
    {sender: "José Fonseca", text: "Viva el Boér"},
    {sender: "Derek Treminio", text: "¡HALA MADRID!"}
];

export default function FontTextConfig() {
  const { currentFont, changeFont } = useChatStore();
  const [randomMsg] = useState(() => Math.floor(Math.random() * PREVIEW_MSG.length));
  
  // Mensaje suertudo.
  const samplePreview = PREVIEW_MSG[randomMsg];

  return (
    <div className="space-y-6 animate-fadeIn h-full flex flex-col justify-center max-w-2xl mx-auto">
      <div>
        <h3 className="text-xl font-bold text-slate-200 flex items-center gap-2">
          <Type className="w-5 h-5 text-cyan-400" />
          Tipografía de GoChat
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Personalizá la fuente de todos los textos en tu aplicación.
        </p>
      </div>

      {/* Grid de opciones */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {AVAILABLE_FONTS.map((font) => {
          const isSelected = currentFont === font.id;
          return (
            <button
              key={font.id}
              onClick={() => changeFont(font.id)}
              className={`p-4 rounded-xl border text-left transition-all duration-300 relative group
                ${isSelected 
                  ? "bg-slate-700/40 border-cyan-500 shadow-lg shadow-cyan-500/5" 
                  : "bg-slate-800/50 border-slate-700 hover:bg-slate-700/20 hover:border-slate-600"
                }
              `}
            >
              <div className="flex flex-col h-full justify-between gap-2">
                <span className="text-xs text-slate-400 font-medium">{font.name}</span>
                {/* Aplicamos la clase de la fuente localmente para la vista previa */}
                <span className={`text-xl font-bold text-slate-200 ${font.id}`}>
                  {font.preview}
                </span>
              </div>

              {/* Check de seleccionado */}
              {isSelected && (
                <div className="absolute top-3 right-3 bg-cyan-500 text-slate-950 p-0.5 rounded-full">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Tarjeta de ejemplo en vivo */}
      <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl mt-4">
        <span className="text-xs text-slate-500 block mb-2 font-mono">Vista previa de los cambios:</span>
        <div className={`space-y-1 ${currentFont}`}>
          <h4 className="text-sm font-semibold text-slate-200">{samplePreview.sender}</h4> {/* Sender aleatorio */}
          <p className="text-xs text-slate-400">{samplePreview.text}</p> {/* Texto aleatorio */}
        </div>
      </div>
    </div>
  );
}