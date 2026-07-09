import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { LedgerDrawer } from "./ledger-drawer";

type LedgerDrawerContextValue = {
  openDrawer: () => void;
};

const LedgerDrawerContext = createContext<LedgerDrawerContextValue | undefined>(
  undefined,
);

/** Hosts a single LedgerDrawer for the whole tab group; screens open it via
 * useLedgerDrawer() so every tab shares one drawer instance. */
export function LedgerDrawerProvider({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  const [open, setOpen] = useState(false);

  const openDrawer = useCallback(() => setOpen(true), []);
  const closeDrawer = useCallback(() => setOpen(false), []);

  const value = useMemo(() => ({ openDrawer }), [openDrawer]);

  return (
    <LedgerDrawerContext.Provider value={value}>
      <LedgerDrawer open={open} onOpen={openDrawer} onClose={closeDrawer}>
        {children}
      </LedgerDrawer>
    </LedgerDrawerContext.Provider>
  );
}

export function useLedgerDrawer(): LedgerDrawerContextValue {
  const context = useContext(LedgerDrawerContext);
  if (context === undefined) {
    throw new Error(
      "useLedgerDrawer must be used within a LedgerDrawerProvider",
    );
  }
  return context;
}
