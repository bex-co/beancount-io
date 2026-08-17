import { describe, expect, it } from "vitest";
import {
  createCSVBlob,
  escapeCSVField,
  neutralizeSpreadsheetFormula,
  rowsToCSV,
} from "../csv";

function readBlob(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () =>
      resolve(reader.result as ArrayBuffer),
    );
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsArrayBuffer(blob);
  });
}

describe("shared CSV serialization", () => {
  it("neutralizes formulas while retaining signed numbers as numeric cells", () => {
    expect(neutralizeSpreadsheetFormula("=2+2")).toBe("'=2+2");
    expect(neutralizeSpreadsheetFormula("  @SUM(A:A)")).toBe("'  @SUM(A:A)");
    expect(neutralizeSpreadsheetFormula("-42.50")).toBe("-42.50");
    expect(neutralizeSpreadsheetFormula("+15")).toBe("+15");
  });

  it("escapes commas, quotes, CR/LF, Unicode, null, and objects", () => {
    expect(escapeCSVField('cash, "bank"\r\n現金')).toBe(
      '"cash, ""bank""\r\n現金"',
    );
    expect(escapeCSVField(null)).toBe("");
    expect(escapeCSVField({ value: 1 })).toBe('"{""value"":1}"');
  });

  it("serializes rows deterministically", () => {
    expect(
      rowsToCSV([
        ["account", "amount"],
        ["Assets:Cash", "1.00"],
      ]),
    ).toBe("account,amount\nAssets:Cash,1.00");
  });

  it("prepends the UTF-8 BOM expected by Excel", async () => {
    const bytes = new Uint8Array(await readBlob(createCSVBlob("現金")));
    expect(Array.from(bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
  });
});
