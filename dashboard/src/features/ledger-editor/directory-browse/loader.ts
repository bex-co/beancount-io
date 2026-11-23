import {
  isNotFound,
  isRedirect,
  notFound,
  redirect,
} from "@tanstack/react-router";
import { rethrowEntityRouteError } from "@/common/lib/errors/entity-route-error";
import type { RouteLoader } from "@/common/types/route-loader";
import { createLedgerId } from "@/common/lib/utils/encode";
import {
  GetLedgerDirContentDocument,
  GetLedgerFileDocument,
} from "@/graphql/definitions";
import { isMissingDirectory } from "../shared/lib/surviving-directory";

export const directoryLoader: RouteLoader<
  "/ledger/$ledgerOwner/$ledgerName/files/tree/$branch/$",
  { readFailed: boolean }
> = async ({ params, context, location }) => {
  const { ledgerOwner, ledgerName, branch, _splat } = params;
  const ledgerId = createLedgerId(ledgerOwner, ledgerName);
  const dirPath = _splat || null;
  try {
    const { data, error } = await context.client.query({
      query: GetLedgerDirContentDocument,
      variables: { ledgerId, dirPath },
      fetchPolicy: "cache-first",
    });
    if (error) throw error;
    if (!data?.getLedgerDirContent) throw notFound();
    return { readFailed: false };
  } catch (error) {
    try {
      rethrowEntityRouteError(error, location);
    } catch (classified) {
      if (isRedirect(classified)) throw classified;
      // The directory view retries the same query when the lookup was inconclusive.
      if (!isNotFound(classified)) return { readFailed: true };
      if (dirPath && isMissingDirectory(error)) {
        // Both a missing folder and a path to a file can return NOT_FOUND.
        const file = await context.client
          .query({
            query: GetLedgerFileDocument,
            variables: { ledgerId, path: dirPath },
            fetchPolicy: "network-only",
          })
          .catch(() => undefined);
        if (file?.data?.getLedgerFile?.type === "file") {
          throw redirect({
            to: "/ledger/$ledgerOwner/$ledgerName/files/blob/$branch/$",
            params: { ledgerOwner, ledgerName, branch, _splat: dirPath },
            replace: true,
          });
        }
      }
      throw classified;
    }
  }
};
