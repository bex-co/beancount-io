export type Theme = "dark" | "light" | "system";

export type ResolvedTheme = "light" | "dark";

export type ThemeProviderContextType = {
  /** Stored preference: explicit light/dark or follow the OS. */
  theme: Theme;
  /** Currently rendered appearance after resolving `system`. */
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
};
