import fs from "fs";
import path from "path";
import { en } from "../../../../translations/en";
import { translationLocales } from "../../../../translations/__tests__/locale-parity";

// w21/573: with only entries booked for later, Home's Recent Transactions said
// "No transactions yet" with a welcome button, as for a new ledger. Source
// checks (the card needs the native runtime).
const card = fs
  .readFileSync(
    path.join(
      __dirname,
      "..",
      "..",
      "components",
      "recent-transactions-card.tsx",
    ),
    "utf8",
  )
  .replace(/\s+/g, "");

describe("Home's Recent Transactions with only upcoming entries", () => {
  it("asks for the newest entry only when nothing is up to today", () => {
    expect(
      card.includes(
        "constemptyUpToToday=data!==undefined&&!error&&(!needsPast||pastData!==undefined)&&entries.length===0;",
      ),
    ).toBe(true);
    expect(card.includes("limit:1,")).toBe(true);
    expect(card.includes("skip:!ledgerId||!emptyUpToToday,")).toBe(true);
  });

  it("calls the ledger upcoming-only when its newest entry is after today", () => {
    expect(
      card.includes(
        "constupcomingOnly=emptyUpToToday&&newest!==undefined&&newest>today;",
      ),
    ).toBe(true);
  });

  it("shows the upcoming message and no welcome button for it", () => {
    expect(
      card.includes(
        '{upcomingOnly?t("recentTransactionsUpcoming"):t("recentTransactionsEmpty")}',
      ),
    ).toBe(true);
    expect(
      card.includes(
        "{!upcomingOnly&&ledgerId&&data&&!error&&onAddTransaction?",
      ),
    ).toBe(true);
  });

  it("is worded in every language", () => {
    expect(en.recentTransactionsUpcoming.length > 0).toBe(true);
    for (const locale of translationLocales()) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const catalog = require(`../../../../translations/${locale}`)[locale];
      expect(typeof catalog.recentTransactionsUpcoming).toBe("string");
    }
  });
});
