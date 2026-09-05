import { createFileRoute } from "@tanstack/react-router";
import LedgerSettingsPage from "@/features/ledger-data/settings";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";

export const Route = createFileRoute(
  "/ledger/$ledgerOwner/$ledgerName/settings",
)({
  component: LedgerSettingsPage,
  head: ({ params, match }) =>
    createHeadMeta(
      match.context.localization.i18n,
      getSEOMetadata(
        match.context.localization.i18n,
        "seo.ledgerSettings.title",
        "seo.ledgerSettings.description",
        { ledgerName: params.ledgerName },
      ),
      { noIndex: true },
    ),
});
