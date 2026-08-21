import { createFileRoute } from "@tanstack/react-router";
import ReceiptPage from "@/features/receipt/pages/receipt-page";
import { createNoIndexHead } from "@/common/lib/seo/seo-helpers";

export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/receipt",
)({
  component: ReceiptPage,
  head: createNoIndexHead,
});
