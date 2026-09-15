import { createFileRoute } from "@tanstack/react-router";
import LedgerBudgetPage from "@/features/ledger-data/budget";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";

export const Route = createFileRoute("/ledger/$ledgerOwner/$ledgerName/budget")(
  {
    component: LedgerBudgetPage,
    head: ({ params, match }) =>
      createHeadMeta(
        match.context.localization.i18n,
        getSEOMetadata(
          match.context.localization.i18n,
          "seo.ledgerBudget.title",
          "seo.ledgerBudget.description",
          { ledgerName: params.ledgerName },
        ),
      ),
  },
);
