import fs from "fs";
import path from "path";
import { isHistoryStart, isSetupCurrency, setupFields } from "../setup-presets";

// w21/107: currency and "Books begin" took any text; a typo dead-ended on
// Review in the server's words, and 2026-04-31 reached the ledger.
describe("Create Ledger's currency and start date", () => {
  it("accepts only currencies the server does", () => {
    expect(isSetupCurrency("USD")).toBe(true);
    expect(isSetupCurrency("eur")).toBe(true);
    expect(isSetupCurrency("US")).toBe(false);
    expect(isSetupCurrency("XYZ")).toBe(false);
  });

  it("accepts only real days, or nothing", () => {
    expect(isHistoryStart("2026-04-01")).toBe(true);
    expect(isHistoryStart("2024-02-29")).toBe(true);
    expect(isHistoryStart("")).toBe(true);
    expect(isHistoryStart("2026-4-1")).toBe(false);
    expect(isHistoryStart("2026-04-31")).toBe(false);
    expect(isHistoryStart("2026-02-30")).toBe(false);
  });

  it("refuses them on the form with localized messages", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "..", "create-ledger-screen.tsx"),
      "utf8",
    );
    expect(source.includes('message: t("createLedgerCurrencyInvalid"),')).toBe(
      true,
    );
    expect(
      source.includes('message: t("createLedgerHistoryStartInvalid"),'),
    ).toBe(true);
    expect(source.includes("{errors.currency?.message ? (")).toBe(true);
    expect(source.includes("{errors.historyStart?.message ? (")).toBe(true);
  });
});

// w21/330: the form's checks trim, but the server's validator does not.
describe("setupFields", () => {
  it('submits " USD" as USD and a padded date as the date', () => {
    expect(
      setupFields({ currency: " usd ", historyStart: " 2026-10-21 " }),
    ).toEqual({ operatingCurrency: "USD", historyStart: "2026-10-21" });
  });

  it("falls back to USD and to today for blanks", () => {
    expect(
      setupFields(
        { currency: "   ", historyStart: "  " },
        new Date(2026, 9, 21, 12),
      ),
    ).toEqual({ operatingCurrency: "USD", historyStart: "2026-10-21" });
  });

  // w21/436: left empty, the server counted the UTC day, which is tomorrow at
  // 22:30 in Los Angeles.
  it("sends the phone's local day in the evening, not a date for the server to guess", () => {
    const evening = new Date(2026, 9, 21, 22, 30);
    expect(
      setupFields({ currency: "USD", historyStart: "" }, evening).historyStart,
    ).toBe("2026-10-21");
    // A typed date wins.
    expect(
      setupFields({ currency: "USD", historyStart: "2026-01-01" }, evening)
        .historyStart,
    ).toBe("2026-01-01");
  });
});

describe("the setup payload", () => {
  it("is built through setupFields", () => {
    const screen = fs
      .readFileSync(
        path.join(__dirname, "..", "create-ledger-screen.tsx"),
        "utf8",
      )
      .replace(/\s+/gu, "");
    expect(screen.includes("constfields=setupFields(values);")).toBe(true);
    expect(screen.includes("operatingCurrency:fields.operatingCurrency,")).toBe(
      true,
    );
    expect(
      screen.includes(
        "historyStart:opening?fields.historyStart:defaultHistoryStart(),",
      ),
    ).toBe(true);
  });
});

// w21/365: the date check was ASCII-only, and `Date.UTC` reads a year of 0-99
// as 1900-1999.
describe("Books begin with other keyboards and early years", () => {
  it("accepts Persian, Arabic-Indic and full-width digits", () => {
    expect(isHistoryStart("۲۰۲۶-۱۰-۲۱")).toBe(true);
    expect(isHistoryStart("٢٠٢٦-١٠-٢١")).toBe(true);
    expect(isHistoryStart("２０２６-１０-２１")).toBe(true);
    expect(isHistoryStart("۲۰۲۶-۱۰-۳۲")).toBe(false);
  });

  it("submits them as ASCII", () => {
    expect(
      setupFields({ currency: "USD", historyStart: " ۲۰۲۶-۱۰-۲۱ " })
        .historyStart,
    ).toBe("2026-10-21");
    expect(
      setupFields({ currency: "USD", historyStart: "٢٠٢٦-١٠-٢١" }).historyStart,
    ).toBe("2026-10-21");
  });

  it("validates years 0001-0099 as those years", () => {
    expect(isHistoryStart("0050-03-01")).toBe(true);
    expect(isHistoryStart("0099-12-31")).toBe(true);
    // Not a leap year in the proleptic calendar the ledger uses: 0100 is
    // divisible by 100 but not 400, 0004 is.
    expect(isHistoryStart("0004-02-29")).toBe(true);
    expect(isHistoryStart("0100-02-29")).toBe(false);
    expect(isHistoryStart("0050-02-30")).toBe(false);
  });
});

// w21/502: a blank Books begin was re-read as "today" on every send, so a retry
// across local midnight changed the request and minted a new requestId.
describe("a blank Books begin settled on entering Review", () => {
  const beforeMidnight = new Date(2026, 9, 21, 23, 59, 50);
  const afterMidnight = new Date(2026, 9, 22, 0, 0, 10);
  const blank = { currency: "USD", historyStart: "" };

  it("moves with the clock while the field stays blank", () => {
    expect(setupFields(blank, beforeMidnight).historyStart).toBe("2026-10-21");
    expect(setupFields(blank, afterMidnight).historyStart).toBe("2026-10-22");
  });

  it("holds once the filled date is written back, across midnight", () => {
    const settled = {
      ...blank,
      historyStart: setupFields(blank, beforeMidnight).historyStart,
    };
    expect(setupFields(settled, afterMidnight).historyStart).toBe("2026-10-21");
  });

  it("is written back when Create leaves the form step", () => {
    const source = fs
      .readFileSync(
        path.join(__dirname, "..", "create-ledger-screen.tsx"),
        "utf8",
      )
      .replace(/\s+/g, "");
    expect(
      source.includes(
        'setValue("historyStart",setupFields(getValues()).historyStart,);voidonSubmit();',
      ),
    ).toBe(true);
  });
});
