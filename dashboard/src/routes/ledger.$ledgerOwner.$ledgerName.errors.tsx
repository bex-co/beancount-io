import { createFileRoute } from "@tanstack/react-router";
import LedgerErrorsPage from "@/features/ledger-data/errors";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";

export const Route = createFileRoute("/ledger/$ledgerOwner/$ledgerName/errors")(
  {
    component: LedgerErrorsPage,
    head: ({ params }) =>
      createHeadMeta(
        getSEOMetadata(
          "seo.ledgerErrors.title",
          "seo.ledgerErrors.description",
          { ledgerName: params.ledgerName },
        ),
        { noIndex: true },
      ),
  },
);
