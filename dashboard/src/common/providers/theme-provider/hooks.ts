import { useContext } from "react";
import { ThemeProviderContext } from "./context.ts";

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};

export const useIsDarkTheme = () => {
  const { resolvedTheme } = useTheme();
  return resolvedTheme === "dark";
};
