import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import type { GestureType } from "react-native-gesture-handler";
import { EdgeSwipeGestureProvider } from "@/common/horizontal-swipe-owner";
import { LedgerDrawer, type LedgerDrawerData } from "./ledger-drawer";
import { AccountLedgerDrawer } from "./account-ledger-drawer";

type LedgerDrawerContextValue = {
  openDrawer: () => void;
};

const LedgerDrawerContext = createContext<LedgerDrawerContextValue | undefined>(
  undefined,
);

/** Hosts a single LedgerDrawer for the whole tab group; screens open it via
 * useLedgerDrawer() so every tab shares one drawer instance. Also publishes the
 * drawer's edge-swipe gesture to the subtree, so components that own horizontal
 * swipes can declare a blocking relation against it. */
export function LedgerDrawerProvider({
  children,
  data,
}: {
  children: React.ReactNode;
  data?: LedgerDrawerData;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const edgeSwipeRef = useRef<GestureType | undefined>(undefined);

  const openDrawer = useCallback(() => setOpen(true), []);
  const closeDrawer = useCallback(() => setOpen(false), []);

  const value = useMemo(() => ({ openDrawer }), [openDrawer]);

  return (
    <LedgerDrawerContext.Provider value={value}>
      <EdgeSwipeGestureProvider value={edgeSwipeRef}>
        {data ? (
          <LedgerDrawer
            data={data}
            open={open}
            onOpen={openDrawer}
            onClose={closeDrawer}
            edgeSwipeRef={edgeSwipeRef}
          >
            {children}
          </LedgerDrawer>
        ) : (
          <AccountLedgerDrawer
            open={open}
            onOpen={openDrawer}
            onClose={closeDrawer}
            edgeSwipeRef={edgeSwipeRef}
          >
            {children}
          </AccountLedgerDrawer>
        )}
      </EdgeSwipeGestureProvider>
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
