// Guards the one list every ledger write now depends on, and the Apollo
// behavior the whole design rests on: that evicting a root field inside
// `refetchQueries({ updateCache })` re-runs the watched queries reading it.
//
// The failure mode here is silent — a field dropped from a scope, or an Apollo
// upgrade that stops refetching on eviction, degrades to "that screen quietly
// shows pre-write data". Nothing throws, nothing logs.
//
// Relative requires: the jest-lite runner has no `@/` alias for value imports.

const LEDGER_ERRORS_QUERY = `
  query getLedgerErrors($ledgerId: String!) {
    getLedgerErrors(ledgerId: $ledgerId) {
      filename
      lineno
      message
    }
  }
`;

/**
 * A real ApolloClient over a link that stamps each response with its own call
 * count, so "did this actually refetch" is a value check rather than a spy.
 */
function makeClient() {
  const {
    ApolloClient,
    InMemoryCache,
    ApolloLink,
    Observable,
    gql,
  } = require("@apollo/client");

  const state = { calls: 0 };
  const link = new ApolloLink(
    () =>
      new Observable(
        (observer: { next: (v: unknown) => void; complete: () => void }) => {
          state.calls += 1;
          observer.next({
            data: {
              getLedgerErrors: [
                {
                  __typename: "LedgerError",
                  filename: "main.bean",
                  lineno: state.calls,
                  message: "m",
                },
              ],
            },
          });
          observer.complete();
        },
      ),
  );

  return {
    client: new ApolloClient({ link, cache: new InMemoryCache() }),
    query: gql(LEDGER_ERRORS_QUERY),
    state,
  };
}

/** The link resolves synchronously; give the refetch a turn to land. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

/**
 * Seed one ROOT_QUERY entry per field in the widest scope, invalidate at
 * `scope`, and report which fields survived. Seeding through `cache.restore`
 * rather than real queries keeps this about the field sweep itself.
 */
async function sweep(scope: string): Promise<string[]> {
  const {
    invalidateLedgerData,
    LEDGER_SCOPE_FIELDS,
  } = require("../invalidate-ledger");
  const { client } = makeClient();

  const root: Record<string, unknown> = { __typename: "Query" };
  for (const field of LEDGER_SCOPE_FIELDS.file) {
    root[`${field}({"ledgerId":"L"})`] = ["seeded"];
  }
  client.cache.restore({ ROOT_QUERY: root });

  await invalidateLedgerData(client, scope);

  const after = Object.keys(client.cache.extract().ROOT_QUERY ?? {});
  return LEDGER_SCOPE_FIELDS.file.filter((field: string) =>
    after.some((key: string) => key.split("(")[0] === field),
  );
}

/** `lineno` carries the network call that produced the row. */
function linenoOf(result: {
  data?: { getLedgerErrors?: { lineno: number }[] };
}): number | null {
  return result?.data?.getLedgerErrors?.[0]?.lineno ?? null;
}

describe("invalidate-ledger", () => {
  describe("scope table", () => {
    it("nests errors inside entries inside file", () => {
      const { LEDGER_SCOPE_FIELDS } = require("../invalidate-ledger");
      const { errors, entries, file } = LEDGER_SCOPE_FIELDS;

      expect(
        errors.filter((field: string) => !entries.includes(field)),
      ).toEqual([]);
      expect(entries.filter((field: string) => !file.includes(field))).toEqual(
        [],
      );
    });

    it("keeps the scopes distinct", () => {
      const { LEDGER_SCOPE_FIELDS } = require("../invalidate-ledger");

      // A table collapsed to one shared list would still pass the superset
      // check above — this is what catches it.
      expect(LEDGER_SCOPE_FIELDS.errors.length).toBe(1);
      expect(LEDGER_SCOPE_FIELDS.entries.length > 1).toBe(true);
      expect(
        LEDGER_SCOPE_FIELDS.file.length > LEDGER_SCOPE_FIELDS.entries.length,
      ).toBe(true);
    });

    it("covers the queries a transaction write changes", () => {
      const { LEDGER_SCOPE_FIELDS } = require("../invalidate-ledger");

      // Each of these was missing from at least one of the four hand-written
      // refetch arrays this module replaced.
      const required = [
        "getLedgerJournal",
        "getLedgerBalanceSheet",
        "getLedgerTrialBalance",
        "getLedgerAccountReport",
        "getLedgerAccountJournal",
        "getLedgerIncomeStatement",
        "getLedgerIntervalTotals",
        "ledgerMeta",
        "getLedgerErrors",
        "listCommits",
        "queryShell",
      ];

      expect(
        required.filter(
          (field) => !LEDGER_SCOPE_FIELDS.entries.includes(field),
        ),
      ).toEqual([]);
    });

    it("covers what only a whole-file write changes", () => {
      const { LEDGER_SCOPE_FIELDS } = require("../invalidate-ledger");

      // getLedgerDirContent carries the sha the browser hands back to
      // deleteLedgerFile as an optimistic lock — stale here means a conflict.
      const required = [
        "getLedgerDirContent",
        "getLedgerNarrations",
        "getLedgerPayees",
        "getLedgerPayeeAccounts",
      ];

      expect(
        required.filter((field) => !LEDGER_SCOPE_FIELDS.file.includes(field)),
      ).toEqual([]);
    });

    it("excludes queries that must not be invalidated on a write", () => {
      const { LEDGER_SCOPE_FIELDS } = require("../invalidate-ledger");
      const { file } = LEDGER_SCOPE_FIELDS;

      // homeCharts: no active consumer, so it was a silent no-op in two
      // screens' refetch lists. getLedgerEntryContext: evicting it after a
      // delete sends the still-mounted detail screen after a dead entry.
      // suggestTransactionCategories: an LLM call. getFeed: not ledger data.
      expect(file.includes("homeCharts")).toBe(false);
      expect(file.includes("getLedgerEntryContext")).toBe(false);
      expect(file.includes("suggestTransactionCategories")).toBe(false);
      expect(file.includes("getFeed")).toBe(false);
    });
  });

  describe("invalidateLedgerData", () => {
    // The load-bearing assumption. If an Apollo upgrade stops refetching on
    // eviction, every screen silently goes stale and nothing else here fails.
    for (const fetchPolicy of [
      "cache-first",
      "cache-and-network",
      "network-only",
    ]) {
      it(`refetches an active ${fetchPolicy} query exactly once`, async () => {
        const { invalidateLedgerData } = require("../invalidate-ledger");
        const { client, query, state } = makeClient();

        const observable = client.watchQuery({
          query,
          variables: { ledgerId: "L" },
          fetchPolicy,
        });
        await new Promise((resolve) => {
          observable.subscribe({ next: () => resolve(null) });
        });
        const callsBefore = state.calls;

        await invalidateLedgerData(client, "errors");
        await settle();

        expect(state.calls - callsBefore).toBe(1);
        // Not just "a request happened" — the screen is holding the new row.
        expect(linenoOf(observable.getCurrentResult())).toBe(callsBefore + 1);
      });
    }

    it("clears variable sets no query is watching", async () => {
      const { invalidateLedgerData } = require("../invalidate-ledger");
      const { client, query, state } = makeClient();

      // The /budget page's interval totals while the page is closed: cached
      // under variables nothing observes, read back `cache-first`.
      const read = () =>
        client.query({
          query,
          variables: { ledgerId: "UNWATCHED" },
          fetchPolicy: "cache-first",
        });

      await read();
      const callsAfterSeed = state.calls;
      await read();
      // Proves it was genuinely cached, so the assertion below means something.
      expect(state.calls).toBe(callsAfterSeed);

      await invalidateLedgerData(client, "errors");
      await read();

      expect(state.calls).toBe(callsAfterSeed + 1);
    });

    it("evicts the whole scope, not just the first field", async () => {
      const { LEDGER_SCOPE_FIELDS } = require("../invalidate-ledger");

      const survivorsAfter = await sweep("file");

      expect(survivorsAfter).toEqual([]);
      // Guards against the seed silently doing nothing.
      expect(LEDGER_SCOPE_FIELDS.file.length > 10).toBe(true);
    });

    it("stops at the scope boundary", async () => {
      const { LEDGER_SCOPE_FIELDS } = require("../invalidate-ledger");

      const survivorsAfter = await sweep("entries");

      // A whole-file write clears the browser listing and the autocomplete
      // caches; a single-directive write must leave them alone.
      const fileOnly = LEDGER_SCOPE_FIELDS.file.filter(
        (field: string) => !LEDGER_SCOPE_FIELDS.entries.includes(field),
      );
      expect(survivorsAfter).toEqual(fileOnly);
    });

    it("never rejects when the refetch fails", async () => {
      const { invalidateLedgerData } = require("../invalidate-ledger");
      const original = console.warn;
      console.warn = () => {};
      try {
        // No `refetchQueries` at all — the harshest shape of "Apollo blew up".
        const broken = {
          refetchQueries: () => Promise.reject(new Error("network down")),
        };
        let threw = false;
        try {
          await invalidateLedgerData(broken, "entries");
        } catch {
          threw = true;
        }
        // The write already committed; surfacing this would invite a retry
        // that duplicates it.
        expect(threw).toBe(false);
      } finally {
        console.warn = original;
      }
    });

    it("bumps the revision var so one-off query readers re-run", async () => {
      const {
        invalidateLedgerData,
        ledgerRevisionVar,
      } = require("../invalidate-ledger");
      const { client } = makeClient();
      const before = ledgerRevisionVar();

      await invalidateLedgerData(client, "entries");

      expect(ledgerRevisionVar()).toBe(before + 1);
    });

    it("bumps the revision var even when the refetch fails", async () => {
      const {
        invalidateLedgerData,
        ledgerRevisionVar,
      } = require("../invalidate-ledger");
      const original = console.warn;
      console.warn = () => {};
      try {
        const before = ledgerRevisionVar();
        await invalidateLedgerData(
          { refetchQueries: () => Promise.reject(new Error("down")) },
          "entries",
        );
        // The cache is cold either way, so a reader that skipped the bump
        // would sit on evicted data with nothing to re-trigger it.
        expect(ledgerRevisionVar()).toBe(before + 1);
      } finally {
        console.warn = original;
      }
    });
  });
});
