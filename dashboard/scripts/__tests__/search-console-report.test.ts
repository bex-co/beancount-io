import { describe, expect, it } from "vitest";
import {
  aggregateSearchRows,
  analyzeDashboardRows,
  classifyDashboardPath,
  selectInspectionUrls,
} from "../search-console-report-core";

describe("dashboard Search Console report core", () => {
  it("classifies dashboard paths separately from CMS and proxy paths", () => {
    expect(
      classifyDashboardPath("https://beancount.io/ledger/open_ledger/example"),
    ).toBe("dashboard");
    expect(classifyDashboardPath("https://beancount.io/ledger/editor")).toBe(
      "api",
    );
    expect(classifyDashboardPath("https://beancount.io/forum/t/example")).toBe(
      "forum",
    );
    expect(classifyDashboardPath("https://beancount.io/api/healthz")).toBe(
      "api",
    );
    expect(classifyDashboardPath("https://beancount.io/blog/example")).toBe(
      "cms",
    );
  });

  it("aggregates device rows and only ranks dashboard-owned opportunities", () => {
    const rows = aggregateSearchRows([
      {
        query: "ledger",
        page: "/ledger/open_ledger/example",
        clicks: 1,
        impressions: 100,
        ctr: 0.01,
        position: 5,
      },
      {
        query: "ledger",
        page: "/ledger/open_ledger/example",
        clicks: 2,
        impressions: 100,
        ctr: 0.02,
        position: 7,
      },
      {
        query: "forum",
        page: "/forum/t/example",
        clicks: 0,
        impressions: 500,
        ctr: 0,
        position: 5,
      },
    ]);
    expect(rows).toHaveLength(2);
    const opportunities = analyzeDashboardRows(rows);
    expect(opportunities).toHaveLength(2);
    expect(opportunities.every((row) => row.page.startsWith("/ledger"))).toBe(
      true,
    );
  });

  it("deduplicates inspection pages", () => {
    const opportunities = analyzeDashboardRows([
      {
        query: "a",
        page: "/ledger/open_ledger/example",
        clicks: 0,
        impressions: 50,
        ctr: 0,
        position: 5,
      },
      {
        query: "b",
        page: "/ledger/open_ledger/example",
        clicks: 0,
        impressions: 40,
        ctr: 0,
        position: 6,
      },
    ]);
    expect(selectInspectionUrls(opportunities, 5)).toEqual([
      "/ledger/open_ledger/example",
    ]);
  });
});
