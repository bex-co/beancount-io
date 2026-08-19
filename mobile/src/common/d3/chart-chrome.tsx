import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { ErrorBoundary } from "react-error-boundary";
import { ColorTheme } from "@/types/theme-props";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import { useTranslations } from "@/common/hooks/use-translations";
import { fontSizes, space } from "@/common/theme";
import { LTR_PLOT } from "@/common/rtl";

/**
 * The furniture every d3 chart in this folder puts around its plot: the crash
 * guard, the not-enough-data placeholder, and the legend row.
 *
 * These were copy-pasted across the charts — the styles block alone was
 * byte-identical in two of them — so a change to the legend swatch or the
 * placeholder copy had to be made twice and silently drifted when it wasn't.
 * The plot itself deliberately stays in each chart: bars, step lines and net
 * lines are genuinely different drawings, and merging those would be the wrong
 * kind of sharing.
 */

/**
 * Height the legend row adds below the plot: its `paddingTop` (`space.sm`) plus
 * one line of `fontSizes.sm` label. A caller's skeleton has to include this or
 * the card grows by a legend's worth the moment data lands.
 */
export const LEGEND_HEIGHT = 26;

/** Plot insets shared by the bar charts, so their axes line up across screens. */
export const LEFT_PADDING = 50;
export const BOTTOM_PADDING = 30;
export const TOP_PADDING = 20;
export const AXIS_FONT_SIZE = 12;
export const LABEL_FONT_SIZE = 13;

export const getChromeStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      ...LTR_PLOT,
    },
    placeholder: {
      alignItems: "center",
      justifyContent: "center",
    },
    placeholderText: {
      fontSize: fontSizes.md,
      color: theme.black60,
    },
    legend: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "wrap",
      paddingTop: space.sm,
    },
    legendItem: {
      flexDirection: "row",
      alignItems: "center",
      marginHorizontal: space.md,
    },
    legendSwatch: {
      width: 10,
      height: 10,
      borderRadius: 2,
      marginEnd: space.xs,
    },
    // A dashed border on a zero-height view draws nothing on iOS, so a series
    // drawn as a line is marked in the legend by color, as the rest of the app
    // does.
    legendLine: {
      width: 14,
      height: 3,
      borderRadius: 2,
      marginEnd: space.xs,
    },
    legendText: {
      fontSize: fontSizes.sm,
      color: theme.black80,
    },
  });

/** Shown in place of the plot when there is nothing to draw. */
export function ChartPlaceholder({ height }: { height: number }): JSX.Element {
  const styles = useThemeStyle(getChromeStyles);
  const { t } = useTranslations();
  return (
    <View style={[styles.placeholder, { height }]}>
      <Text style={styles.placeholderText}>{t("notEnoughChartData")}</Text>
    </View>
  );
}

/** One legend entry: a colored mark and its label. */
export function LegendItem({
  color,
  label,
  mark = "swatch",
}: {
  color: string;
  label: string;
  /** `line` for series drawn as a stroke, `swatch` for filled bars. */
  mark?: "swatch" | "line";
}): JSX.Element {
  const styles = useThemeStyle(getChromeStyles);
  return (
    <View style={styles.legendItem}>
      <View
        style={[
          mark === "line" ? styles.legendLine : styles.legendSwatch,
          { backgroundColor: color },
        ]}
      />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

/** The legend row itself. */
export function ChartLegend({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const styles = useThemeStyle(getChromeStyles);
  return <View style={styles.legend}>{children}</View>;
}

/**
 * Collapses a chart to nothing if it throws.
 *
 * A chart is decoration around a number the user can read elsewhere, so a bad
 * series must not take the screen down with it. Every chart in this folder had
 * its own identical copy of this.
 */
export function ChartErrorBoundary({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  return (
    <ErrorBoundary
      fallback={null}
      onError={(error) => {
        console.error(error);
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
