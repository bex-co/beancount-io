import "dotenv/config";
import { createSign } from "node:crypto";
import {
  DEFAULT_THRESHOLDS,
  SEARCH_CONSOLE_SITE_URL,
  analyzeDashboardRows,
  renderDashboardReport,
  selectInspectionUrls,
  type SearchAnalyticsRow,
} from "./search-console-report-core";

const SEARCH_CONSOLE_SCOPE =
  "https://www.googleapis.com/auth/webmasters.readonly";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API_ROOT = "https://www.googleapis.com/webmasters/v3";
const INSPECTION_URL =
  "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect";

interface ServiceAccount {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

interface Args {
  days: number;
  markdown: boolean;
  inspectLimit: number;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { days: 28, markdown: false, inspectLimit: 5 };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--markdown") args.markdown = true;
    else if (value === "--days") args.days = Number(argv[++index]);
    else if (value === "--inspect-limit")
      args.inspectLimit = Number(argv[++index]);
    else if (value === "--help") {
      console.log(
        "Usage: yarn search-console-report [--markdown] [--days 28] [--inspect-limit 5]",
      );
      process.exit(0);
    } else throw new Error("Unknown argument: " + value);
  }
  if (!Number.isInteger(args.days) || args.days < 1 || args.days > 90)
    throw new Error("--days must be an integer from 1 to 90");
  if (
    !Number.isInteger(args.inspectLimit) ||
    args.inspectLimit < 0 ||
    args.inspectLimit > 20
  )
    throw new Error("--inspect-limit must be an integer from 0 to 20");
  return args;
}

function base64Url(value: string): string {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function loadServiceAccount(): ServiceAccount {
  const encoded = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_B64?.trim();
  if (!encoded)
    throw new Error(
      "Missing GOOGLE_SERVICE_ACCOUNT_JSON_B64. Put the Base64 service-account JSON in the local .env or CI secret.",
    );
  try {
    const value = JSON.parse(
      Buffer.from(encoded.replace(/\s+/g, ""), "base64").toString("utf8"),
    ) as Partial<ServiceAccount>;
    if (!value.client_email || !value.private_key)
      throw new Error("missing client_email or private_key");
    return value as ServiceAccount;
  } catch {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_JSON_B64 is not valid service-account JSON",
    );
  }
}

function dateDaysAgo(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

async function accessToken(account: ServiceAccount): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(
    JSON.stringify({
      iss: account.client_email,
      scope: SEARCH_CONSOLE_SCOPE,
      aud: account.token_uri || TOKEN_URL,
      iat: issuedAt,
      exp: issuedAt + 3600,
    }),
  );
  const unsigned = header + "." + payload;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const assertion =
    unsigned + "." + base64Url(signer.sign(account.private_key));
  const response = await fetch(account.token_uri || TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body:
      "grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=" +
      encodeURIComponent(assertion),
  });
  if (!response.ok)
    throw new Error("Google OAuth token request failed: " + response.status);
  const body = (await response.json()) as { access_token?: string };
  if (!body.access_token)
    throw new Error("Google OAuth response did not include access_token");
  return body.access_token;
}

async function googleFetch<T>(
  url: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      authorization: "Bearer " + token,
      "content-type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!response.ok) {
    const detail = (await response.text()).replace(/\s+/g, " ").slice(0, 300);
    throw new Error("Search Console API " + response.status + ": " + detail);
  }
  return (await response.json()) as T;
}

function apiSitePath(): string {
  return API_ROOT + "/sites/" + encodeURIComponent(SEARCH_CONSOLE_SITE_URL);
}

function asRows(value: unknown): SearchAnalyticsRow[] {
  const rows = (value as { rows?: Array<Record<string, unknown>> }).rows || [];
  return rows.map((row) => {
    const keys = Array.isArray(row.keys) ? row.keys : [];
    return {
      query: String(keys[0] || ""),
      page: String(keys[1] || ""),
      clicks: Number(row.clicks || 0),
      impressions: Number(row.impressions || 0),
      ctr: Number(row.ctr || 0),
      position: Number(row.position || 0),
    };
  });
}

function errorText(error: unknown): string {
  return (error instanceof Error ? error.message : String(error))
    .replace(/\s+/g, " ")
    .slice(0, 400);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const account = loadServiceAccount();
  const token = await accessToken(account);
  let rows: SearchAnalyticsRow[] = [];
  let analyticsAvailable = true;
  let analyticsError: string | undefined;
  try {
    rows = asRows(
      await googleFetch(apiSitePath() + "/searchAnalytics/query", token, {
        method: "POST",
        body: JSON.stringify({
          startDate: dateDaysAgo(args.days),
          endDate: new Date().toISOString().slice(0, 10),
          dimensions: ["query", "page", "device"],
          rowLimit: 25000,
          dataState: "final",
        }),
      }),
    );
  } catch (error) {
    analyticsAvailable = false;
    analyticsError = errorText(error);
  }
  const opportunities = analyzeDashboardRows(rows, DEFAULT_THRESHOLDS);
  let sitemapLines = ["Sitemap check unavailable."];
  try {
    const value = await googleFetch<{
      sitemap?: Array<Record<string, unknown>>;
    }>(apiSitePath() + "/sitemaps", token);
    sitemapLines = (value.sitemap || []).map((item) => {
      const errors = Number(item.errors || 0);
      const warnings = Number(item.warnings || 0);
      return (
        "- " +
        (errors ? "error" : warnings ? "warning" : "ok") +
        ": " +
        String(item.path || item.contents || "") +
        " (errors " +
        errors +
        ", warnings " +
        warnings +
        ")"
      );
    });
    if (sitemapLines.length === 0)
      sitemapLines = ["No sitemap entries returned."];
  } catch (error) {
    sitemapLines = ["Unavailable: " + errorText(error)];
  }
  const inspectionLines: string[] = [];
  for (const url of selectInspectionUrls(opportunities, args.inspectLimit)) {
    try {
      const value = await googleFetch<{
        inspectionResult?: { indexStatusResult?: { verdict?: string } };
      }>(INSPECTION_URL, token, {
        method: "POST",
        body: JSON.stringify({
          inspectionUrl: url,
          siteUrl: SEARCH_CONSOLE_SITE_URL,
          languageCode: "en-US",
        }),
      });
      inspectionLines.push(
        "- " +
          url +
          ": " +
          (value.inspectionResult?.indexStatusResult?.verdict || "no verdict"),
      );
    } catch (error) {
      inspectionLines.push("- " + url + ": " + errorText(error));
    }
  }
  if (inspectionLines.length === 0)
    inspectionLines.push("No dashboard URLs sampled.");
  const report = renderDashboardReport({
    generatedAt: new Date().toISOString(),
    days: args.days,
    analyticsAvailable,
    analyticsError,
    opportunities,
    sitemapLines,
    inspectionLines,
  });
  process.stdout.write(args.markdown ? report : report.replace(/^#+ /gm, ""));
}

main().catch((error) => {
  console.error("Dashboard Search Console report failed: " + errorText(error));
  process.exitCode = 2;
});
