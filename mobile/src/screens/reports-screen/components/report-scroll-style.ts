import { StyleSheet } from "react-native";
import { space } from "@/common/theme";

/**
 * Shared top gutter for the Reports tab bodies. `DashboardCard` only carries a
 * bottom margin, so without this the first card sits flush against the tab bar.
 * Kept in one place so all three tabs breathe identically.
 */
export const reportScrollStyles = StyleSheet.create({
  content: {
    paddingTop: space.lg,
  },
});
