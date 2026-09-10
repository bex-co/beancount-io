export const THEME_STORAGE_KEY = "vite-ui-theme";

export type ResolvedTheme = "light" | "dark";

export const getSystemTheme = (): ResolvedTheme => {
  // During SSR, default to light theme
  if (typeof window === "undefined") {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

/**
 * Subscribe to browser color-scheme changes. Returns an unsubscribe function.
 * No-ops during SSR.
 */
export function subscribeSystemTheme(
  onChange: (theme: ResolvedTheme) => void,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const handleChange = () => {
    onChange(media.matches ? "dark" : "light");
  };
  media.addEventListener("change", handleChange);
  return () => media.removeEventListener("change", handleChange);
}
