import { createFileRoute } from "@tanstack/react-router";
import ReceiptPage from "@/features/receipt/pages/receipt-page";

export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/receipt",
)({
  component: ReceiptPage,
});
