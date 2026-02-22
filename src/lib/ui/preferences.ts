import { useEffect, useState } from "react";

export type Locale = "es" | "en";
export type ThemeMode = "dark" | "light";

const LOCALE_STORAGE_KEY = "accessos-locale";
const THEME_STORAGE_KEY = "accessos-theme";

export function usePreferences() {
  const [locale, setLocale] = useState<Locale>(() => {
    if (typeof window === "undefined") {
      return "es";
    }
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return stored === "es" || stored === "en" ? stored : "es";
  });

  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") {
      return "dark";
    }
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "dark" || stored === "light" ? stored : "dark";
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }, [locale]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return { locale, setLocale, theme, setTheme };
}
