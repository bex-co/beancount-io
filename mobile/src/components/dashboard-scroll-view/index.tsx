import { ReactNode } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from "react-native";
import { useReactiveVar } from "@apollo/client";
import { themeVar } from "@/common/vars";

const styles = StyleSheet.create({
  content: {
    // 16px side gutters keep cards off the screen edges; a little top room
    // lifts the first card off the header/tab-bar divider. Dashboard cards
    // bring their own 16px bottom margin, so spacing between them stays uniform
    // without extra spacers.
    paddingHorizontal: 16,
    paddingTop: 16,
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
  const currentTheme = useReactiveVar(themeVar);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.content, contentContainerStyle]}
      indicatorStyle={currentTheme === "dark" ? "white" : "default"}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={currentTheme === "dark" ? "white" : "black"}
        />
      }
    >
      {children}
    </ScrollView>
  );
}
