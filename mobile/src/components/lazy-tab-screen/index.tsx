import { useIsFocused } from "expo-router";
import { useEffect, useRef } from "react";
import { useApolloClient } from "@apollo/client";
import { View } from "react-native";
import { useTheme } from "@/common/theme";
import { ledgerRevisionVar } from "@/common/apollo/invalidate-ledger";
import { refreshOnForeground } from "@/common/apollo/refresh-on-foreground";
import { tabFocusRefreshDue } from "./tab-focus-gate";

type Props = {
  children: JSX.Element;
};

/**
 * Native tabs need a screen mounted for every tab, but the app's screens fire
 * their queries as soon as they render. Defer each real screen until its first
 * focus, then keep it mounted so tab-local scroll and UI state are preserved.
 */
export function LazyTabScreen({ children }: Props): JSX.Element {
  const focused = useIsFocused();
  const visited = useRef(focused);
  const theme = useTheme().colorTheme;
  const client = useApolloClient();

  // A tab already visited catches up with changes made elsewhere when it is
  // shown again (w21/837); the first visit fetches by mounting.
  const hadFocus = useRef(false);
  useEffect(() => {
    if (!focused) return;
    if (hadFocus.current && tabFocusRefreshDue()) {
      void refreshOnForeground(client, () =>
        ledgerRevisionVar(ledgerRevisionVar() + 1),
      );
    }
    hadFocus.current = true;
  }, [focused, client]);

  if (focused) {
    visited.current = true;
  }

  return visited.current ? (
    children
  ) : (
    <View style={{ flex: 1, backgroundColor: theme.white }} />
  );
}
