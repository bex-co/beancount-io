import { describe, expect, it } from "vitest";
import { viewSearchSchema as balanceSheetSearch } from "@/features/reports/balance-sheet/search";
import { viewSearchSchema as cashFlowSearch } from "@/features/reports/cash-flow/search";
import { incomeStatementSearchSchema } from "@/features/reports/income-statement/search";
import { accountJournalSearchSchema } from "@/features/reports/account/search";
import { applyLedgerFilterSearch } from "@/common/lib/ledger-search-params";
import { CHART_INTERVALS } from "@/common/types/chart";
import { parseIntervalSearch } from "../view-search";
import { reportIntervalLoaderDeps } from "../report-interval";

/**
 * A report's grouping interval is held in `?interval=` so a shared scope edit,
 * which unmounts the page at the layout boundary, keeps it (w4/m57). The same
 * parse feeds the page query and the server loader.
 */
const schemas = {
  account: accountJournalSearchSchema,
  balanceSheet: balanceSheetSearch,
  incomeStatement: incomeStatementSearchSchema,
  cashFlow: cashFlowSearch,
};

describe("parseIntervalSearch", () => {
  it("accepts each of the five intervals", () => {
    for (const interval of CHART_INTERVALS) {
      expect(parseIntervalSearch(interval)).toBe(interval);
    }
  });

  it("drops anything else", () => {
    for (const value of ["Weekly", "hourly", "", 7, ["weekly"], null, {}]) {
      expect(parseIntervalSearch(value)).toBeUndefined();
    }
  });
});

describe.each(Object.entries(schemas))("%s search", (_, schema) => {
  it("keeps an explicit interval through a shared-scope patch and a fresh parse", () => {
    const chosen = schema.parse({ time: "2016-04", interval: "weekly" });
    const patched = applyLedgerFilterSearch(chosen, {
      account: "Expenses:Food",
      filter: "",
      time: "2016",
    });
    expect(schema.parse(patched)).toMatchObject({ interval: "weekly" });
  });

  it("leaves the interval out for the default and for a typo", () => {
    expect(schema.parse({}).interval).toBeUndefined();
    expect(schema.parse({ interval: "wekly" }).interval).toBeUndefined();
  });
});

describe("reportIntervalLoaderDeps", () => {
  it("passes the selected interval with the shared filters", () => {
    expect(
      reportIntervalLoaderDeps({ time: 2016, interval: "weekly", view: "x" }),
    ).toEqual({ account: "", filter: "", time: "2016", interval: "weekly" });
  });

  it("falls back to monthly when the URL names none or an unknown one", () => {
    expect(reportIntervalLoaderDeps({}).interval).toBe("monthly");
    expect(reportIntervalLoaderDeps({ interval: "hourly" }).interval).toBe(
      "monthly",
    );
  });
});
