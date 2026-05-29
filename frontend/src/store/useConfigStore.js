import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useConfigStore = create(
  persist(
    (set) => ({
      // ─── CONTROL DE INTERFAZ ───
      activeConfigTab: "fondo", // "fondo" | "colores" | "fuentes"
      setActiveConfigTab: (tab) => set({ activeConfigTab: tab }),
      isSubConfigOpen: false,
      setIsSubConfigOpen: (isOpen) => set({ isSubConfigOpen: isOpen }),

      // ─── VALORES DEFINITIVOS (SE GUARDAN EN LOCALSTORAGE) ───
      chatWallpaper: null,
      themeColor: "#06b6d4",       // Cyan por defecto garantizado
      receiverColor: "#1e293b",    // Slate-800 por defecto garantizado
      isTextBold: false,
      chatFontSize: 16,

      // ─── VALORES TEMPORALES (PREVIEWS EN VIVO) ───
      previewWallpaper: null,
      previewThemeColor: "#06b6d4",
      previewReceiverColor: "#1e293b",
      previewIsTextBold: false,
      previewChatFontSize: 16,

      // ─── ACCIONES DE ACTUALIZACIÓN DE PREVIEWS ───
      setPreviewWallpaper: (wallpaper) => set({ previewWallpaper: wallpaper }),
      setPreviewThemeColor: (color) => set({ previewThemeColor: color }),
      setPreviewReceiverColor: (color) => set({ previewReceiverColor: color }),
      setPreviewIsTextBold: (isBold) => set({ previewIsTextBold: isBold }),
      setPreviewChatFontSize: (size) => set({ previewChatFontSize: size }),

      // ─── SINCRONIZACIÓN Y GUARDADO COMPLETO ───
      saveWallpaperChanges: () => set((state) => ({
        chatWallpaper: state.previewWallpaper
      })),

      saveThemeChanges: () => set((state) => ({
        themeColor: state.previewThemeColor,
        receiverColor: state.previewReceiverColor,
        isTextBold: state.previewIsTextBold,
        chatFontSize: state.previewChatFontSize,
      })),

      // Cancelar restaura los previews basándose en lo que SÍ está guardado a fuego
      cancelWallpaperChanges: () => set((state) => ({
        previewWallpaper: state.chatWallpaper
      })),

      cancelThemeChanges: () => set((state) => ({
        previewThemeColor: state.themeColor,
        previewReceiverColor: state.receiverColor,
        previewIsTextBold: state.isTextBold,
        previewChatFontSize: state.chatFontSize,
      })),
    }),
    {
      name: "gochat-config-storage",
      // CRUCIAL: Aquí le decimos a Zustand qué llaves exactas van al LocalStorage del navegador
      partialize: (state) => ({
        chatWallpaper: state.chatWallpaper,
        themeColor: state.themeColor,
        receiverColor: state.receiverColor,
        isTextBold: state.isTextBold,
        chatFontSize: state.chatFontSize,
      }),
    }
  )
);