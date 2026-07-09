import { Stack } from "expo-router";
import { useTheme } from "@/common/theme";
import { About } from "./about";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePageView } from "@/common/hooks";
import { useTranslations } from "@/common/hooks/use-translations";
import { LedgerGuard } from "@/components/ledger-guard";

export function SettingScreen(): JSX.Element {
  const theme = useTheme().colorTheme;
  const { t } = useTranslations();
  usePageView("settings");

  return (
    <LedgerGuard>
      <Stack.Screen options={{ title: t("settings") }} />
      <SafeAreaView
        edges={["bottom"]}
        style={{
          backgroundColor: theme.white,
          flex: 1,
        }}
      >
        <About />
      </SafeAreaView>
    </LedgerGuard>
  );
}
