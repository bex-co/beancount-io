import { useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View, TouchableOpacity } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { analytics } from "@/common/analytics";
import { headers, getEndpoint } from "@/common/request";
import { ProgressBar } from "./progress-bar";
import { ColorTheme } from "@/types/theme-props";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSession } from "@/common/hooks/use-session";
import { useThemeStyle, usePageView } from "@/common/hooks";
import { useTranslations } from "@/common/hooks/use-translations";
import { useTheme } from "@/common/theme";
import { appendPreferenceParam } from "@/common/url-utils";
import { DashboardWebView } from "@/components/dashboard-webview";
import { LedgerDrawerHeader } from "@/components/ledger-drawer";
import { LedgerGuard, useLedgerGuard } from "@/components/ledger-guard";

const getStyles = (theme: ColorTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.white,
      flexDirection: "column",
    },
    refreshButton: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: theme.primary,
      position: "absolute",
      bottom: 24,
      right: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    webViewContainer: {
      flex: 1,
    },
  });
const LedgerScreenImpl = () => {
  const styles = useThemeStyle(getStyles);
  const theme = useTheme().colorTheme;
  const [progress, setProgress] = useState(0);
  const [key, setKey] = useState(0);
  usePageView("ledger");
  const { t } = useTranslations();
  const ledgerId = useLedgerGuard();
  const onRefresh = async () => {
    await analytics.track("tap_refresh", {});
    setKey((key) => key + 1);
  };
  const { authToken } = useSession();
  const { fileUrl } = useLocalSearchParams<{ fileUrl?: string }>();
  const uri = useMemo(() => {
    const base = fileUrl
      ? fileUrl
      : getEndpoint(`ledger/editor/?ledgerId=${ledgerId}`);
    return appendPreferenceParam(base);
  }, [ledgerId, fileUrl]);
  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      <LedgerDrawerHeader title={t("ledger")} />
      <ProgressBar progress={progress} />
      <View style={styles.webViewContainer}>
        <DashboardWebView
          key={`${uri}-${key}`}
          scrollEnabled={false}
          onLoadProgress={({ nativeEvent }) =>
            setProgress(nativeEvent.progress)
          }
          source={{
            uri,
            headers: { Authorization: `Bearer ${authToken}`, ...headers },
          }}
        />
        <TouchableOpacity
          activeOpacity={0.6}
          style={styles.refreshButton}
          onPress={onRefresh}
        >
          <Ionicons name="refresh" size={24} color={theme.white} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export const LedgerScreen = () => {
  return (
    <LedgerGuard>
      <LedgerScreenImpl />
    </LedgerGuard>
  );
};
