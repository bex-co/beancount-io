import fs from "fs";
import path from "path";
import { isolateAccountPath, isolateLtr, isolateRtlSymbol } from "../bidi";

// w21/095: in Persian, "مانده: -$1,234.50" rendered as `1,234.50$- :مانده`,
// the sign and symbol pulled to the wrong side of the number.
describe("isolateLtr", () => {
  it("wraps an amount in a left-to-right isolate", () => {
    expect(isolateLtr("-$1.00")).toBe("⁦-$1.00⁩");
  });

  it("is used for every amount the account journal puts in a sentence", () => {
    const row = fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "..",
        "screens",
        "account-detail-screen",
        "components",
        "account-entry-row.tsx",
      ),
      "utf8",
    );
    expect(row.includes('`${t("balance")}: ${isolateLtr(balanceText)}`')).toBe(
      true,
    );
    expect(row.includes("amount: isolateLtr(detail.offBy)")).toBe(true);
    expect(row.includes('`${t("balance")} ${isolateLtr(detail.amount)}`')).toBe(
      true,
    );
  });

  // w21/249: two more notes interpolated signed amounts into Persian sentences
  // unwrapped: "-$540.00 به ارزش بازار" laid out as `$540.00- ...`.
  it("is used for the at-market / at-cost note and the not-in-total list", () => {
    const read = (...parts: string[]) =>
      fs
        .readFileSync(path.join(__dirname, "..", "..", ...parts), "utf8")
        .replace(/\s+/g, "");
    expect(
      read("common", "valuation.ts").includes(
        "amount:isolateLtr(formatSignedMoneyWithCurrency(value.amount,currency))",
      ),
    ).toBe(true);
    expect(
      read("common", "balance-display.ts").includes(
        "holdings.map((holding)=>isolateLtr(formatHolding(holding)))",
      ),
    ).toBe(true);
    expect(
      read(
        "screens",
        "reports-screen",
        "selectors",
        "select-ranged-account-tree.ts",
      ).includes("isolateLtr(`${formatHolding(holding)}(${account})`)"),
    ).toBe(true);
  });

  it("keeps each holding in the list its own isolate", () => {
    const list = ["-500 EUR", "20 GBP"].map(isolateLtr).join(", ");
    expect(list).toBe("⁦-500 EUR⁩, ⁦20 GBP⁩");
  });
});

describe("isolateRtlSymbol", () => {
  it("isolates a symbol in Arabic or Hebrew script", () => {
    expect(isolateRtlSymbol("د.ك")).toBe("\u2067د.ك\u2069");
    expect(isolateRtlSymbol("﷼")).toBe("\u2067﷼\u2069");
    expect(isolateRtlSymbol("₪")).toBe("₪");
    expect(isolateRtlSymbol("ש״ח")).toBe("\u2067ש״ח\u2069");
  });

  it("leaves every other symbol, and no symbol, as it is", () => {
    for (const symbol of ["$", "€", "¥", "₹", "CHF", "zł", ""]) {
      expect(isolateRtlSymbol(symbol)).toBe(symbol);
    }
  });
});

// w21/743: "Qa20261020Bank:بانک:ملی" drew the child ملی before its parent, on
// Accounts, in the detail header and in the picker.
describe("isolateAccountPath", () => {
  const LRI = "⁦";
  const FSI = "⁨";
  const PDI = "⁩";

  it("isolates each segment of a right-to-left path, in a left-to-right path", () => {
    expect(isolateAccountPath("Assets:Qa20261020Bank:بانک:ملی")).toBe(
      `${LRI}${FSI}Assets${PDI}:${FSI}Qa20261020Bank${PDI}:${FSI}بانک${PDI}:${FSI}ملی${PDI}${PDI}`,
    );
    // Hebrew too, and a picker's parent path with its trailing separator.
    expect(isolateAccountPath("Assets:בנק:").startsWith(LRI)).toBe(true);
    expect(
      isolateAccountPath("Assets:בנק:").endsWith(`:${FSI}${PDI}${PDI}`),
    ).toBe(true);
  });

  it("keeps the order and text, and leaves a left-to-right path alone", () => {
    const written = "Assets:Qa20261020Bank:بانک:ملی";
    expect(isolateAccountPath(written).replace(/[⁦⁨⁩]/g, "")).toBe(written);
    expect(isolateAccountPath("Assets:Bank:Checking")).toBe(
      "Assets:Bank:Checking",
    );
  });

  it("is what Accounts, the detail header and the picker draw", () => {
    const read = (...parts: string[]) =>
      fs.readFileSync(path.join(__dirname, "..", "..", ...parts), "utf8");
    expect(
      read("components", "account-table", "account-table.tsx").includes(
        ": isolateAccountPath(item.label)",
      ),
    ).toBe(true);
    expect(
      read(
        "screens",
        "account-detail-screen",
        "account-detail-screen.tsx",
      ).includes("{isolateAccountPath(account)}"),
    ).toBe(true);
    expect(
      read(
        "screens",
        "account-picker-screen",
        "account-picker-screen.tsx",
      ).includes("{isolateAccountPath(parent)}"),
    ).toBe(true);
  });
});
