import { createContext } from "react";
import type { GetLedgerQuery } from "@/graphql/definitions";

export type LedgerProviderContextType = {
  ledgerName: string;
  ledgerOwner: string;
  ledgerData: GetLedgerQuery["getLedger"];
  primaryCurrency: string;
  ledgerDisplayName: string;
  ledgerDescription: string | null;
};

export const LedgerProviderContext = createContext<
  LedgerProviderContextType | undefined
>(undefined);
