import { LedgerWriteGuard } from "@/components/ledger-write-guard";
import { MultiPostingsTransactionScreen } from "@/screens/multi-postings-transaction";
import { Stack } from "expo-router";
import { i18n } from "@/translations";

/**
 * The live add-transaction flow. Home's and Transactions' add buttons and
 * receipt capture open this route, which renders the multi-posting screen.
 * `/add-transaction-legacy` (the keypad) and `/add-transaction-next` are
 * parked.
 */
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
