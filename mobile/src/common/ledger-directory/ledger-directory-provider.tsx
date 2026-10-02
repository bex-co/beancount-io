import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import { useApolloClient } from "@apollo/client";
import { LedgerDirectory } from "./ledger-directory";

const Context = createContext<LedgerDirectory | null>(null);

export function LedgerDirectoryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const client = useApolloClient();
  const directory = useMemo(() => new LedgerDirectory(client), [client]);
  useEffect(() => {
    void directory.load().catch(() => {}); // Error is rendered by the drawer.
    return directory.dispose;
  }, [directory]);
  return <Context.Provider value={directory}>{children}</Context.Provider>;
}

export function useLedgerDirectory() {
  const directory = useContext(Context);
  if (!directory) throw new Error("Ledger directory provider not found");
  const state = useSyncExternalStore(
    directory.subscribe,
    directory.getSnapshot,
  );
  return { ...state, refresh: directory.refresh };
}
