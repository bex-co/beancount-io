import {
  compareQuery,
  judge,
  normalizeCell,
  parseAllowlist,
  type AllowlistEntry,
  type Difference,
  type TableResult,
} from "../bql-oracle-compare";

const col = (name: string, dtype: string) => ({ name, dtype });
const ok = (columns: TableResult["columns"], rows: unknown[][]): TableResult => ({
  columns,
  rows,
});

describe("normalizeCell: representation differences carry no meaning", () => {
  it("reads a stock Amount pair and an engine one-entry map as the same amount", () => {
    expect(normalizeCell("Amount", ["1.15", "USD"])).toBe(
      normalizeCell("Amount", { USD: "1.15" }),
    );
  });

  it("keeps different amounts apart", () => {
    expect(normalizeCell("Amount", ["1.15", "USD"])).not.toBe(
      normalizeCell("Amount", { USD: "1.16" }),
    );
    expect(normalizeCell("Amount", ["1.15", "USD"])).not.toBe(
      normalizeCell("Amount", { EUR: "1.15" }),
    );
  });

  it("reads an inventory as a sorted list, whichever order either side listed it", () => {
    expect(normalizeCell("Inventory", ["5 USD", "2 EUR"])).toBe(
      normalizeCell("Inventory", { EUR: "2", USD: "5" }),
    );
  });

  it("does not hide a cost basis the engine dropped", () => {
    expect(
      normalizeCell("Inventory", ["10 STOCK {50.00 USD, 2026-02-01}"]),
    ).not.toBe(normalizeCell("Inventory", { STOCK: "10" }));
  });

  it("reads a stock set as the double-space-joined string the engine prints", () => {
    expect(normalizeCell("set", ["b", "a"])).toBe(
      normalizeCell("str", "a  b"),
    );
  });

  it("reads a number and its decimal text as one value, but not 1.5 and 1.50", () => {
    expect(normalizeCell("int", 22)).toBe(normalizeCell("Decimal", "22"));
    expect(normalizeCell("Decimal", "1.5")).not.toBe(
      normalizeCell("Decimal", "1.50"),
    );
  });

  it("reads null and undefined alike, and keeps them apart from the empty string", () => {
    expect(normalizeCell("str", null)).toBe(normalizeCell("str", undefined));
    expect(normalizeCell("str", null)).not.toBe(normalizeCell("str", ""));
  });

  it("compares objects by content, not by key order", () => {
    expect(normalizeCell("dict", { a: 1, b: 2 })).toBe(
      normalizeCell("dict", { b: 2, a: 1 }),
    );
  });
});

describe("compareQuery", () => {
  const rows = [["Assets:Cash", "5"]];
  const same = ok([col("account", "str"), col("n", "Decimal")], rows);

  it("finds nothing when the answers agree", () => {
    expect(compareQuery(same, same)).toEqual([]);
  });

  it("treats two refusals as agreement whatever their category or wording", () => {
    expect(
      compareQuery({ error: "parse" }, { error: "Invalid BQL query: nope" }),
    ).toEqual([]);
  });

  it("reports a query the engine refuses and stock answers", () => {
    const found = compareQuery(same, { error: "refused" });
    expect(found.map((d) => d.kind)).toEqual(["outcome"]);
    expect(found[0].detail).toContain("stock 1 row(s)");
    expect(found[0].detail).toContain("engine refused");
  });

  it("reports a query stock refuses and the engine answers", () => {
    const found = compareQuery({ error: "compile" }, same);
    expect(found.map((d) => d.kind)).toEqual(["outcome"]);
    expect(found[0].detail).toContain("stock refused (compile)");
  });

  it("reports a renamed column without also comparing cells", () => {
    const found = compareQuery(
      same,
      ok([col("acct", "str"), col("n", "Decimal")], rows),
    );
    expect(found.map((d) => d.kind)).toEqual(["columns"]);
  });

  it("reports a different column count as columns only", () => {
    const found = compareQuery(same, ok([col("account", "str")], [["x"]]));
    expect(found.map((d) => d.kind)).toEqual(["columns"]);
  });

  it("reports a changed dtype on the column it names", () => {
    const found = compareQuery(
      same,
      ok([col("account", "str"), col("n", "int")], rows),
    );
    expect(found).toEqual([
      {
        kind: "dtype",
        detail: 'column 1 "n": stock Decimal, engine int',
      },
    ]);
  });

  it("reports a different row count and stops there", () => {
    const found = compareQuery(
      same,
      ok(same.columns, [["Assets:Cash", "5"], ["Assets:Bank", "9"]]),
    );
    expect(found.map((d) => d.kind)).toEqual(["row-count"]);
  });

  it("reports the first differing cell with its row and column", () => {
    const found = compareQuery(
      same,
      ok(same.columns, [["Assets:Cash", "6"]]),
    );
    expect(found).toHaveLength(1);
    expect(found[0].kind).toBe("cells");
    expect(found[0].detail).toContain('row 0 column 1 "n"');
    expect(found[0].detail).toContain('stock "5", engine "6"');
  });

  it("reports a dtype change and a cell change together", () => {
    const found = compareQuery(
      ok([col("n", "Decimal")], [["5"]]),
      ok([col("n", "str")], [["6"]]),
    );
    expect(found.map((d) => d.kind)).toEqual(["dtype", "cells"]);
  });

  it("accepts the same amount in both representations", () => {
    expect(
      compareQuery(
        ok([col("price", "Amount")], [[["1.15", "USD"]]]),
        ok([col("price", "Amount")], [[{ USD: "1.15" }]]),
      ),
    ).toEqual([]);
  });
});

describe("parseAllowlist", () => {
  const known = new Set(["a", "b"]);
  const resolves = (reference: string) => reference.startsWith(".pm/");
  const entry = {
    id: "a",
    differences: ["outcome"],
    references: [".pm/w23/done/154.md"],
  };

  it("accepts a well-formed entry", () => {
    expect(parseAllowlist([entry], known, resolves)).toEqual([entry]);
  });

  it.each([
    ["a non-array", {}, /must be a JSON array/],
    ["an entry with no id", [{ ...entry, id: "" }], /missing id/],
    ["a query the oracle lacks", [{ ...entry, id: "zzz" }], /no such query/],
    ["a duplicate id", [entry, entry], /listed twice/],
    ["no references", [{ ...entry, references: [] }], /cite a reference/],
    [
      "a blank reference",
      [{ ...entry, references: ["  "] }],
      /cite a reference/,
    ],
    [
      "a reference that does not resolve",
      [{ ...entry, references: ["nowhere/x.md"] }],
      /does not resolve/,
    ],
    [
      "an empty difference list",
      [{ ...entry, differences: [] }],
      /non-empty subset/,
    ],
    [
      "an unknown difference kind",
      [{ ...entry, differences: ["vibes"] }],
      /non-empty subset/,
    ],
  ])("refuses %s", (_name, raw, message) => {
    expect(() => parseAllowlist(raw, known, resolves)).toThrow(message);
  });

  it("names the entry it refuses", () => {
    expect(() =>
      parseAllowlist([{ ...entry, references: [] }], known, resolves),
    ).toThrow(/allowlist entry 0 \(a\)/);
  });
});

describe("judge", () => {
  const allow = (
    id: string,
    differences: AllowlistEntry["differences"],
  ): AllowlistEntry => ({ id, differences, references: [".pm/x.md"] });
  const found = (entries: [string, Difference[]][]) => new Map(entries);
  const outcome: Difference = { kind: "outcome", detail: "x" };
  const cells: Difference = { kind: "cells", detail: "y" };

  it("passes when every difference is excused", () => {
    const verdict = judge(found([["a", [outcome]]]), [allow("a", ["outcome"])]);
    expect(verdict).toEqual({ unexpected: [], stale: [], allowed: 1 });
  });

  it("fails a difference with no entry", () => {
    const verdict = judge(found([["a", [outcome]]]), []);
    expect(verdict.unexpected).toEqual([{ id: "a", differences: [outcome] }]);
  });

  it("does not let an entry for one kind excuse another on the same query", () => {
    const verdict = judge(found([["a", [outcome, cells]]]), [
      allow("a", ["outcome"]),
    ]);
    expect(verdict.unexpected).toEqual([{ id: "a", differences: [cells] }]);
    expect(verdict.allowed).toBe(0);
  });

  it("flags an entry whose difference is gone, so the list cannot rot", () => {
    const verdict = judge(found([["a", []]]), [allow("a", ["outcome"])]);
    expect(verdict.stale).toEqual([{ id: "a", kinds: ["outcome"] }]);
  });

  it("flags only the kinds that went away", () => {
    const verdict = judge(found([["a", [outcome]]]), [
      allow("a", ["outcome", "cells"]),
    ]);
    expect(verdict.stale).toEqual([{ id: "a", kinds: ["cells"] }]);
    expect(verdict.unexpected).toEqual([]);
  });

  it("counts a clean query as neither allowed nor unexpected", () => {
    expect(judge(found([["a", []]]), [])).toEqual({
      unexpected: [],
      stale: [],
      allowed: 0,
    });
  });
});
