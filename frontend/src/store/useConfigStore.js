import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useConfigStore = create(
  persist(
    (set) => ({
      // ─── CONTROL DE INTERFAZ ───
      activeConfigTab: "fondo",
      setActiveConfigTab: (tab) => set({ activeConfigTab: tab }),
      isSubConfigOpen: false,
      setIsSubConfigOpen: (isOpen) => set({ isSubConfigOpen: isOpen }),

      // ─── VALORES DEFINITIVOS ───
      chatWallpaper: null,
      themeColor: "#06b6d4",
      receiverColor: "#1e293b",
      isTextBold: false,
      chatFontSize: 16,
      appBorderColor: "#1e293b",    // Color del contorno exterior
      sidebarBgColor: "#0f172a",    // Fondo de la barra de navegación/burbuja izquierda
      appBgColor: "#000000",

      // ─── VALORES TEMPORALES (PREVIEWS) ───
      previewWallpaper: null,
      previewThemeColor: "#06b6d4",
      previewReceiverColor: "#1e293b",
      previewIsTextBold: false,
      previewChatFontSize: 16,
      previewAppBorderColor: "#1e293b",
      previewSidebarBgColor: "#0f172a",
      previewAppBgColor: "#000000",

      // ─── ACCIONES DE PREVIEWS ───
      setPreviewWallpaper: (wallpaper) => set({ previewWallpaper: wallpaper }),
      setPreviewThemeColor: (color) => set({ previewThemeColor: color }),
      setPreviewReceiverColor: (color) => set({ previewReceiverColor: color }),
      setPreviewIsTextBold: (isBold) => set({ previewIsTextBold: isBold }),
      setPreviewChatFontSize: (size) => set({ previewChatFontSize: size }),
      setPreviewAppBorderColor: (color) => set({ previewAppBorderColor: color }),
      setPreviewSidebarBgColor: (color) => set({ previewSidebarBgColor: color }),
      setPreviewAppBgColor: (color) => set({ previewAppBgColor: color }),

      // ─── ACCIONES DE GUARDADO / CANCELADO ───
      saveWallpaperChanges: () => set((state) => ({ chatWallpaper: state.previewWallpaper })),
      saveThemeChanges: () => set((state) => ({
        themeColor: state.previewThemeColor,
        receiverColor: state.previewReceiverColor,
        isTextBold: state.previewIsTextBold,
        chatFontSize: state.previewChatFontSize,
      })),
      saveAppColorChanges: () => set((state) => ({
        appBorderColor: state.previewAppBorderColor,
        sidebarBgColor: state.previewSidebarBgColor,
        appBgColor: state.previewAppBgColor,
      })),

      cancelWallpaperChanges: () => set((state) => ({ previewWallpaper: state.chatWallpaper })),
      cancelThemeChanges: () => set((state) => ({
        previewThemeColor: state.themeColor,
        previewReceiverColor: state.receiverColor,
        previewIsTextBold: state.isTextBold,
        previewChatFontSize: state.chatFontSize,
      })),
      cancelAppColorChanges: () => set((state) => ({
        previewAppBorderColor: state.appBorderColor,
        previewSidebarBgColor: state.sidebarBgColor,
        previewAppBgColor: state.appBgColor,
      })),
    }),
    {
      name: "gochat-config-storage",
      partialize: (state) => ({
        chatWallpaper: state.chatWallpaper,
        themeColor: state.themeColor,
        receiverColor: state.receiverColor,
        isTextBold: state.isTextBold,
        chatFontSize: state.chatFontSize,
        appBorderColor: state.appBorderColor,
        sidebarBgColor: state.sidebarBgColor,
        appBgColor: state.appBgColor,
      }),
    }
  )
);