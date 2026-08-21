import { ReactNode } from "react";
import {
  RefreshControl,
  type RefreshControlProps,
  ScrollView,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from "react-native";
import { useTheme, gutter } from "@/common/theme";
import { refreshAppearance } from "./refresh-appearance";

export {
  refreshAppearance,
  type RefreshAppearance,
} from "./refresh-appearance";

const styles = StyleSheet.create({
  content: {
    // Side gutters keep cards off the screen edges — the app-wide inset.
    // Dashboard cards bring their own bottom margin, so spacing between them
    // stays uniform without extra spacers.
    paddingHorizontal: gutter,
    // Fill the frame even when the cards are short, so the whole area stays
    // inside the scrollable content and pull-to-refresh works everywhere.
    flexGrow: 1,
  },
});

type Props = {
  refreshing: boolean;
  onRefresh: () => void;
  /** Extra content-container styles (merged after the shared gutters). */
  contentContainerStyle?: StyleProp<ViewStyle>;
  children: ReactNode;
};

/**
 * Everything a list still decides. Appearance props are deliberately excluded:
 * a per-site override is how the app ended up with three conventions.
 */
type ThemedRefreshControlProps = Omit<
  RefreshControlProps,
  "tintColor" | "colors" | "progressBackgroundColor" | "titleColor"
>;

/** The dashboard refresh appearance, reusable by lists with their own scroll. */
export function ThemedRefreshControl(
  props: ThemedRefreshControlProps,
): JSX.Element {
  const { colorTheme, name } = useTheme();
  const themeName = name === "dark" ? "dark" : "light";

  return (
    <RefreshControl
      {...props}
      {...refreshAppearance(colorTheme, themeName)}
    />
  );
}

/**
 * Shared vertical scroll container for dashboard-style screens (Home, Reports):
 * consistent gutters, a dark-aware scroll indicator, and pull-to-refresh wired
 * to the screen's refresh state. Keeps the screens visually consistent and free
 * of duplicated ScrollView/RefreshControl boilerplate.
 */
export function DashboardScrollView({
  refreshing,
  onRefresh,
  contentContainerStyle,
  children,
}: Props): JSX.Element {
  // The resolved theme, not `themeVar` — that holds the *setting*, which can be
  // "system", and comparing it to "dark" gave every system-theme user the light
  // indicator on a dark screen.
  const themeName = useTheme().name;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      alwaysBounceVertical
      contentContainerStyle={[styles.content, contentContainerStyle]}
      indicatorStyle={themeName === "dark" ? "white" : "default"}
      refreshControl={
        <ThemedRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {children}
    </ScrollView>
  );
}
