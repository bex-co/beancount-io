import * as SplashScreen from "expo-splash-screen";
import { useEffect, memo, useState, useCallback, useRef } from "react";
import * as Font from "expo-font";
import { Ionicons } from "@expo/vector-icons";
import { View, StyleSheet, Animated, Image } from "react-native";
import { loadLocale } from "@/common/vars/locale";
import { loadLedger, ledgerVar } from "@/common/vars/ledger";
import { loadTheme } from "@/common/vars/theme";
import { loadSession } from "@/common/vars/session";
import { i18n } from "@/translations";
import { apolloClient } from "@/common/apollo/client";
import { GetLedgerDocument } from "@/generated-graphql/graphql";
import { useTheme } from "@/common/theme";

const LOGO_SIZE = 144;
const FADE_DURATION = 400;

SplashScreen.preventAutoHideAsync();

// Let the native splash fade out; the JS overlay below completes the transition.
SplashScreen.setOptions({
  fade: true,
  duration: 300,
});

const getStyles = (backgroundColor: string) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    splash: {
      ...StyleSheet.absoluteFill,
      backgroundColor,
      alignItems: "center",
      justifyContent: "center",
    },
    logo: {
      width: LOGO_SIZE,
      height: LOGO_SIZE,
    },
  });

const SplashProviderComponent = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { colorTheme: theme } = useTheme();
  const [appIsReady, setAppIsReady] = useState(false);
  const [splashHidden, setSplashHidden] = useState(false);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const hasAnimated = useRef(false);

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
    if (appIsReady && !hasAnimated.current) {
      hasAnimated.current = true;
      SplashScreen.hideAsync();
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: FADE_DURATION,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1.08,
          friction: 6,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setSplashHidden(true);
      });
    }
  }, [appIsReady, fadeAnim, scaleAnim]);

  const styles = getStyles(theme.white);

  if (!appIsReady) {
    // Show the same branded view behind the native splash so there is no
    // blank flash after the OS launch screen disappears.
    return (
      <View style={styles.splash}>
        <Image
          source={require("@/assets/images/logo.png")}
          style={styles.logo}
        />
      </View>
    );
  }

  return (
    <View style={styles.container} onLayout={onLayout}>
      {children}
      {!splashHidden && (
        <Animated.View
          style={[
            styles.splash,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
          pointerEvents="none"
        >
          <Image
            source={require("@/assets/images/logo.png")}
            style={styles.logo}
          />
        </Animated.View>
      )}
    </View>
  );
};

export const SplashProvider = memo(SplashProviderComponent);

SplashProvider.displayName = "SplashProvider";
