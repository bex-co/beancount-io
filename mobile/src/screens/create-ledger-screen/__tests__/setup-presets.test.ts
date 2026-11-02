import {
  SETUP_PRESETS,
  defaultHistoryStart,
  openingAmountValue,
} from "../setup-presets";
import { suggestCurrency } from "../currency-suggestion";

describe("setup presets", () => {
  it("lists every catalog preset exactly once", () => {
    expect(SETUP_PRESETS.map((preset) => String(preset.id)).sort()).toEqual([
      "BLANK",
      "BUSINESS",
      "COMMUNITY",
      "FREELANCE",
      "PERSONAL",
      "PORTFOLIO",
      "RENTAL",
      "SHARED_EXPENSES",
    ]);
  });
});

// w21/051: Books begin defaulted to the UTC date, so an evening ledger in the
// Americas began tomorrow and the first entry dated today was refused.
describe("defaultHistoryStart", () => {
  it("is the device's own date at 23:30 in America/Los_Angeles", () => {
    const zone = process.env.TZ;
    process.env.TZ = "America/Los_Angeles";
    try {
      const evening = new Date(2026, 9, 20, 23, 30);
      expect(evening.toISOString().slice(0, 10)).toBe("2026-10-21");
      expect(defaultHistoryStart(evening)).toBe("2026-10-20");
    } finally {
      if (zone === undefined) delete process.env.TZ;
      else process.env.TZ = zone;
    }
  });
});

describe("openingAmountValue", () => {
  it("accepts the decimal comma the decimal pad offers", () => {
    expect(openingAmountValue("1234,56")).toBe("1234.56");
    expect(openingAmountValue("1234.56")).toBe("1234.56");
    expect(openingAmountValue("-25")).toBe("-25");
  });

  // w21/697: a JPY opening balance typed "150,000" opened at 150.000.
  it("reads a lone group of three as thousands in a zero-decimal currency", () => {
    expect(openingAmountValue("150,000", "JPY")).toBe("150000");
    expect(openingAmountValue("150.000", "krw")).toBe("150000");
    expect(openingAmountValue("150,000", "EUR")).toBe("150.000");
  });

  it("leaves an empty field empty and refuses anything else", () => {
    expect(openingAmountValue("  ")).toBe("");
    expect(openingAmountValue("12,3,4")).toBe(null);
    expect(openingAmountValue("abc")).toBe(null);
  });
});

describe("Create Ledger's two steps (w3/m60/t005)", () => {
  it("has no review step and no Books begin question left", () => {
    const screen = require("fs").readFileSync(
      require("path").join(__dirname, "..", "create-ledger-screen.tsx"),
      "utf8",
    ) as string;
    expect(screen.includes('"createLedgerReviewDescription"')).toBe(false);
    expect(screen.includes('"createLedgerHistoryStart"')).toBe(false);
    expect(screen.includes('"createLedgerBalanceAsOf"')).toBe(true);
  });
});

// w21/061: a hand-rolled list offered Bulgaria (euro since 2026), Ukraine and
// Romania USD; the table is now the canonical setup catalog's.
describe("suggestCurrency: the setup catalog", () => {
  it("suggests the catalog's currency for every region", () => {
    const fromRegion = (region: string) => suggestCurrency({ region }).currency;
    expect(fromRegion("BG")).toBe("EUR");
    expect(fromRegion("bg")).toBe("EUR");
    expect(fromRegion("UA")).toBe("UAH");
    expect(fromRegion("RO")).toBe("RON");
    expect(fromRegion("XK")).toBe("EUR");
    // A region the catalog has no row for still falls back to USD.
    expect(fromRegion("AQ")).toBe("USD");
  });

  it("keeps the copy equal to the canonical catalog", () => {
    const fs = require("fs");
    const path = require("path");
    const canonical = path.join(
      __dirname,
      ...Array(5).fill(".."),
      "backend-cluster/backend-v2/src/features/ledger/setup/currencies.json",
    );
    // A checkout without the backend (a packaged test run) has nothing to
    // compare against.
    if (!fs.existsSync(canonical)) return;
    const read = (file: string) => JSON.parse(fs.readFileSync(file, "utf8"));
    expect(read(path.join(__dirname, "..", "setup-currencies.json"))).toEqual(
      read(canonical),
    );
  });
});
