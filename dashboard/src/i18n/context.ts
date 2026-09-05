import { createContext, useContext } from "react";
import type { Localization } from "./init";

export const LocalizationContext = createContext<Localization | null>(null);

export function useLocalization() {
  const value = useContext(LocalizationContext);
  if (!value) throw new Error("LocalizationProvider is required");
  return value;
}
