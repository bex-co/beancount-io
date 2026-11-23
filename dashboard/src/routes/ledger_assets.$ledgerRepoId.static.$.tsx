import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { GetLedgerAssetDownloadUrlDocument } from "@/graphql/definitions";
import { isUnauthenticatedError } from "@/common/apollo/links/auth-error-link";
import { getSafeReturnPath } from "@/common/lib/auth/auth";
import { AttachmentUnavailablePage } from "@/common/root-route/not-found-page";

const UNAVAILABLE_CODES = new Set(["NOT_FOUND", "FORBIDDEN", "BAD_USER_INPUT"]);

export const Route = createFileRoute("/ledger_assets/$ledgerRepoId/static/$")({
  beforeLoad: async ({ context, location, params }) => {
    const ledgerRepoId = Number(params.ledgerRepoId);
    const filename = params._splat ?? "";
    if (!Number.isSafeInteger(ledgerRepoId) || ledgerRepoId <= 0 || !filename) {
      throw notFound();
    }

    let downloadUrl: string | undefined;
    try {
      const result = await context.client.query({
        query: GetLedgerAssetDownloadUrlDocument,
        variables: { ledgerRepoId, filename },
        fetchPolicy: "no-cache",
      });
      downloadUrl = result.data?.getLedgerAssetDownloadUrl.downloadUrl;
    } catch (error) {
      if (isUnauthenticatedError(error)) {
        throw redirect({
          to: "/auth/login",
          search: { next: getSafeReturnPath(location) },
        });
      }
      if (
        CombinedGraphQLErrors.is(error) &&
        error.errors.some((gqlError) =>
          UNAVAILABLE_CODES.has(String(gqlError.extensions?.code)),
        )
      ) {
        throw notFound();
      }
      throw error;
    }
    if (!downloadUrl) throw notFound();

    throw redirect({ href: downloadUrl });
  },
  component: () => null,
  notFoundComponent: AttachmentUnavailablePage,
});
