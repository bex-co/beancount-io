import { useTheme } from "@/common/theme";
import { About } from "./about";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePageView } from "@/common/hooks";
import { LedgerGuard } from "@/components/ledger-guard";

export function SettingScreen(): JSX.Element {
  const theme = useTheme().colorTheme;
  usePageView("mine");

  return (
    <LedgerGuard>
      <SafeAreaView
        edges={[]}
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
