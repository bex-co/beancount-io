import type { ApolloClient } from "@apollo/client";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { GetLedgerDirContentDocument } from "@/graphql/definitions";
import { getParentPath } from "./utils";

function isMissingDirectory(error: unknown): boolean {
  return (
    CombinedGraphQLErrors.is(error) &&
    error.errors.some((item) => item.extensions?.code === "NOT_FOUND")
  );
}

/**
 * The nearest directory at or above `dirPath` that still exists. Git drops a
 * folder with its last file, and a named folder that no longer exists
 * answers NOT_FOUND (w23/014), so deleting the last file steps up until a
 * folder answers (w4/1104). Any other failure keeps that folder: its own
 * error view says what went wrong, rather than pretending it is gone.
 */
export async function nearestSurvivingDirectory(
  client: ApolloClient,
  ledgerId: string,
  dirPath: string,
): Promise<string> {
  let dir = dirPath;
  while (dir) {
    let error: unknown;
    try {
      ({ error } = await client.query({
        query: GetLedgerDirContentDocument,
        variables: { ledgerId, dirPath: dir },
        fetchPolicy: "network-only",
      }));
    } catch (thrown) {
      error = thrown;
    }
    if (!isMissingDirectory(error)) return dir;
    dir = getParentPath(dir);
  }
  return "";
}
