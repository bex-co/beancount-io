import fs from "fs";
import path from "path";

// w21/779: in the amount column (60% of the row) a sale's basis line, "cost
// $200.00 · 2026-10-01 · price $250.00", left the account "Asset…guard".
// Source check (the row needs the native runtime).
const row = fs
  .readFileSync(path.join(__dirname, "..", "posting-row.tsx"), "utf8")
  .replace(/\s+/g, "");

describe("a posting's cost and price line", () => {
  it("is not in the amount column", () => {
    const start = row.indexOf("constamount=(");
    const amount = row.slice(start, row.indexOf(");", start));
    expect(start === -1).toBe(false);
    expect(amount.includes("basis")).toBe(false);
  });

  it("has its own line under the account and the amount", () => {
    const line = row.indexOf(
      "<Viewstyle={[styles.line,stacked&&styles.rowStacked]}>",
    );
    const basis = row.indexOf("{basis?(<Textstyle={[styles.basis,");
    const end = row.lastIndexOf("</TouchableOpacity>");
    expect([line === -1, basis === -1]).toEqual([false, false]);
    // After the line that holds the account, amount and chevron closes.
    expect(row.slice(line, basis).endsWith(")}</View>")).toBe(true);
    expect(basis < end).toBe(true);
  });

  it("is still read out with the posting", () => {
    expect(row.includes('${basis?`,${basis}`:""}')).toBe(true);
  });
});
