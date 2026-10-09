import { ReactNode } from "react";
import {
  StyleSheet,
  Text,
  View,
  ViewStyle,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "@/components/pressable-scale";
import { ColorTheme } from "@/types/theme-props";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import {
  fontSizes,
  fontWeights,
  gutter,
  space,
  useTheme,
} from "@/common/theme";
import { useTranslations } from "@/common/hooks/use-translations";
import { LEADING_TEXT_ALIGN, directionalIcon } from "@/common/rtl";
import { prefersStackedLayout } from "@/common/theme/dynamic-type";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    card: {
      backgroundColor: theme.controlFill,
      borderRadius: gutter,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.controlBorder,
      paddingVertical: space.lg,
      marginBottom: space.lg,
      overflow: "hidden",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: gutter,
      marginBottom: space.md,
    },
    // Accessibility text sizes: the title gets the whole line instead of a
    // sliver beside its actions, which move below it at the trailing edge.
    headerStacked: {
      flexDirection: "column",
      alignItems: "stretch",
      gap: space.xs,
    },
    actions: {
      flexDirection: "row",
      alignItems: "center",
    },
    actionsStacked: {
      alignSelf: "flex-end",
    },
    title: {
      flex: 1,
      fontSize: fontSizes.xl,
      fontWeight: fontWeights.medium,
      color: theme.text01,
      textAlign: LEADING_TEXT_ALIGN,
    },
    seeAll: {
      flexDirection: "row",
      alignItems: "center",
    },
    seeAllText: {
      fontSize: fontSizes.md,
      fontWeight: fontWeights.medium,
      color: theme.primary,
      marginEnd: space.xxs,
    },
    content: {
      paddingHorizontal: gutter,
    },
  });

export type DashboardCardProps = {
  /** Optional header title rendered on the left of the header row. */
  title?: string;
  /** When set, renders a right-aligned "see all →" affordance. */
  onSeeAll?: () => void;
  /** Optional actions slot rendered before the "see all" affordance. */
  right?: ReactNode;
  /**
   * When true, children render edge-to-edge (no horizontal content padding).
   * Use for full-width charts or rows that already manage their own insets.
   */
  bleed?: boolean;
  style?: ViewStyle;
  /** Identifier on the card's root view, for automation lookups. */
  testID?: string;
  children: ReactNode;
};

/**
 * Monarch-style rounded dashboard card with an optional header row
 * (title, actions slot, and a "see all →" affordance). Colors come from
 * theme tokens so it reads correctly in light and dark.
 */
export function DashboardCard({
  title,
  onSeeAll,
  right,
  bleed = false,
  style,
  testID,
  children,
}: DashboardCardProps): JSX.Element {
  const styles = useThemeStyle(getStyles);
  const theme = useTheme().colorTheme;
  const { t } = useTranslations();
  const hasHeader = Boolean(title || onSeeAll || right);
  const { fontScale } = useWindowDimensions();
  const stacked = Boolean(title) && prefersStackedLayout(fontScale);

  return (
    <View style={[styles.card, style]} testID={testID}>
      {hasHeader && (
        <View style={[styles.header, stacked && styles.headerStacked]}>
          {/* Keyed on the live scale so a text-size change while open
              remeasures the heading (see DateSectionHeader). */}
          {title ? (
            <Text
              key={fontScale}
              style={[styles.title, stacked && { flex: 0 }]}
            >
              {title}
            </Text>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          <View style={[styles.actions, stacked && styles.actionsStacked]}>
            {right}
            {onSeeAll && (
              <PressableScale
                style={styles.seeAll}
                onPress={onSeeAll}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t("seeAll")}
              >
                <Text key={fontScale} style={styles.seeAllText}>
                  {t("seeAll")}
                </Text>
                <Ionicons
                  name={directionalIcon("chevron-forward")}
                  size={16}
                  color={theme.primary}
                />
              </PressableScale>
            )}
          </View>
        </View>
      )}
      <View style={bleed ? undefined : styles.content}>{children}</View>
    </View>
  );
}
