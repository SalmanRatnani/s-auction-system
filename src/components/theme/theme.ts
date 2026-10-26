export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";
export const THEME_KEY = "s-auction:theme:v1";

export function parseTheme(value: unknown): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}

export function resolveTheme(
  preference: ThemePreference,
  prefersDark: boolean,
): ResolvedTheme {
  return preference === "system"
    ? prefersDark
      ? "dark"
      : "light"
    : preference;
}

// Fixed application code only: runs in the head before the first painted page.
export const themeBootstrap = `(()=>{try{let p="system";try{const v=localStorage.getItem("${THEME_KEY}");if(v==="light"||v==="dark")p=v}catch{}const t=p==="system"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):p;document.documentElement.dataset.theme=t;document.documentElement.dataset.themePreference=p;document.querySelector('meta[name="theme-color"]')?.setAttribute("content",t==="dark"?"#070907":"#f3f4ee")}catch{}})();`;
