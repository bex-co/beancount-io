import type { ApolloClient } from "@apollo/client";
import {
  GetLedgerDocument,
  GetLedgerFileDocument,
} from "@/graphql/definitions";
import {
  decodeLedgerReadme,
  type InitialLedgerReadme,
} from "@/common/lib/ledger-readme";

// Public-fixture reads at 400 ms fit comfortably; a slow file cannot
// add an unbounded wait to the initial document. Private/client loads stay deferred.
export const PUBLIC_README_DEADLINE_MS = 1000;

export async function loadPublicReadme(
  client: ApolloClient,
  ledgerId: string,
  signal: AbortSignal,
): Promise<InitialLedgerReadme | undefined> {
  // The parent loader owns access errors. Reuse its request/cache, because
  // parent and child loaders run concurrently and may not have settled yet.
  const ledger = await client
    .query({ query: GetLedgerDocument, variables: { ledgerId } })
    .catch(() => undefined);
  if (ledger?.data?.getLedger?.private !== false || signal.aborted) {
    return undefined;
  }

  const path = "README.md";
  const unavailable: InitialLedgerReadme = {
    ledgerId,
    path,
    status: "unavailable",
    content: null,
  };
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout>;
  let onAbort: () => void;
  const deadline = new Promise<InitialLedgerReadme>((resolve) => {
    onAbort = () => {
      controller.abort();
      resolve(unavailable);
    };
    timer = setTimeout(onAbort, PUBLIC_README_DEADLINE_MS);
    signal.addEventListener("abort", onAbort, { once: true });
  });

  try {
    const read = client
      .query({
        query: GetLedgerFileDocument,
        variables: { ledgerId, path },
        // Late responses must not race the single router cache snapshot, even
        // if an upstream link ignores cancellation. Only the winner writes it.
        fetchPolicy: "no-cache",
        context: {
          queryDeduplication: false,
          fetchOptions: { signal: controller.signal },
        },
      })
      .then((result): InitialLedgerReadme => {
        if (controller.signal.aborted || !result.data) return unavailable;
        client.cache.writeQuery({
          query: GetLedgerFileDocument,
          variables: { ledgerId, path },
          data: result.data,
        });
        return {
          ledgerId,
          path,
          status: "ready",
          content: decodeLedgerReadme(result.data.getLedgerFile?.content),
        };
      })
      .catch(() => unavailable);
    return await Promise.race([read, deadline]);
  } finally {
    clearTimeout(timer!);
    signal.removeEventListener("abort", onAbort!);
  }
}
