import { LedgerWriteGuard } from "@/components/ledger-write-guard";
import { MultiPostingsTransactionScreen } from "@/screens/multi-postings-transaction";
import { Stack } from "expo-router";
import { i18n } from "@/translations";

export default function AddTransaction() {
  return (
    <LedgerWriteGuard>
      <>
        <Stack.Screen options={{ title: i18n.t("multiPostingsTitle") }} />
        <MultiPostingsTransactionScreen />
      </>
    </LedgerWriteGuard>
  );
}
