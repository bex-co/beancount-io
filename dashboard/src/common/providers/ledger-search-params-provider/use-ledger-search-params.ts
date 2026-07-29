import { useContext } from "react";
import { LedgerSearchParamsContext } from "./context.ts";

export const useLedgerSearchParams = () => {
  const context = useContext(LedgerSearchParamsContext);
  if (!context) {
    throw new Error(
      "useLedgerSearchParams must be used within LedgerSearchParamsProvider",
    );
  }
  return context;
};
