import { LedgerWriteGuard } from "@/components/ledger-write-guard";
import { ReceiptCaptureScreen } from "@/screens/receipt-capture-screen";

export default function ReceiptCapturePage() {
  return (
    <LedgerWriteGuard>
      <ReceiptCaptureScreen />
    </LedgerWriteGuard>
  );
}
