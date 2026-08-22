import type { CellValue, QueryResult } from "@rustledger/wasm";
import { formatCellValue, queryResultToRecords } from "../mappers";

describe("queryResultToRecords", () => {
  it("zips positional rows into column-keyed records", () => {
    const result: QueryResult = {
      columns: ["account", "position"],
      rows: [
        [
          "Assets:Checking",
          { positions: [{ units: { number: "10.00", currency: "USD" } }] },
        ],
        [
          "Income:Salary",
          { positions: [{ units: { number: "-10.00", currency: "USD" } }] },
        ],
      ],
      errors: [],
    };

    const mapped = queryResultToRecords(result);

    expect(mapped.columns).toEqual(["account", "position"]);
    expect(mapped.rows).toHaveLength(2);
    expect(mapped.rows[0]).toEqual({
      account: "Assets:Checking",
      position: {
        positions: [{ units: { number: "10.00", currency: "USD" } }],
      },
    });
    expect(mapped.rows[1].account).toBe("Income:Salary");
    expect(mapped.errors).toEqual([]);
  });

  it("pads missing cells with null and preserves errors", () => {
    const result: QueryResult = {
      columns: ["a", "b", "c"],
      rows: [["x", "y"]],
      errors: [
        {
          message: "boom",
          code: null,
          phase: "query",
          hint: null,
          file: null,
          line: null,
          column: null,
          end_line: null,
          end_column: null,
          severity: "error",
        },
      ],
    };

    const mapped = queryResultToRecords(result);

    expect(mapped.rows[0]).toEqual({ a: "x", b: "y", c: null });
    expect(mapped.errors).toHaveLength(1);
    expect(mapped.errors[0].message).toBe("boom");
  });

  it("handles an empty result set", () => {
    const mapped = queryResultToRecords({ columns: [], rows: [], errors: [] });
    expect(mapped.columns).toEqual([]);
    expect(mapped.rows).toEqual([]);
  });

  it("preserves Object.prototype column aliases as own row fields", () => {
    const mapped = queryResultToRecords({
      columns: ["__proto__", "constructor", "valueOf"],
      rows: [["proto", "ctor", "value"]],
      errors: [],
    });

    expect(Object.keys(mapped.rows[0])).toEqual([
      "__proto__",
      "constructor",
      "valueOf",
    ]);
    expect(mapped.rows[0]["__proto__"]).toBe("proto");
  });
});

describe("formatCellValue", () => {
  const cases: [string, CellValue, string][] = [
    ["null", null, ""],
    ["string", "Assets:Cash", "Assets:Cash"],
    ["number", 42, "42"],
    ["boolean", true, "true"],
    ["amount", { number: "12.50", currency: "USD" }, "12.50 USD"],
    ["units", { units: { number: "3.00", currency: "EUR" } }, "3.00 EUR"],
    [
      "units with cost",
      {
        units: { number: "5", currency: "AAPL" },
        cost: { number: "100.00", currency: "USD" },
      },
      "5 AAPL {100.00 USD}",
    ],
    [
      "positions",
      {
        positions: [
          { units: { number: "1.00", currency: "USD" } },
          { units: { number: "2.00", currency: "EUR" } },
        ],
      },
      "1.00 USD, 2.00 EUR",
    ],
    ["string array", ["tag-a", "tag-b"], "tag-a, tag-b"],
  ];

  it.each(cases)("renders a %s cell", (_label, cell, expected) => {
    expect(formatCellValue(cell)).toBe(expected);
  });

  it("renders a nested object cell", () => {
    const cell: CellValue = {
      units: { number: "1", currency: "USD" },
      extra: "z",
    } as CellValue;
    // Not an amount/units/positions shape guard match for `extra`; falls through
    // to the units arm because `units` is present.
    expect(formatCellValue(cell)).toBe("1 USD");
  });
});
