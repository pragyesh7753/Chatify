import { create } from "zustand";

export const useThemeStore = create((set) => ({
  theme: typeof window !== "undefined" ? localStorage.getItem("chatify-theme") || "coffee" : "coffee",
  setTheme: (theme) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("chatify-theme", theme);
    }
    set({ theme });
  },
}));
