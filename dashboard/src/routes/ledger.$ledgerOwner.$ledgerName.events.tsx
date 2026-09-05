import { createFileRoute } from "@tanstack/react-router";
import LedgerEventsPage from "@/features/ledger-data/events";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";

export const Route = createFileRoute("/ledger/$ledgerOwner/$ledgerName/events")(
  {
    component: LedgerEventsPage,
    head: ({ params, match }) =>
      createHeadMeta(
        match.context.localization.i18n,
        getSEOMetadata(
          match.context.localization.i18n,
          "seo.ledgerEvents.title",
          "seo.ledgerEvents.description",
          { ledgerName: params.ledgerName },
        ),
      ),
  },
);
