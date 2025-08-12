import { create } from "zustand";

export const useThemeStore = create((set) => ({
  theme: localStorage.getItem("chatify-theme") || "coffee",
  setTheme: (theme) => {
    localStorage.setItem("chatify-theme", theme);
    set({ theme });
  },
}));
