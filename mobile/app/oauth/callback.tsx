import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { completeOAuthAuthorization } from "@/common/oauth/authorization-completion";
import { OAuthAuthorizationError } from "@/common/oauth/authorization-result";
import { useTranslations } from "@/common/hooks/use-translations";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import type { ColorTheme } from "@/types/theme-props";
import { Button } from "@/components/button";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      justifyContent: "center",
      backgroundColor: theme.white,
      padding: 24,
    },
    card: {
      gap: 16,
    },
    title: {
      color: theme.text01,
      fontSize: 22,
      fontWeight: "700",
      textAlign: "center",
    },
    message: {
      color: theme.black60,
      fontSize: 15,
      lineHeight: 22,
      textAlign: "center",
    },
  });

export default function OAuthCallbackRoute(): JSX.Element {
  const callbackUrl = Linking.useURL();
  const startedFor = useRef<string | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  const styles = useThemeStyle(getStyles);
  const { t } = useTranslations();

  useEffect(() => {
    if (!callbackUrl || startedFor.current === callbackUrl) return;
    startedFor.current = callbackUrl;
    setFailed(false);

    void completeOAuthAuthorization(callbackUrl).catch((error: unknown) => {
      if (error instanceof OAuthAuthorizationError && error.cancelled) {
        router.replace("/auth/welcome");
        return;
      }
      setFailed(true);
    });
  }, [callbackUrl]);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>
          {failed ? t("journalError") : t("signIn")}
        </Text>
        {!failed ? <Text style={styles.message}>{t("loading")}</Text> : null}
        {failed ? (
          <Button
            type="primary"
            onPress={() => router.replace("/auth/welcome")}
          >
            {t("backToSignIn")}
          </Button>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
