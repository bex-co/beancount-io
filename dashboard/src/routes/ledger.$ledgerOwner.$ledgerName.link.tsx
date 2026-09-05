import { createFileRoute } from "@tanstack/react-router";
import { PlaidSettingsPage } from "@/features/plaid/pages/plaid-settings";
import { getSEOMetadata, createHeadMeta } from "@/common/lib/seo/seo-helpers";

export const Route = createFileRoute("/ledger/$ledgerOwner/$ledgerName/link")({
  component: PlaidSettingsPage,
  head: ({ params, match }) =>
    createHeadMeta(
      match.context.localization.i18n,
      getSEOMetadata(
        match.context.localization.i18n,
        "seo.plaidSettings.title",
        "seo.plaidSettings.description",
        { ledgerName: params.ledgerName },
      ),
      { noIndex: true },
    ),
});
