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
import {
  useLedgerReadContextQuery,
  useListLedgersQuery,
} from "@/generated-graphql/graphql";
import { isLedgerGone } from "@/common/graphql-error-codes";
import { useOptionalLedgerDirectory } from "@/common/ledger-directory/ledger-directory-provider";
import { useGuest } from "@/common/guest/guest-context";
import { InlineError } from "@/components/inline-error";

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
      color: theme.black80,
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
  const { data, loading, error, refetch } = useListLedgersQuery({
    skip: !!ledgerId,
  });
  const firstLedgerId = data?.listLedgers?.[0]?.id;

  useEffect(() => {
    if (!ledgerId && firstLedgerId) {
      ledgerVar(firstLedgerId);
    }
  }, [ledgerId, firstLedgerId]);

  // The selected ledger may have been deleted elsewhere. Say so once, here,
  // instead of a "Try again" on every card, and drop it from the drawer
  // (w21/054). Shares the read context Home already makes.
  const readContext = useLedgerReadContextQuery({
    variables: { ledgerId: ledgerId ?? "" },
    skip: !ledgerId,
  });
  const gone = Boolean(ledgerId) && isLedgerGone(readContext.error);
  const directory = useOptionalLedgerDirectory();
  useEffect(() => {
    if (gone) void directory?.refresh().catch(() => {});
  }, [gone, directory]);

  if (!ledgerId) {
    if (loading || firstLedgerId) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      );
    }
    // A list that failed to load is not an empty account: "No ledger selected"
    // with Create invited a duplicate ledger, and the only way out was leaving
    // the app (w21/295).
    if (error && !data) {
      return (
        <View style={styles.container} testID="ledger-guard-load-error">
          <View style={styles.content}>
            <Ionicons
              accessibilityElementsHidden
              importantForAccessibility="no"
              name="cloud-offline-outline"
              size={64}
              color={theme.black40}
              style={styles.icon}
            />
            <InlineError
              style={styles.message}
              message={t("discoveryLoadError")}
            />
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.button}
                onPress={() => void refetch().catch(() => undefined)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={t("discoveryRetry")}
              >
                <Text style={styles.buttonText}>{t("discoveryRetry")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="ledger-guard-settings"
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => {
                  router.push("/(app)/settings");
                }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={t("settings")}
              >
                <Ionicons
                  accessibilityElementsHidden
                  importantForAccessibility="no"
                  name="settings-outline"
                  size={20}
                  color={theme.black}
                />
                <Text style={[styles.buttonText, styles.buttonTextSecondary]}>
                  {t("settings")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Ionicons
            accessibilityElementsHidden
            importantForAccessibility="no"
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
                accessibilityElementsHidden
                importantForAccessibility="no"
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
              <Ionicons
                accessibilityElementsHidden
                importantForAccessibility="no"
                name="search-outline"
                size={20}
                color={theme.black}
              />
              <Text style={[styles.buttonText, styles.buttonTextSecondary]}>
                {t("createLedgerEmptyDiscover")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="ledger-guard-settings"
              style={[styles.button, styles.buttonSecondary]}
              onPress={() => {
                router.push("/(app)/settings");
              }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t("settings")}
            >
              <Ionicons
                accessibilityElementsHidden
                importantForAccessibility="no"
                name="settings-outline"
                size={20}
                color={theme.black}
              />
              <Text style={[styles.buttonText, styles.buttonTextSecondary]}>
                {t("settings")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (gone) {
    return (
      <View style={styles.container} testID="ledger-guard-gone">
        <View style={styles.content}>
          <Ionicons
            accessibilityElementsHidden
            importantForAccessibility="no"
            name="alert-circle-outline"
            size={64}
            color={theme.black40}
            style={styles.icon}
          />
          <Text style={styles.title}>{t("ledgerGoneTitle")}</Text>
          <Text style={styles.message}>{t("ledgerGoneMessage")}</Text>
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                router.push("/(app)/ledger-selection");
              }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t("createLedgerEmptyDiscover")}
            >
              <Ionicons
                accessibilityElementsHidden
                importantForAccessibility="no"
                name="search-outline"
                size={20}
                color={theme.white}
              />
              <Text style={styles.buttonText}>
                {t("createLedgerEmptyDiscover")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="ledger-guard-settings"
              style={[styles.button, styles.buttonSecondary]}
              onPress={() => {
                router.push("/(app)/settings");
              }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t("settings")}
            >
              <Ionicons
                accessibilityElementsHidden
                importantForAccessibility="no"
                name="settings-outline"
                size={20}
                color={theme.black}
              />
              <Text style={[styles.buttonText, styles.buttonTextSecondary]}>
                {t("settings")}
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

export const LedgerGuard = memo(function LedgerGuard(
  props: LedgerGuardProviderProps,
) {
  const guest = useGuest();
  if (guest) {
    return (
      <LedgerGuardContext.Provider value={{ ledgerId: guest.ledgerId }}>
        {props.children}
      </LedgerGuardContext.Provider>
    );
  }
  return <LedgerGuardProviderComponent {...props} />;
});

export const useLedgerGuard = (): string => {
  const context = useContext(LedgerGuardContext);
  if (context === undefined) {
    throw new Error("useLedgerGuard must be used within a LedgerGuardProvider");
  }
  return context.ledgerId;
};
