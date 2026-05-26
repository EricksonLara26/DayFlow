import { createContext, useCallback, useEffect, useMemo, useState } from "react";

const PREFERENCES_STORAGE_KEY = "dayflow-preferences";

const defaultPreferences = {
  darkMode: false,
  navigationMode: "top",
};

export const PreferencesContext = createContext(null);

function getSystemDarkModePreference() {
  if (typeof window === "undefined") {
    return false;
  }

  return Boolean(window.matchMedia?.("(prefers-color-scheme: dark)").matches);
}

function readStoredPreferences() {
  if (typeof window === "undefined") {
    return defaultPreferences;
  }

  try {
    const rawPreferences = window.localStorage.getItem(PREFERENCES_STORAGE_KEY);
    const parsedPreferences = rawPreferences ? JSON.parse(rawPreferences) : {};
    const darkMode =
      parsedPreferences.darkMode !== undefined
        ? Boolean(parsedPreferences.darkMode)
        : getSystemDarkModePreference();

    return {
      darkMode,
      navigationMode: "top",
    };
  } catch {
    return defaultPreferences;
  }
}

export function PreferencesProvider({ children }) {
  const [preferences, setPreferences] = useState(readStoredPreferences);

  useEffect(() => {
    const mediaQuery = window.matchMedia?.("(prefers-color-scheme: dark)");

    if (!mediaQuery?.addEventListener) {
      return undefined;
    }

    function handleSystemThemeChange(event) {
      if (window.localStorage.getItem(PREFERENCES_STORAGE_KEY)) {
        return;
      }

      setPreferences((currentPreferences) => ({
        ...currentPreferences,
        darkMode: event.matches,
      }));
    }

    mediaQuery.addEventListener("change", handleSystemThemeChange);
    return () => mediaQuery.removeEventListener("change", handleSystemThemeChange);
  }, []);

  const updatePreferences = useCallback((nextPreferences) => {
    setPreferences((currentPreferences) => {
      const updatedPreferences = { ...currentPreferences, ...nextPreferences };

      try {
        window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(updatedPreferences));
      } catch {
        // La configuracion sigue activa durante la sesion aunque el navegador bloquee almacenamiento local.
      }

      return updatedPreferences;
    });
  }, []);

  const value = useMemo(
    () => ({
      preferences,
      updatePreferences,
    }),
    [preferences, updatePreferences],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}
