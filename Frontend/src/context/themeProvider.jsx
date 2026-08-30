// src/context/themeProvider.js
import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();
const THEME_TRANSITION_MS = 450;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let transitionTimeout = null;

const runThemeTransition = (applyThemeChange) => {
  if (prefersReducedMotion()) {
    applyThemeChange();
    return;
  }

  const root = document.documentElement;
  if (transitionTimeout) {
    clearTimeout(transitionTimeout);
  }
  root.classList.add("theme-transition");
  void root.offsetHeight;
  applyThemeChange();

  transitionTimeout = window.setTimeout(() => {
    root.classList.remove("theme-transition");
    transitionTimeout = null;
  }, THEME_TRANSITION_MS);
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark" || saved === "light") return saved;
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "light";
  });

  useEffect(() => {
    const root = document.documentElement;

    if (theme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
      root.setAttribute("data-theme", "dark");
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
      root.setAttribute("data-theme", "light");
    }

    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e) => {
      const saved = localStorage.getItem("theme");
      if (!saved) {
        setTheme(e.matches ? "dark" : "light");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const toggleTheme = () => {
    runThemeTransition(() => {
      setTheme((prev) => (prev === "dark" ? "light" : "dark"));
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
