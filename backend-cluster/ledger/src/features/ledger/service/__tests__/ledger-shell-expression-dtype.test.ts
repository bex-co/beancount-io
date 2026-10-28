import type { QueryResult } from "@rustledger/wasm";
import { queryResultToShellResult } from "../ledger-shell-mappers";
import { extractSelectAliases } from "../bql-select-aliases";

/**
 * w23/146: expression-typed string dtypes on full input. The engine names
 * a column for its expression, so a string literal or string-function call
 * reports `str` whatever the values look like — value sniffing mistyped
 * `'3000.00'` and `str(number)` as Decimal and `str(date)` as date. An
 * alias hides the expression, so its map root is checked instead.
 */
describe("expression string dtypes on full input", () => {
  function fullResult(columns: string[], rows: string[][]): QueryResult {
    return { columns, rows, errors: [] } as unknown as QueryResult;
  }

  function dtypes(query: string, columns: string[], rows: string[][]): string[] {
    const table = queryResultToShellResult(
      fullResult(columns, rows),
      extractSelectAliases(query),
    ).table!;
    return table.types.map((type) => type.dtype);
  }

  it("reports str for string literals despite decimal/date shapes", () => {
    expect(
      dtypes(
        "SELECT '3000.00', 'abc', '2024-01-15', \"42\" LIMIT 2",
        ["'3000.00'", "'abc'", "'2024-01-15'", '"42"'],
        [
          ["3000.00", "abc", "2024-01-15", "42"],
          ["3000.00", "abc", "2024-01-15", "42"],
        ],
      ),
    ).toEqual(["str", "str", "str", "str"]);
  });

  it("reports str for string-function calls whatever the values look like", () => {
    expect(
      dtypes("SELECT str(number) LIMIT 2", ["str(number)"], [
        ["3000.00"],
        ["-3000.00"],
      ]),
    ).toEqual(["str"]);
    expect(
      dtypes("SELECT upper(str(number)) LIMIT 1", ["upper(str(number))"], [
        ["3000.00"],
      ]),
    ).toEqual(["str"]);
    expect(
      dtypes("SELECT str(date) LIMIT 1", ["str(date)"], [["2024-01-15"]]),
    ).toEqual(["str"]);
    expect(
      dtypes("SELECT STR(number) LIMIT 1", ["STR(number)"], [["3000.00"]]),
    ).toEqual(["str"]);
    expect(
      dtypes("SELECT lower(narration) LIMIT 1", ["lower(narration)"], [
        ["salary"],
      ]),
    ).toEqual(["str"]);
    // Decimal-looking values under a call name still report str — the
    // rule decides, not the sniff.
    expect(
      dtypes("SELECT quarter(date) LIMIT 1", ["quarter(date)"], [["3000.00"]]),
    ).toEqual(["str"]);
  });

  it("reports str for an alias over a string-function call", () => {
    expect(dtypes("SELECT str(number) AS s LIMIT 1", ["s"], [["3000.00"]])).toEqual(
      ["str"],
    );
  });

  it("keeps sniffing bare columns and non-string functions", () => {
    expect(
      dtypes("SELECT number, date, narration LIMIT 1", ["number", "date", "narration"], [
        ["3000.00", "2024-01-15", "Salary"],
      ]),
    ).toEqual(["Decimal", "date", "str"]);
    // date() returns a date; decimal() returns decimals as strings.
    expect(
      dtypes("SELECT date(narration) LIMIT 1", ["date(narration)"], [
        ["2024-01-15"],
      ]),
    ).toEqual(["date"]);
    expect(
      dtypes("SELECT decimal(narration) LIMIT 1", ["decimal(narration)"], [
        ["3000.00"],
      ]),
    ).toEqual(["Decimal"]);
  });

  it("sniffs an alias whose root is not a string function", () => {
    // The alias name matches a function, but the root is a decimal
    // column — the root decides, not the alias.
    expect(
      dtypes("SELECT number AS str LIMIT 1", ["str"], [["3000.00"]]),
    ).toEqual(["Decimal"]);
    // A bare name that shares a function's name has no call paren, so
    // the rule does not fire and the sniff decides.
    expect(dtypes("SELECT currency LIMIT 1", ["currency"], [["USD"]])).toEqual([
      "str",
    ]);
    expect(
      dtypes("SELECT quarter LIMIT 1", ["quarter"], [["3000.00"]]),
    ).toEqual(["Decimal"]);
  });
});

/**
 * w23/164: static expression dtypes on empty and all-NULL input. The engine
 * names a column for its expression, so with no values to sniff, the typer
 * reports the static type — literals, calls, and operators — while bare
 * columns keep the name rule, aliases keep `unknown`, and anything
 * unparseable reports `unknown` instead of a name-based guess.
 */
describe("expression dtypes on empty input", () => {
  function emptyResult(columns: string[], rows: unknown[][]): QueryResult {
    return { columns, rows, errors: [] } as unknown as QueryResult;
  }

  function emptyDtypes(
    query: string,
    columns: string[],
    rows: unknown[][] = [],
  ): string[] {
    const table = queryResultToShellResult(
      emptyResult(columns, rows),
      extractSelectAliases(query),
    ).table!;
    return table.types.map((type) => type.dtype);
  }

  it("types calls, operators, and aggregates statically", () => {
    expect(
      emptyDtypes("SELECT upper(payee), number + 1, year(date) WHERE FALSE", [
        "upper(payee)",
        "number + 1",
        "year(date)",
      ]),
    ).toEqual(["str", "Decimal", "int"]);
    expect(
      emptyDtypes("SELECT count(*), sum(number), min(date), max(payee) WHERE FALSE", [
        "count(*)",
        "sum(number)",
        "min(date)",
        "max(payee)",
      ]),
    ).toEqual(["int", "Decimal", "date", "str"]);
  });

  it("types literals as their unfiltered selves", () => {
    expect(
      emptyDtypes("SELECT 1, 'a', 1.5, TRUE, NULL WHERE FALSE", [
        "1",
        "'a'",
        "1.5",
        "true",
        "NULL",
      ]),
    ).toEqual(["int", "str", "Decimal", "bool", "str"]);
  });

  it("treats all-NULL input like empty input", () => {
    const query = "SELECT upper(payee), number + 1, year(date) LIMIT 3";
    const columns = ["upper(payee)", "number + 1", "year(date)"];
    expect(
      emptyDtypes(query, columns, [
        [null, null, null],
        [null, null, null],
      ]),
    ).toEqual(["str", "Decimal", "int"]);
  });

  it("types the bare window names as int, not Decimal", () => {
    // The engine names window columns as bare words (`row_number`), which
    // the old `endsWith("_number")` guess mistyped as Decimal (it.6157).
    expect(
      emptyDtypes("SELECT row_number() OVER () LIMIT 0", ["row_number"]),
    ).toEqual(["int"]);
    expect(emptyDtypes("SELECT rank() OVER () LIMIT 0", ["rank"])).toEqual([
      "int",
    ]);
    expect(
      emptyDtypes("SELECT dense_rank() OVER () LIMIT 0", ["dense_rank"]),
    ).toEqual(["int"]);
  });

  it("keeps aliases unknown, including over typable expressions", () => {
    expect(
      emptyDtypes("SELECT number + 1 AS n WHERE FALSE", ["n"]),
    ).toEqual(["unknown"]);
    expect(emptyDtypes("SELECT NULL AS x WHERE FALSE", ["x"])).toEqual([
      "unknown",
    ]);
  });

  it("keeps bare stored and derived columns on the name rule", () => {
    expect(
      emptyDtypes(
        "SELECT number, payee, date, cost_number, price_number, count, cost_date, balance, position, tags WHERE FALSE",
        [
          "number",
          "payee",
          "date",
          "cost_number",
          "price_number",
          "count",
          "cost_date",
          "balance",
          "position",
          "tags",
        ],
      ),
    ).toEqual([
      "Decimal",
      "str",
      "date",
      "Decimal",
      "Decimal",
      "int",
      "date",
      "Inventory",
      "Position",
      "set",
    ]);
  });

  it("reports unknown for untypable calls instead of guessing", () => {
    // `cost(position)` has values of Amount shape; `str` was confidently
    // wrong, and the composite outtype is input-dependent.
    expect(
      emptyDtypes("SELECT cost(position) WHERE FALSE", ["cost(position)"]),
    ).toEqual(["unknown"]);
  });

  it("types bool operators as bool", () => {
    expect(
      emptyDtypes("SELECT 1 = 1, 1 IN (1, 2), NOT TRUE WHERE FALSE", [
        "1 = 1",
        "1 IN (1, 2)",
        "NOT true",
      ]),
    ).toEqual(["bool", "bool", "bool"]);
  });
});
