import {
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeStyle } from "@/common/hooks";
import { fontSizes, fontWeights, useTheme } from "@/common/theme";
import { ColorTheme } from "@/types/theme-props";
import { useTranslations } from "@/common/hooks/use-translations";
import { LedgerDrawerButton } from "@/components/ledger-drawer";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    navBar: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.white,
    },
    navTitle: {
      flex: 1,
      fontSize: fontSizes.xl,
      fontWeight: fontWeights.medium,
      color: theme.black90,
      textAlign: "center",
    },
    // Same width as navRight so the centered title stays centered.
    navLeft: {
      flexDirection: "row",
      alignItems: "center",
      width: 64,
      justifyContent: "flex-start",
    },
    navRight: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      width: 64,
      justifyContent: "flex-end",
    },
    header: {
      backgroundColor: theme.white,
    },
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      marginHorizontal: 16,
      marginBottom: 8,
      backgroundColor: theme.black10,
      borderRadius: 10,
      paddingHorizontal: 10,
      height: 36,
    },
    searchInput: {
      flex: 1,
      marginLeft: 6,
      fontSize: fontSizes.lg,
      color: theme.black90,
    },
  });

interface TransactionsNavBarProps {
  onAdd: () => void;
}

export const TransactionsNavBar = ({ onAdd }: TransactionsNavBarProps) => {
  const styles = useThemeStyle(getStyles);
  const theme = useTheme().colorTheme;
  const { t } = useTranslations();

  return (
    <View style={styles.navBar}>
      <View style={styles.navLeft}>
        <LedgerDrawerButton />
      </View>
      <Text style={styles.navTitle}>{t("transactions")}</Text>
      <View style={styles.navRight}>
        <TouchableOpacity onPress={onAdd}>
          <Ionicons name="add" size={26} color={theme.black90} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

interface TransactionsHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

/**
 * List header for the transactions tab: a search box, nothing else.
 * Directive-level filters (Open/Close/Balance/…) stay on the journal screen —
 * this list is pinned to transactions.
 */
export const TransactionsHeader = ({
  searchQuery,
  onSearchChange,
}: TransactionsHeaderProps) => {
  const styles = useThemeStyle(getStyles);
  const theme = useTheme().colorTheme;
  const { t } = useTranslations();

  return (
    <View style={styles.header}>
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={16} color={theme.black60} />
        <TextInput
          style={styles.searchInput}
          placeholder={t("search")}
          placeholderTextColor={theme.black60}
          value={searchQuery}
          onChangeText={onSearchChange}
          returnKeyType="search"
          clearButtonMode="while-editing"
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>
    </View>
  );
};
