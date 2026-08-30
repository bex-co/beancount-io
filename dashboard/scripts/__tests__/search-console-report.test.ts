import { describe, expect, it } from "vitest";
import {
  aggregateSearchRows,
  analyzeDashboardRows,
  canonicalizeReportPage,
  classifyDashboardPath,
  renderDashboardReport,
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

  it("classifies locale-prefixed CMS paths as cms", () => {
    expect(classifyDashboardPath("https://beancount.io/zh/blog")).toBe("cms");
    expect(classifyDashboardPath("https://beancount.io/ja/docs")).toBe("cms");
    expect(classifyDashboardPath("https://beancount.io/en/research-logs")).toBe(
      "cms",
    );
    expect(classifyDashboardPath("https://beancount.io/it/tools")).toBe("cms");
    expect(classifyDashboardPath("https://beancount.io/sk/open-ledger")).toBe(
      "cms",
    );
    expect(classifyDashboardPath("https://beancount.io/zh")).toBe("cms");
    expect(classifyDashboardPath("https://beancount.io/")).toBe("cms");
  });

  it("does not misclassify dashboard paths with similar prefix as cms", () => {
    expect(
      classifyDashboardPath("https://beancount.io/ledger/open_ledger/example"),
    ).toBe("dashboard");
    expect(
      classifyDashboardPath(
        "https://beancount.io/ledger/open_ledger/example?lang=uk",
      ),
    ).toBe("dashboard");
    expect(classifyDashboardPath("https://beancount.io/login")).toBe(
      "dashboard",
    );
    expect(
      classifyDashboardPath(
        "https://beancount.io/awesome-plain-text-accounting",
      ),
    ).toBe("dashboard");
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

  it("canonicalizes report page by stripping query and hash", () => {
    expect(
      canonicalizeReportPage(
        "https://beancount.io/ledger/open_ledger/example/account/Expenses:Financial:Fees?lang=uk",
      ),
    ).toBe(
      "https://beancount.io/ledger/open_ledger/example/account/Expenses:Financial:Fees",
    );
    expect(
      canonicalizeReportPage(
        "https://beancount.io/ledger/open_ledger/example?lang=ca&editMode=true#section",
      ),
    ).toBe("https://beancount.io/ledger/open_ledger/example");
    expect(canonicalizeReportPage("/ledger/open_ledger/example?lang=uk")).toBe(
      "/ledger/open_ledger/example",
    );
  });

  it("aggregates lang/param variants under canonical page with weighted position and variant count", () => {
    const rows = aggregateSearchRows([
      {
        query: "fees",
        page: "https://beancount.io/ledger/open_ledger/example/account/Expenses:Financial:Fees?lang=uk",
        clicks: 0,
        impressions: 10,
        ctr: 0,
        position: 88,
      },
      {
        query: "fees",
        page: "https://beancount.io/ledger/open_ledger/example/account/Expenses:Financial:Fees?lang=ca",
        clicks: 0,
        impressions: 10,
        ctr: 0,
        position: 97,
      },
      {
        query: "fees",
        page: "https://beancount.io/ledger/open_ledger/example/account/Expenses:Financial:Fees",
        clicks: 1,
        impressions: 20,
        ctr: 0.05,
        position: 5,
      },
    ]);
    expect(rows).toHaveLength(1);
    const row = rows[0]!;
    expect(row.page).toBe(
      "https://beancount.io/ledger/open_ledger/example/account/Expenses:Financial:Fees",
    );
    expect(row.clicks).toBe(1);
    expect(row.impressions).toBe(40);
    expect(row.ctr).toBeCloseTo(0.025);
    // impression-weighted position: (88*10 + 97*10 + 5*20)/40 = (880+970+100)/40=48.75
    expect(row.position).toBeCloseTo(48.75);
    expect(row.variantCount).toBe(3);
  });

  it("renders variant count in markdown table", () => {
    const report = renderDashboardReport({
      generatedAt: "2026-08-22T00:00:00.000Z",
      days: 28,
      analyticsAvailable: true,
      opportunities: [
        {
          query: "fees",
          page: "https://beancount.io/ledger/open_ledger/example/account/Expenses:Financial:Fees",
          clicks: 1,
          impressions: 40,
          ctr: 0.025,
          position: 48.8,
          variantCount: 3,
          kind: "low-ctr",
          routeOwner: "dashboard",
          score: 1,
        },
      ],
      sitemapLines: ["- ok: /sitemap.xml (errors 0, warnings 0)"],
      inspectionLines: [
        "- https://beancount.io/ledger/open_ledger/example: ok",
      ],
    });
    expect(report).toContain("| Variants |");
    expect(report).toContain("| 3 |");
  });
});
