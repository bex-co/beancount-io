import { useContext } from "react";
import { LedgerProviderContext } from "./context";

export function useLedger() {
  const context = useContext(LedgerProviderContext);

  if (context === undefined) {
    throw new Error("useLedger must be used within a LedgerProvider");
  }

  return context;
}
