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
import { i18n, setLocale } from "@/translations";
import { applyLayoutDirection } from "@/common/rtl";
import { reloadApp } from "@/common/reload-app";
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
          setLocale(locale);
        }

        // Layout direction, before anything draws. `loadLocale()` returns null
        // when nothing is persisted, in which case `i18n.locale` already holds
        // the device-derived choice from `src/translations/index.ts` — so a
        // Persian device flips on its very first launch, not only after the
        // user visits Settings.
        //
        // `forceRTL` is read by the native side at startup, so when the flag
        // moves the only honest thing to do is start over. Return before the
        // ledger query and before `setAppIsReady`: a reload must not wait on
        // the network, and the user must never see a frame laid out the wrong
        // way. On the common launch the flag already agrees and this costs a
        // comparison.
        if (applyLayoutDirection(locale ?? i18n.locale)) {
          await reloadApp();
          return;
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
      }
      // Deliberately not in a `finally`: the restart path above returns early,
      // and must not hand the splash over to a tree laid out the wrong way for
      // however long the reload takes to arrive. Every other path, thrown or
      // not, falls through to here.
      setAppIsReady(true);
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
