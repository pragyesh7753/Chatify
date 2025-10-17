import { create } from "zustand";

const updateDarkModeClass = (theme) => {
  if (typeof window !== "undefined") {
    const isDarkTheme = [
      "dark", "synthwave", "halloween", "forest", "black", 
      "luxury", "dracula", "business", "night", "coffee"
    ].includes(theme);
    
    if (isDarkTheme) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }
};

export const useThemeStore = create((set) => {
  const savedTheme = typeof window !== "undefined" ? localStorage.getItem("chatify-theme") || "coffee" : "coffee";
  updateDarkModeClass(savedTheme);
  
  return {
    theme: savedTheme,
    setTheme: (theme) => {
      if (typeof window !== "undefined") {
        localStorage.setItem("chatify-theme", theme);
      }
      updateDarkModeClass(theme);
      set({ theme });
    },
  };
});
