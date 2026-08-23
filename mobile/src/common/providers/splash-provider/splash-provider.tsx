import * as SplashScreen from "expo-splash-screen";
import { useEffect, memo, useState, useCallback } from "react";
import * as Font from "expo-font";
import { Ionicons } from "@expo/vector-icons";
import { View, StyleSheet } from "react-native";
import { loadLocale } from "@/common/vars/locale";
import { loadLedger, ledgerVar } from "@/common/vars/ledger";
import { loadTheme } from "@/common/vars/theme";
import { loadSession, sessionVar } from "@/common/vars/session";
import {
  getServerUrl,
  loadServerUrlOverride,
  serverUrlOverrideVar,
} from "@/common/vars/server-url";
import { loadAccountUsage } from "@/common/vars/account-usage";
import { loadMerchantRecurringOverrides } from "@/common/vars/merchant-recurring-overrides";
import { i18n, setLocale } from "@/translations";
import { applyLayoutDirection } from "@/common/rtl";
import { reloadApp } from "@/common/reload-app";
import Constants from "expo-constants";
import { apolloClient } from "@/common/apollo/client";
import { restoreApolloCache } from "@/common/apollo/cache-persist";
import { clearServerScopedState } from "@/common/server-url-actions";
import { GetLedgerDocument } from "@/generated-graphql/graphql";
import { isApolloError } from "@apollo/client";

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
        // The server determines both endpoint routing and session/cache scope,
        // so it is the one required dependency before all other startup work.
        // Nothing below can mount a query until this provider is ready.
        await loadServerUrlOverride();
        const [, locale, loadedSession, loadedLedger] = await Promise.all([
          Font.loadAsync(Ionicons.font),
          loadLocale(),
          loadSession(),
          loadLedger(),
          loadTheme(),
          loadAccountUsage(),
          loadMerchantRecurringOverrides(),
        ]);
        let session = loadedSession;
        let ledger = loadedLedger;

        // Sessions created before runtime server selection have no origin. They
        // can only be migrated when there is no user override, meaning this
        // build's original server remains in force. A selected custom server
        // instead forces an isolated fresh sign-in.
        if (session && !session.serverUrl && serverUrlOverrideVar() === null) {
          session = { ...session, serverUrl: getServerUrl() };
          sessionVar(session);
        }
        if (session && session.serverUrl !== getServerUrl()) {
          await clearServerScopedState();
          session = null;
          ledger = null;
        }

        // The scoped wrapper restores only a cache created by this exact
        // server. This must happen after the session-origin decision above.
        await restoreApolloCache();
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

        // Validate ledger if both session and ledger are not null.
        // network-only: splash must learn about deleted ledgers when online.
        if (session && ledger) {
          try {
            await apolloClient.query({
              query: GetLedgerDocument,
              variables: { ledgerId: ledger },
              // network-only: confirm the selection still exists when reachable.
              fetchPolicy: "network-only",
            });
          } catch (e) {
            // Offline / transport failure: keep the persisted selection so a
            // cold start can still render cached Home/Accounts/Reports data.
            // Clear only when the server rejects the ledger.
            const err = e instanceof Error ? e : new Error(String(e));
            const networkOnly =
              isApolloError(err) &&
              err.networkError != null &&
              (err.graphQLErrors?.length ?? 0) === 0;
            if (networkOnly) {
              console.warn("Offline at launch; keeping ledger selection:", err);
            } else {
              console.warn(
                "Failed to validate ledger, clearing ledgerVar:",
                err,
              );
              ledgerVar(null);
            }
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
