import { StyleSheet, Text, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fontSizes, fontWeights, useTheme } from "@/common/theme";
import { ColorTheme } from "@/types/theme-props";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import { useTranslations } from "@/common/hooks/use-translations";
import { LoadingTile } from "@/components/loading-tile";
import type { AccountSuggestion } from "@/screens/add-transaction-screen/hooks/suggestion-utils";

const SKELETON_WIDTHS = [88, 120, 72];

type SuggestionChipsProps = {
  /** Runner-up accounts (history) or AI picks (llm) to offer as chips. */
  chips: AccountSuggestion[];
  /** Currently selected expense account, so the matching chip can highlight. */
  selectedAccount: string;
  /** Show a skeleton row while the first suggestion query is in flight. */
  loading: boolean;
  /** Called with the tapped account name. */
  onSelect: (account: string) => void;
};

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    container: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.black40,
      backgroundColor: "transparent",
    },
    chipActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    chipText: {
      fontSize: fontSizes.xs,
      fontWeight: fontWeights.medium,
      color: theme.text01,
    },
    chipTextActive: {
      color: theme.white,
    },
    // Skeleton chips mirror the chip line box so nothing shifts on resolve.
    skeletonChip: {
      height: 14,
      borderRadius: 7,
      marginVertical: 7,
    },
  });

/**
 * A compact horizontal row of suggestion chips shown under the expense ("to")
 * account row. History chips wear a clock icon (recent usage); AI chips wear a
 * sparkles icon. The chip matching the selected account highlights. While the
 * first suggestion is loading, a row of skeleton chips holds the layout.
 */
export function SuggestionChips({
  chips,
  selectedAccount,
  loading,
  onSelect,
}: SuggestionChipsProps): JSX.Element | null {
  const theme = useTheme().colorTheme;
  const styles = useThemeStyle(getStyles);
  const { t } = useTranslations();

  if (loading && chips.length === 0) {
    return (
      <View style={styles.container}>
        {SKELETON_WIDTHS.map((width, index) => (
          <LoadingTile
            key={index}
            style={StyleSheet.flatten([styles.skeletonChip, { width }])}
          />
        ))}
      </View>
    );
  }

  if (chips.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {chips.map((chip) => {
        const active = chip.account === selectedAccount;
        const label =
          chip.source === "llm"
            ? `${t("aiSuggestions")} · ${chip.account}`
            : `${t("suggestions")} · ${chip.account}`;
        return (
          <Pressable
            key={`${chip.source}:${chip.account}`}
            style={({ pressed }) => [
              styles.chip,
              active && styles.chipActive,
              pressed && !active && { opacity: 0.6 },
            ]}
            onPress={() => onSelect(chip.account)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={label}
          >
            <Ionicons
              name={chip.source === "llm" ? "sparkles" : "time-outline"}
              size={13}
              color={active ? theme.white : theme.black60}
            />
            <Text
              style={[styles.chipText, active && styles.chipTextActive]}
              numberOfLines={1}
            >
              {chip.account}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
