import type { DirectiveJson } from "@rustledger/wasm";
import {
  AdvancedFilterParseError,
  filterDirectives,
  filterDirectivesAsync,
} from "../directive-filter";
import * as workerPool from "../rustledger-worker-pool";

/**
 * The journal and report filters refuse a pattern too complex to run (see
 * `pattern-complexity.ts`) with the filter's own parse error, which the
 * services answer as a 400, and still apply ordinary regexes.
 */
const txn = (
  date: string,
  account: string,
  payee: string,
  tags: string[] = [],
): DirectiveJson =>
  ({
    type: "transaction",
    date,
    flag: "*",
    payee,
    narration: `${payee} purchase`,
    tags,
    links: [],
    meta: {},
    postings: [
      { account, units: { number: "1", currency: "USD" }, meta: {} },
      {
        account: "Equity:Opening",
        units: { number: "-1", currency: "USD" },
        meta: {},
      },
    ],
  }) as unknown as DirectiveJson;

const ledger = [
  txn("2026-01-01", "Expenses:Food", "Whole Foods", ["groceries"]),
  txn("2026-01-02", "Expenses:Rent", "Landlord"),
  txn("2026-01-03", "Assets:Cash", "ATM"),
  txn("2026-01-04", "Assets:CashApp", "Friend"),
  txn("2026-01-05", "Expenses:Transport", "Metro"),
];
const dates = (opts: { account?: string; filter?: string }) =>
  filterDirectives(ledger, opts).map((directive) => directive.date);

describe("filter patterns", () => {
  it("refuses an account pattern whose repeats overlap", () => {
    for (const account of ["(.|.)*Z", "^(Expenses:)(\\w+)+$", ".*.*.*Z"]) {
      expect(() => filterDirectives(ledger, { account })).toThrow(
        AdvancedFilterParseError,
      );
      expect(() => filterDirectives(ledger, { account })).toThrow(
        /^Filter pattern is too complex: /,
      );
    }
  });

  it("refuses one in the advanced filter's strings and keys", () => {
    for (const filter of [
      '"(a+)+$"',
      'payee:"(\\w+\\s?)+$"',
      'narration:"(.|.)*Z"',
      'tag:"(a|a)*b"',
      'account:"(.*)*Z"',
    ]) {
      expect(() => filterDirectives(ledger, { filter })).toThrow(
        /^Filter pattern is too complex: /,
      );
    }
  });

  it("refuses before searching any text, with nothing to search", () => {
    expect(() => filterDirectives([], { account: "(.|.)*Z" })).toThrow(
      AdvancedFilterParseError,
    );
  });

  it("refuses on the request thread, without a worker task", async () => {
    const pool = jest.spyOn(workerPool, "getRustledgerWorkerPool");
    await expect(
      filterDirectivesAsync(ledger, { account: "(.|.)*Z" }),
    ).rejects.toThrow(AdvancedFilterParseError);
    expect(pool).not.toHaveBeenCalled();
    pool.mockRestore();
  });

  it("names the length limit for a longer pattern", () => {
    expect(() =>
      filterDirectives(ledger, { account: `^${"a".repeat(256)}` }),
    ).toThrow("Filter pattern exceeds 256 characters");
  });

  it("still applies ordinary regex filters", () => {
    expect(dates({ account: "^Expenses:(Food|Rent)" })).toEqual([
      "2026-01-01",
      "2026-01-02",
    ]);
    expect(dates({ account: "Assets:Cash(App)?$" })).toEqual([
      "2026-01-03",
      "2026-01-04",
    ]);
    expect(dates({ account: "Expenses:.*port" })).toEqual(["2026-01-05"]);
    expect(dates({ filter: 'payee:"^Whole\\s+Foods$"' })).toEqual([
      "2026-01-01",
    ]);
    expect(dates({ filter: 'tag:"^groc"' })).toEqual(["2026-01-01"]);
  });
});
