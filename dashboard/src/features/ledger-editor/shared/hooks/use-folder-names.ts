import { useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { useQueryRetry } from "@/common/hooks/use-query-retry";
import { GetLedgerDirContentDocument } from "@/graphql/definitions";

/**
 * The names already in the folder a form writes into, for its clash check.
 * `names` is null until a listing arrives: a failed read is not an empty
 * folder, so callers hold any write the check depends on and offer `retry`,
 * which re-runs only this read in place (w4/1036). A named folder that does
 * not exist yet answers NOT_FOUND (w23/014); it holds no names, so creating
 * into it stays possible.
 */
export function useFolderNames(ledgerId: string, dirPath: string) {
  const { data, error, refetch } = useQuery(GetLedgerDirContentDocument, {
    variables: { ledgerId, dirPath: dirPath || null },
    skip: !ledgerId,
  });
  const missingFolder =
    Boolean(dirPath) &&
    CombinedGraphQLErrors.is(error) &&
    error.errors.some((item) => item.extensions?.code === "NOT_FOUND");
  const names = useMemo(() => {
    if (data) {
      return data.getLedgerDirContent
        .map((entry) => entry.name)
        .filter((name): name is string => Boolean(name));
    }
    return missingFolder ? [] : null;
  }, [data, missingFolder]);
  const { failure, retrying, retry } = useQueryRetry(
    names === null ? error : undefined,
    refetch,
  );
  return { names, failure, retrying, retry };
}
