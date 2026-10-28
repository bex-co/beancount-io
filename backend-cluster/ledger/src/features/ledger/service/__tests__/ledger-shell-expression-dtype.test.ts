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
