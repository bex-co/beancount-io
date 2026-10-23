import fs from "fs";
import path from "path";
import {
  pageEndedBeforeToday,
  recentTransactionsWindowToToday,
  recentTransactionsUpTo,
  recentTransactionsWindow,
} from "../recent-window";

// w21/471: five pre-entered rent entries filled the "Recent Transactions" card
// and hid the coffee bought yesterday.
describe("Home's Recent Transactions window", () => {
  it("runs through the end of the month, so a later day keeps the cache key", () => {
    expect(recentTransactionsWindow("2026-10-21")).toBe(
      "0001-01-01 - 2026-10-31",
    );
    expect(recentTransactionsWindow("2026-10-22")).toBe(
      recentTransactionsWindow("2026-10-03"),
    );
    expect(recentTransactionsWindow("2026-02-10")).toBe(
      "0001-01-01 - 2026-02-28",
    );
    expect(recentTransactionsWindow("2028-02-10")).toBe(
      "0001-01-01 - 2028-02-29",
    );
  });

  it("keeps the newest rows dated up to today and drops later ones", () => {
    const rows = ["2026-10-30", "2026-10-25", "2026-10-21", "2026-10-20"].map(
      (date) => ({ date }),
    );
    expect(
      recentTransactionsUpTo(rows, "2026-10-22", 5).map((r) => r.date),
    ).toEqual(["2026-10-21", "2026-10-20"]);
    expect(recentTransactionsUpTo(rows, "2026-10-22", 1).length).toBe(1);
  });

  it("is a range the ledger's time filter reads", () => {
    // The ledger's `parseDateRange` needs both ends of a range.
    expect(
      /^\d{4}-\d{2}-\d{2} - \d{4}-\d{2}-\d{2}$/.test(
        recentTransactionsWindow("2026-10-21"),
      ),
    ).toBe(true);
  });

  it("is what the card asks for, following the day past midnight", () => {
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
    expect(card.includes("time:recentTransactionsWindow(today),")).toBe(true);
    // `today` is the hook's, so a new day is a new query.
    expect(card.includes("consttoday=useToday();")).toBe(true);
  });
});

// w21/664: 27 entries booked for later this month filled the whole page, and
// the card said "Nothing up to today" beside many past transactions.
describe("a page that ran out before today", () => {
  const day = (n: number) => ({
    date: `2026-10-${String(n).padStart(2, "0")}`,
  });
  const future = Array.from({ length: 25 }, (_, i) => day(31 - (i % 9)));

  it("needs the read up to today when later entries took the whole page", () => {
    expect(pageEndedBeforeToday(future, "2026-10-22", 5, 25)).toBe(true);
    expect(recentTransactionsWindowToToday("2026-10-22")).toBe(
      "0001-01-01 - 2026-10-22",
    );
  });

  it("also covers a page with only some past rows left", () => {
    const page = [...future.slice(0, 22), day(20), day(19), day(18)];
    expect(pageEndedBeforeToday(page, "2026-10-22", 5, 25)).toBe(true);
  });

  it("leaves a page that reached five past rows, or was not full, alone", () => {
    const enough = [...future.slice(0, 20), ...[20, 19, 18, 17, 16].map(day)];
    expect(pageEndedBeforeToday(enough, "2026-10-22", 5, 25)).toBe(false);
    expect(pageEndedBeforeToday(future.slice(0, 10), "2026-10-22", 5, 25)).toBe(
      false,
    );
  });
});
