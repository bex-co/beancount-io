import {
  expectParity,
  PYTHON_URL,
  userBasicAuthHeader,
} from "../expect-parity";

/**
 * Bake-off on `book-large` — a full bean-example book (~2k directives, the
 * scale of a real multi-year ledger). Same strict comparison as everywhere
 * else, exercised on the heavy report/journal/BQL paths, plus a latency
 * sanity bound on the v2 side (generous: CI machines vary).
 */
const BIG = "parityuser/book-large";

describe("parity: big-ledger bake-off (bean-example, ~2k directives)", () => {
  jest.setTimeout(120000);

  it("has a realistic directive count", async () => {
    const res = await fetch(
      `${PYTHON_URL}/reports/${BIG}/entries_count_per_type`,
      { headers: { Authorization: userBasicAuthHeader() } },
    );
    const body = (await res.json()) as {
      data: Array<{ type: string; number: number }>;
    };
    const total = body.data.reduce((sum, row) => sum + row.number, 0);
    expect(total).toBeGreaterThan(1000);
  });

  const heavyReads: Array<{
    operation: string;
    path: string;
    query?: Record<string, string>;
  }> = [
    { operation: "getLedgerErrors", path: `/reports/${BIG}/errors` },
    { operation: "getLedgerAttributes", path: `/reports/${BIG}/attributes` },
    { operation: "getLedgerAccounts", path: `/reports/${BIG}/accounts` },
    { operation: "getLedgerCommodities", path: `/reports/${BIG}/commodities` },
    {
      operation: "getLedgerIncomeStatement",
      path: `/reports/${BIG}/income-statement`,
      query: { conversion: "USD" },
    },
    {
      operation: "getLedgerBalanceSheet",
      path: `/reports/${BIG}/balance-sheet`,
      query: { conversion: "USD" },
    },
    {
      operation: "getLedgerTrialBalance",
      path: `/reports/${BIG}/trial-balance`,
    },
    { operation: "getLedgerOverview", path: `/reports/${BIG}/overview` },
    {
      operation: "getLedgerIncomeStatement",
      path: `/reports/${BIG}/income-statement`,
      query: { time: "2023", conversion: "USD" },
    },
    {
      operation: "getJournal",
      path: `/journal/${BIG}`,
      query: { limit: "100" },
    },
    { operation: "plaintextJournal", path: `/journal/${BIG}/plaintext` },
    {
      operation: "getLegacyJournal",
      path: `/legacy/journal/${BIG}`,
      query: { first: "50" },
    },
    {
      operation: "getLedgerEntriesCountPerType",
      path: `/reports/${BIG}/entries_count_per_type`,
    },
  ];

  for (const read of heavyReads) {
    it(`${read.operation} ${read.query ? JSON.stringify(read.query) : ""}`, async () => {
      const started = Date.now();
      const res = await expectParity({
        operation: read.operation,
        path: read.path,
        query: read.query,
      });
      expect(res.status).toBe(200);
      // Generous wall-clock bound covering BOTH services round-tripping the
      // ~2k-directive book — catches pathological regressions, not jitter.
      expect(Date.now() - started).toBeLessThan(30000);
    });
  }

  it("BQL over the full book", async () => {
    const res = await expectParity({
      operation: "queryShell",
      path: `/shell/${BIG}/query`,
      query: {
        query:
          "SELECT account, sum(position) GROUP BY account ORDER BY account",
      },
    });
    expect(res.status).toBe(200);
  });

  it("hierarchy for the assets root", async () => {
    const res = await expectParity({
      operation: "getLedgerHierarchy",
      path: `/reports/${BIG}/hierarchy`,
      query: { account_name: "Assets", conversion: "USD" },
    });
    expect(res.status).toBe(200);
  });
});
