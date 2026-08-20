import { StyleSheet, View } from "react-native";
import {
  gutter,
  rowMinHeight,
  rowPaddingVertical,
  space,
} from "@/common/theme";
import { useThemeStyle } from "@/common/hooks";
import { LoadingTile } from "@/components/loading-tile";
import { ColorTheme } from "@/types/theme-props";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.white,
    },
    header: {
      paddingHorizontal: gutter,
      paddingTop: space.lg,
      paddingBottom: space.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.black20,
      gap: space.sm,
    },
    logoRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: space.sm,
    },
    logo: {
      width: 40,
      height: 40,
      borderRadius: 12,
    },
    // Mirrors stats name lineHeight 22 + count lineHeight 18 + gap.
    nameBlock: {
      flex: 1,
      gap: 4,
    },
    nameTile: {
      height: 22,
      width: "55%",
      marginVertical: 0,
    },
    countTile: {
      height: 18,
      width: "40%",
    },
    totalsRow: {
      gap: 6,
      marginTop: space.xs,
    },
    totalTile: {
      height: 20,
      marginVertical: 0,
    },
    dateTile: {
      height: 18,
      width: "70%",
      marginTop: 2,
    },
    toggleTile: {
      height: 52,
      width: "100%",
      marginTop: space.sm,
      borderRadius: 8,
    },
    sectionHeader: {
      paddingHorizontal: gutter,
      paddingVertical: 6,
      backgroundColor: theme.black10,
    },
    sectionHeaderTile: {
      height: 13,
      width: 132,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: gutter,
      paddingVertical: rowPaddingVertical,
      minHeight: rowMinHeight,
    },
    iconTile: {
      width: 40,
      height: 40,
      borderRadius: 12,
      marginEnd: 12,
    },
    nameWrap: {
      flex: 1,
    },
    amountTile: {
      height: 14,
      width: 68,
      marginStart: 8,
    },
  });

const ROW_WIDTHS = ["62%", "78%", "45%", "70%", "55%"] as const;
const TOTAL_WIDTHS = ["48%", "36%"] as const;

/**
 * First-load skeleton: stats header + a couple of dated transaction rows,
 * sized to the real line boxes so content does not jump when data lands.
 */
export function MerchantDetailSkeleton() {
  const styles = useThemeStyle(getStyles);

  return (
    <View style={styles.container} testID="merchant-detail-skeleton">
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <LoadingTile style={styles.logo} />
          <View style={styles.nameBlock}>
            <LoadingTile style={styles.nameTile} />
            <LoadingTile style={styles.countTile} />
          </View>
        </View>
        <View style={styles.totalsRow}>
          {TOTAL_WIDTHS.map((width, index) => (
            <LoadingTile key={index} style={{ ...styles.totalTile, width }} />
          ))}
        </View>
        <LoadingTile style={styles.dateTile} />
        <LoadingTile style={styles.toggleTile} />
      </View>
      {[0, 1].map((section) => (
        <View key={section}>
          <View style={styles.sectionHeader}>
            <LoadingTile style={styles.sectionHeaderTile} />
          </View>
          {ROW_WIDTHS.slice(0, 3).map((width, index) => (
            <View key={index} style={styles.row}>
              <LoadingTile style={styles.iconTile} />
              <View style={styles.nameWrap}>
                <LoadingTile style={{ height: 14, width }} />
              </View>
              <LoadingTile style={styles.amountTile} />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
