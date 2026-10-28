import type { QueryResult } from "@rustledger/wasm";
import { queryResultToText } from "../ledger-shell-mappers";

/**
 * w23/138: text columns size to the wider of header and values, so a
 * header is never cut to the data width. A newline inside a column name
 * flattens to a space (values may span lines; headers stay on one).
 */
describe("text table header widths", () => {
  function textResult(columns: string[], rows: unknown[][]): QueryResult {
    return { columns, rows, errors: [] } as unknown as QueryResult;
  }

  it("keeps the full header over narrower values", () => {
    expect(
      queryResultToText(textResult(["payee", "number"], [["", "3000.00"]])),
    ).toBe("payee  number \n-----  -------\n       3000.00\n");
  });

  it("keeps the full header over a 4-char value", () => {
    expect(
      queryResultToText(textResult(["payee", "number"], [["VISA", "-120.40"]])),
    ).toBe("payee  number \n-----  -------\nVISA   -120.40\n");
  });

  it("flattens a newline inside a column name", () => {
    expect(queryResultToText(textResult(["a\nb"], [["x"]]))).toBe(
      "a b\n---\nx  \n",
    );
  });

  it("keeps a 202-char header over a 200-char value", () => {
    const name = `'${"A".repeat(200)}'`;
    const text = queryResultToText(textResult([name], [["A".repeat(200)]]));
    const [header, separator, row] = text.split("\n");
    expect(header).toBe(name);
    expect(separator).toBe("-".repeat(202));
    expect(row).toBe("A".repeat(200).padEnd(202));
  });

  it("sizes a long date header past the date width", () => {
    const text = queryResultToText(
      textResult(["transaction_date"], [["2024-01-15"]]),
    );
    const [header, separator, row] = text.split("\n");
    expect(header).toBe("transaction_date");
    expect(separator).toBe("-".repeat(16));
    expect(row).toBe("2024-01-15      ");
  });

  it("renders zero rows as the empty string", () => {
    expect(queryResultToText(textResult(["payee"], []))).toBe("");
  });
});
