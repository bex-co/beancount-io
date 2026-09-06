import { LedgerSelectionScreen } from "@/screens/ledger-selection";
import { useTranslations } from "@/common/hooks/use-translations";
import { Stack } from "expo-router";

export default function LedgerSelection() {
  const { t } = useTranslations();
  return (
    <>
      <Stack.Screen options={{ title: t("discoveryTitle") }} />
      <LedgerSelectionScreen />
    </>
  );
}
