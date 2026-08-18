import * as SplashScreen from "expo-splash-screen";
import { useEffect, memo, useState, useCallback } from "react";
import * as Font from "expo-font";
import { Ionicons } from "@expo/vector-icons";
import { View, StyleSheet } from "react-native";
import { loadLocale } from "@/common/vars/locale";
import { loadLedger, ledgerVar } from "@/common/vars/ledger";
import { loadTheme } from "@/common/vars/theme";
import { loadSession } from "@/common/vars/session";
import { loadAccountUsage } from "@/common/vars/account-usage";
import { i18n } from "@/translations";
import Constants from "expo-constants";
import { apolloClient } from "@/common/apollo/client";
import { GetLedgerDocument } from "@/generated-graphql/graphql";

SplashScreen.preventAutoHideAsync();

// Set the animation options. This is optional.
if (Constants.executionEnvironment === "standalone") {
  SplashScreen.setOptions({
    fade: false,
    duration: 0,
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

const SplashProviderComponent = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Pre-load fonts, make any API calls you need to do here
        await Font.loadAsync(Ionicons.font);
        const [locale, session, ledger] = await Promise.all([
          loadLocale(),
          loadSession(),
          loadLedger(),
          loadTheme(),
          loadAccountUsage(),
        ]);
        if (locale) {
          i18n.locale = locale;
        }
        // Validate ledger if both session and ledger are not null
        if (session && ledger) {
          try {
            await apolloClient.query({
              query: GetLedgerDocument,
              variables: { ledgerId: ledger },
              fetchPolicy: "network-only",
            });
          } catch (e) {
            // If GetLedger query fails, clear the ledgerVar
            console.warn("Failed to validate ledger, clearing ledgerVar:", e);
            ledgerVar(null);
          }
        }
      } catch (e) {
        console.warn(e);
      } finally {
        // Tell the application to render
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  const onLayout = useCallback(() => {
    if (appIsReady) {
      SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  return (
    <View style={styles.container} onLayout={onLayout}>
      {children}
    </View>
  );
};

export const SplashProvider = memo(SplashProviderComponent);

SplashProvider.displayName = "SplashProvider";
