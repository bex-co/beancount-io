import type { QueryResult } from "@rustledger/wasm";
import {
  queryResultToShellResult,
  queryResultToText,
} from "../ledger-shell-mappers";
import { extractSelectAliasInfo } from "../bql-select-aliases";

/**
 * w23/m14/t007: the combinations the per-task pins do not cover. NULL stays
 * null whatever shares its row or column, an empty collection is not a NULL,
 * values decide the dtype whenever any cell has one, and the text table stays
 * in step with the structured rows.
 */
const result = (columns: string[], rows: unknown[][]): QueryResult =>
  ({ columns, rows, errors: [] }) as unknown as QueryResult;

const shell = (query: string, columns: string[], rows: unknown[][]) => {
  const { roots, heads } = extractSelectAliasInfo(query);
  return queryResultToShellResult(result(columns, rows), roots, heads).table!;
};

describe("NULL beside values in one column", () => {
  it.each([
    ["payee", [null, "Café"], "str"],
    ["number", [null, "12.50"], "Decimal"],
    ["date", [null, "2026-01-02"], "date"],
    ["count(*)", [null, 3], "int"],
  ])(
    "%s: the non-NULL cell decides the dtype and null stays null",
    (name, cells, dtype) => {
      const table = shell(
        `SELECT ${name}`,
        [name],
        cells.map((cell) => [cell]),
      );
      expect(table.types[0]?.dtype).toBe(dtype);
      expect(table.rows.map((row) => row[0])).toEqual(cells);
    },
  );

  it("keeps a NULL in every position of a mixed row", () => {
    const table = shell(
      "SELECT payee, number, tags",
      ["payee", "number", "tags"],
      [
        [null, "5.00", ["a"]],
        ["Café", null, null],
      ],
    );
    expect(table.rows).toEqual([
      [null, "5.00", "a"],
      ["Café", null, null],
    ]);
  });
});

describe("all-NULL columns in a non-empty result", () => {
  it("returns null rows with the expression's dtype, not str", () => {
    const table = shell(
      "SELECT sum(number) AS total, year(date) AS y",
      ["total", "y"],
      [
        [null, null],
        [null, null],
      ],
    );
    expect(table.rows).toEqual([
      [null, null],
      [null, null],
    ]);
    expect(table.types.map((type) => type.dtype)).toEqual(["Decimal", "int"]);
  });

  it("keeps a bare-column alias unknown even when every cell is NULL", () => {
    expect(
      shell("SELECT payee AS number", ["number"], [[null]]).types[0]?.dtype,
    ).toBe("unknown");
  });
});

describe("empty collections are not NULL", () => {
  it("reads an empty set as an empty string and a NULL set as null", () => {
    const table = shell("SELECT tags", ["tags"], [[[]], [null], [["b", "a"]]]);
    expect(table.rows.map((row) => row[0])).toEqual(["", null, "a  b"]);
    expect(table.types[0]?.dtype).toBe("set");
  });

  it("reads a zero-net inventory as {} and a NULL inventory as null", () => {
    const inventory = (number: string) => ({
      positions: [{ units: { number, currency: "USD" } }],
    });
    const table = shell(
      "SELECT balance",
      ["balance"],
      [[inventory("0")], [null], [inventory("5.00")]],
    );
    expect(table.rows.map((row) => row[0])).toEqual([
      {},
      null,
      { USD: "5.00" },
    ]);
    expect(table.types[0]?.dtype).toBe("Inventory");
  });

  it("keeps a NULL amount null beside a real one", () => {
    const table = shell(
      "SELECT price",
      ["price"],
      [[null], [{ number: "1.10", currency: "USD" }]],
    );
    expect(table.rows.map((row) => row[0])).toEqual([null, { USD: "1.10" }]);
    expect(table.types[0]?.dtype).toBe("Amount");
  });
});

describe("text and structured agree on NULL", () => {
  it("prints NULL cells blank on the rows the structured result marks null", () => {
    const rows = [
      [null, "5.00"],
      ["Café", null],
    ];
    const text = queryResultToText(result(["payee", "number"], rows))
      .trimEnd()
      .split("\n")
      .slice(2);
    expect(text).toHaveLength(rows.length);
    expect(text[0]).toContain("5.00");
    expect(text[0]).not.toContain("null");
    expect(text[1]).toContain("Café");
    expect(text[1]).not.toContain("null");
    const table = shell("SELECT payee, number", ["payee", "number"], rows);
    expect(table.rows).toEqual(rows);
  });
});
