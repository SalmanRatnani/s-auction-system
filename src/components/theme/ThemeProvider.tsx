"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  parseTheme,
  resolveTheme,
  THEME_KEY,
  type ThemePreference,
  type ResolvedTheme,
} from "./theme";

type ThemeState = { preference: ThemePreference; resolved: ResolvedTheme };
const ThemeContext = createContext<
  ThemeState & { setPreference: (value: ThemePreference) => void }
>({ preference: "system", resolved: "light", setPreference: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ThemeState>({
    preference: "system",
    resolved: "light",
  });
  const preferenceRef = useRef<ThemePreference>("system");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const apply = useCallback((preference: ThemePreference, animate = false) => {
    const resolved = resolveTheme(
      preference,
      window.matchMedia("(prefers-color-scheme: dark)").matches,
    );
    const root = document.documentElement;
    if (
      animate &&
      root.dataset.theme !== resolved &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      root.dataset.themeTransition = "true";
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        delete root.dataset.themeTransition;
      }, 420);
    }
    preferenceRef.current = preference;
    root.dataset.theme = resolved;
    root.dataset.themePreference = preference;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", resolved === "dark" ? "#070907" : "#f3f4ee");
    setState((previous) =>
      previous.preference === preference && previous.resolved === resolved
        ? previous
        : { preference, resolved },
    );
  }, []);

  useEffect(() => {
    let preference = parseTheme(
      document.documentElement.dataset.themePreference,
    );
    try {
      preference = parseTheme(localStorage.getItem(THEME_KEY));
    } catch {
      /* Theme still works when storage is blocked. */
    }
    apply(preference);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystem = () => {
      if (preferenceRef.current === "system") apply("system");
    };
    const onStorage = (event: StorageEvent) => {
      try {
        if (event.storageArea !== window.localStorage) return;
      } catch {
        return;
      }
      if (event.key === THEME_KEY || event.key === null)
        apply(parseTheme(event.newValue));
    };
    media.addEventListener("change", onSystem);
    window.addEventListener("storage", onStorage);
    return () => {
      media.removeEventListener("change", onSystem);
      window.removeEventListener("storage", onStorage);
      if (timer.current) clearTimeout(timer.current);
      delete document.documentElement.dataset.themeTransition;
    };
  }, [apply]);

  const setPreference = useCallback(
    (preference: ThemePreference) => {
      try {
        localStorage.setItem(THEME_KEY, preference);
      } catch {
        /* Keep an in-memory choice for this session. */
      }
      apply(preference, true);
    },
    [apply],
  );
  const value = useMemo(
    () => ({ ...state, setPreference }),
    [state, setPreference],
  );
  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
