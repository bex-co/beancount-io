import { createFileRoute } from "@tanstack/react-router";
import LedgerAccountsPage from "@/features/ledger-data/accounts";
import { accountsActionSearchSchema } from "@/common/lib/ledger-action-search";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";

export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/accounts",
)({
  component: LedgerAccountsPage,
  validateSearch: (search) => accountsActionSearchSchema.parse(search),
  head: ({ params, match }) =>
    createHeadMeta(
      match.context.localization.i18n,
      getSEOMetadata(
        match.context.localization.i18n,
        "seo.ledgerAccounts.title",
        "seo.ledgerAccounts.description",
        { ledgerName: params.ledgerName },
      ),
    ),
});
