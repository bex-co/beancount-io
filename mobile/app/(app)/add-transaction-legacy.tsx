import { LedgerWriteGuard } from "@/components/ledger-write-guard";
import { AddTransactionScreen } from "@/screens/add-transaction-screen";
import { Stack } from "expo-router";
import { i18n } from "@/translations";

/**
 * Parked keypad flow, kept registered but off every UI path.
 *
 * Superseded by `/add-transaction`, which now renders the multi-posting
 * screen. Reachable only via `beancount://add-transaction-legacy`. Its keypad
 * continues to `/add-transaction-next`, which is parked with it.
 */
export default function AddTransactionLegacy() {
  return (
    <LedgerWriteGuard>
      <>
        <Stack.Screen options={{ title: i18n.t("addTransaction") }} />
        <AddTransactionScreen />
      </>
    </LedgerWriteGuard>
  );
}
