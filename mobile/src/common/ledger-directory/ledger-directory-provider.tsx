import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import { AppState } from "react-native";
import { useApolloClient } from "@apollo/client";
import { createForegroundRefresher } from "../apollo/foreground-refresh";
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
    // Cached rows first, then a revalidation; an error is rendered by the drawer.
    void directory.revalidate().catch(() => {});
    return directory.dispose;
  }, [directory]);
  // A ledger created or removed elsewhere shows in the drawer after a return
  // to the app, not only after a relaunch or a pull to refresh (w21/225). The
  // provider owns the subscription: the shared refresher sits above it.
  useEffect(() => {
    const onChange = createForegroundRefresher({
      refresh: () => void directory.revalidate().catch(() => {}),
    });
    const subscription = AppState.addEventListener("change", onChange);
    return () => {
      subscription.remove();
      onChange.cancel();
    };
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

/** The directory when one is provided (the signed-in app), otherwise null. */
export function useOptionalLedgerDirectory(): LedgerDirectory | null {
  return useContext(Context);
}
