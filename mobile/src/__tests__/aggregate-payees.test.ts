import {
  aggregatePayees,
  filterMerchants,
  sortMerchants,
  PAYEE_ROLLUP_BQL,
  type MerchantAggregate,
  type QueryResultTableLike,
} from "../screens/merchants-screen/selectors/aggregate-payees";

const TYPES = [
  { name: "payee", dtype: "str" },
  { name: "transaction_count", dtype: "int" },
  { name: "first_date", dtype: "date" },
  { name: "last_date", dtype: "date" },
];

function table(rows: unknown[][], types = TYPES): QueryResultTableLike {
  return { rows, types };
}

const SAMPLE: MerchantAggregate[] = [
  {
    payee: "Starbucks",
    transactionCount: 12,
    firstDate: "2024-01-01",
    lastDate: "2025-06-01",
  },
  {
    payee: "Amazon",
    transactionCount: 12,
    firstDate: "2023-01-01",
    lastDate: "2025-07-01",
  },
  {
    payee: "Netflix",
    transactionCount: 3,
    firstDate: "2024-03-01",
    lastDate: "2025-05-01",
  },
];

describe("PAYEE_ROLLUP_BQL", () => {
  it("is the fixed aliased rollup statement", () => {
    expect(PAYEE_ROLLUP_BQL.includes("transaction_count")).toBe(true);
    expect(PAYEE_ROLLUP_BQL.includes("GROUP BY payee")).toBe(true);
    expect(PAYEE_ROLLUP_BQL.includes("payee != ''")).toBe(true);
  });
});

describe("aggregatePayees", () => {
  it("maps named columns into typed rollups, count-desc by default", () => {
    const result = aggregatePayees(
      table([
        ["Netflix", 3, "2024-03-01", "2025-05-01"],
        ["Amazon", 12, "2023-01-01", "2025-07-01"],
        ["Starbucks", 5, "2024-01-01", "2025-06-01"],
      ]),
    );
    expect(result.map((row) => row.payee)).toEqual([
      "Amazon",
      "Starbucks",
      "Netflix",
    ]);
    expect(result[0]).toEqual({
      payee: "Amazon",
      transactionCount: 12,
      firstDate: "2023-01-01",
      lastDate: "2025-07-01",
    });
  });

  it("resolves columns by name regardless of order", () => {
    const reordered = [
      { name: "last_date", dtype: "date" },
      { name: "payee", dtype: "str" },
      { name: "first_date", dtype: "date" },
      { name: "transaction_count", dtype: "int" },
    ];
    const result = aggregatePayees(
      table([["2025-07-01", "Amazon", "2023-01-01", 12]], reordered),
    );
    expect(result).toEqual([
      {
        payee: "Amazon",
        transactionCount: 12,
        firstDate: "2023-01-01",
        lastDate: "2025-07-01",
      },
    ]);
  });

  it("returns empty for a null/empty table", () => {
    expect(aggregatePayees(null)).toEqual([]);
    expect(aggregatePayees(undefined)).toEqual([]);
    expect(aggregatePayees({ rows: [], types: TYPES })).toEqual([]);
  });

  it("fails soft when a required column is missing", () => {
    const missingCount = [
      { name: "payee", dtype: "str" },
      { name: "first_date", dtype: "date" },
      { name: "last_date", dtype: "date" },
    ];
    expect(
      aggregatePayees(
        table([["Amazon", "2023-01-01", "2025-07-01"]], missingCount),
      ),
    ).toEqual([]);
  });

  it("skips null/empty payees and unparseable counts", () => {
    const result = aggregatePayees(
      table([
        [null, 5, "2024-01-01", "2025-01-01"],
        ["", 5, "2024-01-01", "2025-01-01"],
        ["Amazon", null, "2024-01-01", "2025-01-01"],
        ["Amazon", "nope", "2024-01-01", "2025-01-01"],
        ["Starbucks", "7", "2024-01-01", "2025-06-01"],
      ]),
    );
    expect(result).toEqual([
      {
        payee: "Starbucks",
        transactionCount: 7,
        firstDate: "2024-01-01",
        lastDate: "2025-06-01",
      },
    ]);
  });

  it("merges duplicate payee rows by summing counts and spanning dates", () => {
    const result = aggregatePayees(
      table([
        ["Amazon", 4, "2024-06-01", "2024-12-01"],
        ["Amazon", 8, "2023-01-01", "2025-07-01"],
      ]),
    );
    expect(result).toEqual([
      {
        payee: "Amazon",
        transactionCount: 12,
        firstDate: "2023-01-01",
        lastDate: "2025-07-01",
      },
    ]);
  });

  it("parses string counts and skips non-numeric dtype surprises", () => {
    const result = aggregatePayees(
      table([
        ["Amazon", "12.9", "2023-01-01", "2025-07-01"],
        ["Netflix", true, "2024-01-01", "2025-01-01"],
        ["Uber", {}, "2024-01-01", "2025-01-01"],
      ]),
    );
    expect(result).toEqual([
      {
        payee: "Amazon",
        transactionCount: 12,
        firstDate: "2023-01-01",
        lastDate: "2025-07-01",
      },
    ]);
  });

  it("treats negative counts as zero rather than crashing", () => {
    const result = aggregatePayees(
      table([["Amazon", -3, "2023-01-01", "2025-07-01"]]),
    );
    expect(result[0]?.transactionCount).toBe(0);
  });

  it("breaks count ties alphabetically", () => {
    const result = aggregatePayees(
      table([
        ["Starbucks", 12, "2024-01-01", "2025-06-01"],
        ["Amazon", 12, "2023-01-01", "2025-07-01"],
      ]),
    );
    expect(result.map((row) => row.payee)).toEqual(["Amazon", "Starbucks"]);
  });
});

describe("filterMerchants", () => {
  it("returns all rows for an empty/whitespace query", () => {
    expect(filterMerchants(SAMPLE, "")).toEqual(SAMPLE);
    expect(filterMerchants(SAMPLE, "   ")).toEqual(SAMPLE);
  });

  it("matches case-insensitively on a substring of the payee", () => {
    expect(filterMerchants(SAMPLE, "net").map((row) => row.payee)).toEqual([
      "Netflix",
    ]);
    expect(filterMerchants(SAMPLE, "AMAZON").map((row) => row.payee)).toEqual([
      "Amazon",
    ]);
  });

  it("returns an empty list when nothing matches", () => {
    expect(filterMerchants(SAMPLE, "zzz")).toEqual([]);
  });
});

describe("sortMerchants", () => {
  it("sorts by count descending with alphabetical tiebreak", () => {
    expect(sortMerchants(SAMPLE, "count").map((row) => row.payee)).toEqual([
      "Amazon",
      "Starbucks",
      "Netflix",
    ]);
  });

  it("sorts alphabetically ascending", () => {
    expect(
      sortMerchants(SAMPLE, "alphabetical").map((row) => row.payee),
    ).toEqual(["Amazon", "Netflix", "Starbucks"]);
  });
});
