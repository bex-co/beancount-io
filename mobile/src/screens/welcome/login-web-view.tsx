import { Dimensions, View, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";
import { useState } from "react";
import { analytics } from "@/common/analytics";
import { getEndpoint, headers } from "@/common/request";
import { ProgressBar } from "@/common/progress-bar";
import { statusBarHeight } from "@/common/screen-util";
import { router } from "expo-router";
import { sessionVar, ledgerVar } from "@/common/vars";
import { createSession } from "@/common/session-utils";
import { appendPreferenceParam } from "@/common/url-utils";
import { ColorTheme } from "@/types/theme-props";
import { useThemeStyle } from "@/common/hooks/use-theme-style";
import { apolloClient } from "@/common/apollo/client";
import { ListLedgersDocument } from "@/generated-graphql/graphql";

const { height } = Dimensions.get("window");

type Props = {
  isSignUp: boolean;
  onClose: () => void;
};

const getStyles = (theme: ColorTheme) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      flexDirection: "column",
    },
    webView: {
      alignSelf: "stretch",
      marginTop: 0,
      height: height - statusBarHeight,
      backgroundColor: theme.white,
    },
  });
};

export const LoginWebView = ({ isSignUp, onClose }: Props) => {
  const [progress, setProgress] = useState(0);
  const styles = useThemeStyle(getStyles);
  const uri = isSignUp ? getEndpoint("sign-up") : getEndpoint("login");

  const injectedJavascript = `(function() {
    window.postMessage = function(data) {
      window.ReactNativeWebView.postMessage(data);
    };
  })()`;

  return (
    <View style={styles.container}>
      <ProgressBar progress={progress} />
      <WebView
        injectedJavaScript={injectedJavascript}
        source={{
          uri: appendPreferenceParam(uri),
          headers,
        }}
        style={styles.webView}
        onLoadProgress={({ nativeEvent }) => {
          setProgress(nativeEvent.progress);
        }}
        onMessage={async (event) => {
          try {
            const msg = decodeURIComponent(
              decodeURIComponent(event.nativeEvent.data),
            );
            const msgObj = JSON.parse(msg);
            if (msgObj.authToken) {
              const session = createSession(msgObj.authToken);
              analytics.identify(session.userId);
              analytics.track(isSignUp ? "signed_up" : "logged_in", {});
              sessionVar(session);

              // Query ledger list and set default ledger
              try {
                const { data } = await apolloClient.query({
                  query: ListLedgersDocument,
                  fetchPolicy: "network-only",
                });
                const ledgers = data?.listLedgers || [];
                const currentLedger = ledgerVar();
                if (ledgers.length > 0) {
                  if (
                    !currentLedger ||
                    ledgers.every((l: { id: string }) => l.id !== currentLedger)
                  ) {
                    ledgerVar(ledgers[0].id);
                  }
                } else {
                  ledgerVar(null);
                }
              } catch (e) {
                console.error(`failed to query ledger list: ${e}`);
              }

              onClose();
              router.push("/(app)/(tabs)");
            }
          } catch (e) {
            console.error(`failed to decode jwt: ${e}`);
          }
        }}
      />
    </View>
  );
};
