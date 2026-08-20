export const SEARCH_CONSOLE_SITE_URL = "https://beancount.io/";

export type DashboardRouteOwner =
  | "dashboard"
  | "cms"
  | "forum"
  | "api"
  | "unknown";

export interface SearchAnalyticsRow {
  query: string;
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface DashboardOpportunity extends SearchAnalyticsRow {
  kind: "low-ctr" | "near-page-one";
  routeOwner: DashboardRouteOwner;
  score: number;
}

export interface ReportThresholds {
  minImpressions: number;
  lowCtr: number;
  minPosition: number;
  maxPosition: number;
}

export const DEFAULT_THRESHOLDS: ReportThresholds = {
  minImpressions: 20,
  lowCtr: 0.03,
  minPosition: 4,
  maxPosition: 20,
};

const dashboardPrefixes = [
  "/ledger",
  "/login",
  "/sign-up",
  "/auth",
  "/settings",
  "/lgasset",
  "/oauth",
];

const apiBeforeDashboardPrefixes = ["/ledger/editor"];
const forumPrefixes = ["/forum"];
const apiPrefixes = ["/api", "/.well-known"];
const cmsPrefixes = [
  "/blog",
  "/research-logs",
  "/bean-labs",
  "/docs",
  "/compare",
  "/open-ledger",
  "/tools",
];

function hasPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix + "/");
}

export function classifyDashboardPath(page: string): DashboardRouteOwner {
  let pathname = page;
  try {
    pathname = new URL(page, SEARCH_CONSOLE_SITE_URL).pathname;
  } catch {
    pathname = page.split("?")[0] || "/";
  }
  if (apiBeforeDashboardPrefixes.some((prefix) => hasPrefix(pathname, prefix)))
    return "api";
  if (dashboardPrefixes.some((prefix) => hasPrefix(pathname, prefix)))
    return "dashboard";
  if (forumPrefixes.some((prefix) => hasPrefix(pathname, prefix)))
    return "forum";
  if (apiPrefixes.some((prefix) => hasPrefix(pathname, prefix))) return "api";
  if (
    cmsPrefixes.some((prefix) => hasPrefix(pathname, prefix)) ||
    pathname === "/"
  )
    return "cms";
  return "unknown";
}

export function aggregateSearchRows(
  rows: SearchAnalyticsRow[],
): SearchAnalyticsRow[] {
  const grouped = new Map<string, SearchAnalyticsRow>();
  for (const row of rows) {
    const key = row.query + "\u0000" + row.page;
    const current = grouped.get(key) ?? {
      query: row.query,
      page: row.page,
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: 0,
    };
    const previousImpressions = current.impressions;
    const totalImpressions = previousImpressions + row.impressions;
    current.clicks += row.clicks;
    current.impressions = totalImpressions;
    current.position = totalImpressions
      ? (current.position * previousImpressions +
          row.position * row.impressions) /
        totalImpressions
      : 0;
    current.ctr = totalImpressions ? current.clicks / totalImpressions : 0;
    grouped.set(key, current);
  }
  return [...grouped.values()];
}

export function analyzeDashboardRows(
  rows: SearchAnalyticsRow[],
  thresholds: ReportThresholds = DEFAULT_THRESHOLDS,
): DashboardOpportunity[] {
  const opportunities: DashboardOpportunity[] = [];
  for (const row of aggregateSearchRows(rows)) {
    if (row.impressions < thresholds.minImpressions) continue;
    if (classifyDashboardPath(row.page) !== "dashboard") continue;
    if (row.ctr < thresholds.lowCtr) {
      opportunities.push({
        ...row,
        routeOwner: "dashboard",
        kind: "low-ctr",
        score: row.impressions * (thresholds.lowCtr - row.ctr),
      });
    }
    if (
      row.position >= thresholds.minPosition &&
      row.position <= thresholds.maxPosition
    ) {
      opportunities.push({
        ...row,
        routeOwner: "dashboard",
        kind: "near-page-one",
        score:
          row.impressions *
          Math.max(0, thresholds.maxPosition + 1 - row.position),
      });
    }
  }
  return opportunities.sort(
    (a, b) =>
      b.score - a.score ||
      b.impressions - a.impressions ||
      a.query.localeCompare(b.query) ||
      a.page.localeCompare(b.page),
  );
}

export function selectInspectionUrls(
  opportunities: DashboardOpportunity[],
  limit: number,
): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  for (const opportunity of opportunities) {
    if (!seen.has(opportunity.page)) {
      seen.add(opportunity.page);
      urls.push(opportunity.page);
    }
    if (urls.length >= limit) break;
  }
  return urls;
}

function percentage(value: number): string {
  return (value * 100).toFixed(2) + "%";
}

export function renderDashboardReport(input: {
  generatedAt: string;
  days: number;
  analyticsAvailable: boolean;
  analyticsError?: string;
  opportunities: DashboardOpportunity[];
  sitemapLines: string[];
  inspectionLines: string[];
}): string {
  const lines = [
    "# Dashboard Search Console report",
    "",
    "- Property: " + SEARCH_CONSOLE_SITE_URL,
    "- Window: last " + input.days + " days",
    "- Generated: " + input.generatedAt,
    "",
    "## Dashboard-owned opportunities",
    "",
    input.analyticsAvailable
      ? "Search Analytics query completed."
      : "Search Analytics unavailable: " +
        (input.analyticsError || "unknown error"),
    "",
    "| Kind | Query | Page | Clicks | Impressions | CTR | Position |",
    "| --- | --- | --- | ---: | ---: | ---: | ---: |",
  ];
  if (input.opportunities.length === 0)
    lines.push(
      "| — | No qualifying dashboard opportunities | — | 0 | 0 | 0.00% | — |",
    );
  for (const opportunity of input.opportunities.slice(0, 50)) {
    lines.push(
      "| " +
        opportunity.kind +
        " | " +
        opportunity.query.replace(/\|/g, "\\|") +
        " | " +
        opportunity.page +
        " | " +
        opportunity.clicks.toFixed(0) +
        " | " +
        opportunity.impressions.toFixed(0) +
        " | " +
        percentage(opportunity.ctr) +
        " | " +
        opportunity.position.toFixed(1) +
        " |",
    );
  }
  lines.push("", "## Sitemap health", "", ...input.sitemapLines);
  lines.push("", "## Dashboard URL inspection", "", ...input.inspectionLines);
  return lines.join("\n") + "\n";
}
