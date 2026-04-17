import { create } from "zustand";

export const useThemeStore = create((set) => ({
  mode: "dark",
  setMode: (mode) => set({ mode })
}));
