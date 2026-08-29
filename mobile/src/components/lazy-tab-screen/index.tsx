import { useIsFocused } from "expo-router";
import { useRef } from "react";
import { View } from "react-native";
import { useTheme } from "@/common/theme";

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

  if (focused) {
    visited.current = true;
  }

  return visited.current ? (
    children
  ) : (
    <View style={{ flex: 1, backgroundColor: theme.white }} />
  );
}
