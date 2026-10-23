import fs from "fs";
import path from "path";
import { AccountReportQuery } from "@/generated-graphql/graphql";
import { selectAccountBalanceDisplay } from "../selectors/select-account-balance-series";
import { balanceNotes, valuationDetails } from "../../../common/valuation";

/**
 * w21/742: account detail's header said "Balance · 1 not in total" and
 * nothing opened it, so a Wise account's 500.00 EUR appeared only on one
 * journal row far below. Home's status line opens the valuation sheet.
 */
const report = (balance: Record<string, string>) =>
  ({
    getLedgerAccountReport: {
      linechartData: [{ date: "2026-08-06", balance }],
    },
  }) as unknown as AccountReportQuery;
const wise = { USD: "1000.00", EUR: "500.00" };
const display = selectAccountBalanceDisplay(
  "USD",
  report(wise),
  report(wise),
  [],
  "2026-10-23",
  wise,
);

describe("account detail's status line", () => {
  it("counts the EUR it leaves out, and opens a sheet that lists it", () => {
    expect(
      balanceNotes(display, "USD", (key) => key, "en").includes(
        "notInTotalCount",
      ),
    ).toBe(true);
    expect(valuationDetails(display.valuation)?.notInTotal).toEqual([
      { currency: "EUR", number: 500, scale: 2 },
    ]);
  });

  it("opens nothing for a cash balance with nothing to say", () => {
    const cash = selectAccountBalanceDisplay(
      "USD",
      report({ USD: "1000.00" }),
      report({ USD: "1000.00" }),
      [],
      "2026-10-23",
      { USD: "1000.00" },
    );
    expect(valuationDetails(cash.valuation)).toBe(null);
  });

  it("is a button on account detail, which mounts the sheet", () => {
    const read = (...parts: string[]) =>
      fs
        .readFileSync(path.join(__dirname, "..", "..", "..", ...parts), "utf8")
        .replace(/\s+/g, "");
    const screen = read(
      "screens",
      "account-detail-screen",
      "account-detail-screen.tsx",
    );
    expect(screen.includes("onLabelPress={openValuation}")).toBe(true);
    expect(
      screen.includes("<ValuationSheetvaluation={valuationOpen?details:null}"),
    ).toBe(true);
    const card = read("components", "balance-chart-card", "index.tsx");
    expect(card.includes("{onLabelPress&&(<PressableScale")).toBe(true);
    expect(card.includes("label={onLabelPress?undefined:label}")).toBe(true);
  });
});
