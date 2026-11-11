import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import {
  fontSizes,
  gutter,
  prefersStackedLayout,
  sectionHeaderPaddingVertical,
} from "@/common/theme";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import { FadeOutView } from "@/components/crossfade";
import { LoadingTile } from "@/components/loading-tile";
import { ColorTheme } from "@/types/theme-props";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    // Loading states carry their own background, or the list flashes the
    // wrong color on the first frame in dark mode.
    skeleton: {
      backgroundColor: theme.white,
    },
    // Mirrors DateSectionHeader: band color, gutter, padding, date + total.
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: gutter,
      paddingVertical: sectionHeaderPaddingVertical,
      backgroundColor: theme.black10,
    },
    dateTile: {
      height: 13,
      width: 132,
    },
    totalTile: {
      height: 13,
      width: 56,
    },
    // Mirrors AccountEntryRow: 40px icon, 16/12 padding, trailing column of
    // change over its "Balance: …" caption.
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    // Same restack as AccountEntryRow at accessibility text sizes, so the list
    // does not jump when the rows replace the skeleton.
    rowStacked: {
      flexDirection: "column",
      alignItems: "stretch",
    },
    leading: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
    },
    iconTile: {
      width: 40,
      height: 40,
      borderRadius: 12,
      marginEnd: 12,
    },
    trailing: {
      alignItems: "flex-end",
      marginStart: 8,
    },
    trailingStacked: {
      alignItems: "flex-start",
      marginStart: 0,
      marginTop: 4,
    },
    changeTile: {
      height: 15,
      width: 72,
    },
    balanceTile: {
      height: 11,
      width: 104,
      marginTop: 4,
    },
    state: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 40,
    },
    stateText: {
      fontSize: fontSizes.md,
      color: theme.black80,
      textAlign: "center",
    },
  });

// Varied widths so the skeleton reads as content rather than stripes.
const TITLE_WIDTHS = ["58%", "74%", "46%", "66%", "52%", "80%"] as const;
const ROWS_PER_SECTION = 3;

/** The account journal's rows as placeholders, until the first page lands. */
function AccountJournalSkeleton(): JSX.Element {
  const styles = useThemeStyle(getStyles);
  const { fontScale } = useWindowDimensions();
  const stacked = prefersStackedLayout(fontScale);

  return (
    // Fades out over the rows that replace it: the list renders those cells
    // itself, so there is no loaded branch to fade in instead.
    <FadeOutView style={styles.skeleton}>
      {TITLE_WIDTHS.map((width, index) => (
        <View key={width + index}>
          {index % ROWS_PER_SECTION === 0 && (
            <View style={styles.sectionHeader}>
              <LoadingTile style={styles.dateTile} />
              <LoadingTile style={styles.totalTile} />
            </View>
          )}
          <View style={[styles.row, stacked && styles.rowStacked]}>
            <View style={styles.leading}>
              <LoadingTile style={styles.iconTile} />
              <LoadingTile height={16} style={{ width }} />
            </View>
            <View style={[styles.trailing, stacked && styles.trailingStacked]}>
              <LoadingTile style={styles.changeTile} />
              <LoadingTile style={styles.balanceTile} />
            </View>
          </View>
        </View>
      ))}
    </FadeOutView>
  );
}

/**
 * What the account journal shows with no rows: skeleton rows on the first
 * load (w21/005; `mobile/AGENTS.md` rules out a bare spinner there), else the
 * error or empty message. Paging keeps its footer spinner.
 */
export function AccountJournalListEmpty({
  loading,
  message,
}: {
  loading: boolean;
  message: string;
}): JSX.Element {
  const styles = useThemeStyle(getStyles);
  // Keys the message to re-measure after a live text-size change (w22/023).
  const { fontScale } = useWindowDimensions();
  if (loading) return <AccountJournalSkeleton />;
  return (
    <View style={styles.state}>
      <Text key={fontScale} style={styles.stateText}>
        {message}
      </Text>
    </View>
  );
}
