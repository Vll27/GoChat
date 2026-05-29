import { create } from "zustand";

export const useConfigStore = create((set) => ({
  // Pestaña activa dentro del panel de configuración
  activeConfigTab: "fondo", // Valores: "fondo" | "colores" | "fuentes"
  setActiveConfigTab: (tab) => set({ activeConfigTab: tab }),

  // Sub-burbuja derecha seleccionada (para vista móvil/desktop)
  isSubConfigOpen: false,
  setIsSubConfigOpen: (isOpen) => set({ isSubConfigOpen: isOpen }),

  // Estados de Personalización (Guardados en LocalStorage más adelante)
  bgGradient: "linear-gradient(to bottom, #000000, #111827)",
  chatWallpaper: null,
  globalFont: "font-sans",
  emitterBubbleColor: "#06b6d4",
}));