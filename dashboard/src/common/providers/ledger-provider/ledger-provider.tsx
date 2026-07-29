import { LedgerProviderContext } from "./context";
import type { LedgerProviderContextType } from "./context";

type LedgerProviderProps = {
  ledgerName: string;
  ledgerOwner: string;
  ledgerData: LedgerProviderContextType["ledgerData"];
  children: React.ReactNode;
};

export function LedgerProvider({
  ledgerName,
  ledgerOwner,
  ledgerData,
  children,
}: LedgerProviderProps) {
  const primaryCurrency = ledgerData.options.operatingCurrency[0] ?? "USD";
  const ledgerDisplayName = ledgerData.name;
  const ledgerDescription = ledgerData.description ?? null;
  return (
    <LedgerProviderContext.Provider
      value={{
        ledgerName,
        ledgerOwner,
        ledgerData,
        primaryCurrency,
        ledgerDisplayName,
        ledgerDescription,
      }}
    >
      {children}
    </LedgerProviderContext.Provider>
  );
}
