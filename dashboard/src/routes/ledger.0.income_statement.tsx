import { createFileRoute, redirect } from "@tanstack/react-router";
import { requireAuth } from "@/common/lib/auth/auth";
import { decodeLedgerId } from "@/common/lib/utils/encode";
import { getUserDefaultLedger } from "@/common/lib/utils/ledger-utils";

const requireLegacyIncomeStatementAuth = requireAuth(
  "/ledger/0/income_statement",
);

export const Route = createFileRoute("/ledger/0/income_statement")({
  beforeLoad: async ({ context, location }) => {
    requireLegacyIncomeStatementAuth({ context, location });
    const defaultLedger = await getUserDefaultLedger(context.client);
    if (!defaultLedger) throw redirect({ to: "/ledger" });

    throw redirect({
      to: "/ledger/$ledgerOwner/$ledgerName",
      params: decodeLedgerId(defaultLedger.id),
    });
  },
});
