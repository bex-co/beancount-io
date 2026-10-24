import fs from "fs";
import path from "path";

// w21/904: a write made while a refresh was in flight showed pre-write data,
// because the post-write refetch was folded into the older request.
//
// Relative requires: the jest-lite runner has no `@/` alias for value imports.

const QUERY = `
  query getRows($ledgerId: String!) {
    getLedgerErrors(ledgerId: $ledgerId) {
      filename
      lineno
      message
    }
  }
`;

/** A client over a server that answers 100 ms later with the rows as they stood on arrival. */
function makeClient(deduplicate: boolean) {
  const {
    ApolloClient,
    InMemoryCache,
    ApolloLink,
    Observable,
    gql,
  } = require("@apollo/client");
  const state = { rows: ["Coffee", "DELME"], requests: 0 };
  const link = new ApolloLink(
    () =>
      new Observable(
        (observer: { next: (v: unknown) => void; complete: () => void }) => {
          state.requests += 1;
          const seen = [...state.rows];
          setTimeout(() => {
            observer.next({
              data: {
                getLedgerErrors: seen.map((message) => ({
                  __typename: "LedgerError",
                  filename: "main.bean",
                  lineno: 1,
                  message,
                })),
              },
            });
            observer.complete();
          }, 100);
        },
      ),
  );
  return {
    client: new ApolloClient({
      link,
      cache: new InMemoryCache(),
      queryDeduplication: deduplicate,
    }),
    query: gql(QUERY),
    state,
  };
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("a write while a refresh is in flight", () => {
  it("is read back by the invalidation, not folded into the older request", async () => {
    const { invalidateLedgerData } = require("../invalidate-ledger");
    const { client, query, state } = makeClient(true);
    const rows: string[][] = [];
    const watch = client.watchQuery({
      query,
      variables: { ledgerId: "L" },
      fetchPolicy: "network-only",
    });
    watch.subscribe(
      (result: { data?: { getLedgerErrors: { message: string }[] } }) => {
        if (result.data)
          rows.push(result.data.getLedgerErrors.map((row) => row.message));
      },
    );
    await wait(150);
    // A refresh (the tab focus, the return from background) is on its way
    // when the delete commits.
    watch.refetch().catch(() => undefined);
    await wait(10);
    state.rows = ["Coffee"];
    await invalidateLedgerData(client, "file");
    await wait(300);
    expect(state.requests >= 3).toBe(true);
    expect(rows[rows.length - 1]).toEqual(["Coffee"]);
  });

  // w21/975: switching deduplication off for the whole client sent a request
  // for every co-mounted hook of one query.
  it("leaves the app's client deduplicating, and skips it only for the read-back", () => {
    const read = (file: string) =>
      fs.readFileSync(path.join(__dirname, file), "utf8").replace(/\s+/g, "");
    expect(read("../client.ts").includes("queryDeduplication")).toBe(false);
    expect(
      read("../invalidate-ledger.ts").includes(
        "queryDeduplication:false,},},NetworkStatus.refetch,)",
      ),
    ).toBe(true);
  });

  it("sends one request for five identical watchers", async () => {
    const { client, query, state } = makeClient(true);
    const watches = Array.from({ length: 5 }, () =>
      client.watchQuery({
        query,
        variables: { ledgerId: "L" },
        fetchPolicy: "cache-and-network",
      }),
    );
    for (const watch of watches) watch.subscribe(() => undefined);
    await wait(250);
    expect(state.requests).toBe(1);
  });
});
