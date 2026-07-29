import { createFileRoute } from "@tanstack/react-router";
import LedgerSettingsPage from "@/features/ledger-data/settings";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";

export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/settings",
)({
  component: LedgerSettingsPage,
  head: ({ params }) =>
    createHeadMeta(
      getSEOMetadata(
        "seo.ledgerSettings.title",
        "seo.ledgerSettings.description",
        { ledgerName: params.ledgerName },
      ),
    ),
});
