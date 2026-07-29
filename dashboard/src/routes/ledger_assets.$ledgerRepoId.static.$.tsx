import { createFileRoute, redirect } from "@tanstack/react-router";
import { GetLedgerAssetDownloadUrlDocument } from "@/graphql/definitions";

export const Route = createFileRoute("/ledger_assets/$ledgerRepoId/static/$")({
  beforeLoad: async ({ context, params }) => {
    const ledgerRepoId = Number(params.ledgerRepoId);
    const filename = params._splat ?? "";

    const result = await context.client.query({
      query: GetLedgerAssetDownloadUrlDocument,
      variables: { ledgerRepoId, filename },
      fetchPolicy: "no-cache",
    });

    const downloadUrl = result.data?.getLedgerAssetDownloadUrl.downloadUrl;
    if (!downloadUrl) {
      throw new Error("Failed to resolve asset download URL");
    }

    throw redirect({ href: downloadUrl });
  },
  component: () => null,
});
