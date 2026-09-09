import React, { createContext, useContext, memo, useEffect } from "react";
import {
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/common/theme";
import { useThemeStyle } from "@/common/hooks";
import { useTranslations } from "@/common/hooks/use-translations";
import { ColorTheme } from "@/types/theme-props";
import { Ionicons } from "@expo/vector-icons";
import { useReactiveVar } from "@apollo/client";
import { ledgerVar } from "@/common/vars";
import { useListLedgersQuery } from "@/generated-graphql/graphql";

interface LedgerGuardContextValue {
  ledgerId: string;
}

const LedgerGuardContext = createContext<LedgerGuardContextValue | undefined>(
  undefined,
);

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.white,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 24,
    },
    content: {
      alignItems: "center",
      maxWidth: 300,
    },
    icon: {
      marginBottom: 16,
    },
    title: {
      fontSize: 20,
      fontWeight: "600",
      color: theme.black,
      marginBottom: 8,
      textAlign: "center",
    },
    message: {
      fontSize: 16,
      color: theme.black60,
      marginBottom: 24,
      textAlign: "center",
      lineHeight: 24,
    },
    actions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
      justifyContent: "center",
    },
    button: {
      backgroundColor: theme.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    buttonSecondary: {
      backgroundColor: theme.black10,
    },
    buttonText: {
      color: theme.white,
      fontSize: 16,
      fontWeight: "600",
    },
    buttonTextSecondary: {
      color: theme.black,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.white,
    },
  });

interface LedgerGuardProviderProps {
  children: React.ReactNode;
  loading?: boolean;
}

const LedgerGuardProviderComponent = ({
  children,
}: LedgerGuardProviderProps) => {
  const ledgerId = useReactiveVar(ledgerVar);
  const router = useRouter();
  const styles = useThemeStyle(getStyles);
  const theme = useTheme().colorTheme;
  const { t } = useTranslations();

  // Self-heal an empty selection (fresh install, or splash-time validation
  // cleared a stale id) by defaulting to the user's first ledger.
  const { data, loading } = useListLedgersQuery({ skip: !!ledgerId });
  const firstLedgerId = data?.listLedgers?.[0]?.id;

  useEffect(() => {
    if (!ledgerId && firstLedgerId) {
      ledgerVar(firstLedgerId);
    }
  }, [ledgerId, firstLedgerId]);

  if (!ledgerId) {
    if (loading || firstLedgerId) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      );
    }
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Ionicons
            name="folder-outline"
            size={64}
            color={theme.black40}
            style={styles.icon}
          />
          <Text style={styles.title}>{t("ledgerGuardTitle")}</Text>
          <Text style={styles.message}>{t("ledgerGuardMessage")}</Text>
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                router.push("/(app)/create-ledger");
              }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t("createLedgerEmptyCreate")}
            >
              <Ionicons
                name="add-circle-outline"
                size={20}
                color={theme.white}
              />
              <Text style={styles.buttonText}>
                {t("createLedgerEmptyCreate")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={() => {
                router.push("/(app)/ledger-selection");
              }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t("createLedgerEmptyDiscover")}
            >
              <Ionicons name="search-outline" size={20} color={theme.black} />
              <Text style={[styles.buttonText, styles.buttonTextSecondary]}>
                {t("createLedgerEmptyDiscover")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <LedgerGuardContext.Provider value={{ ledgerId }}>
      {children}
    </LedgerGuardContext.Provider>
  );
};

LedgerGuardProviderComponent.displayName = "LedgerGuardProvider";

export const LedgerGuard = memo(LedgerGuardProviderComponent);

export const useLedgerGuard = (): string => {
  const context = useContext(LedgerGuardContext);
  if (context === undefined) {
    throw new Error("useLedgerGuard must be used within a LedgerGuardProvider");
  }
  return context.ledgerId;
};
