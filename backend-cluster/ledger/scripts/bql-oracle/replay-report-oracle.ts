/**
 * Replays the reports against stock beancount (w23/m41).
 *
 * The trial balance, balance sheet and income statement are what a user reads
 * as "my numbers", and until now nothing compared them with what stock
 * beancount computes from the same ledger. Each case in `report-cases.json`
 * names a report, a conversion mode and a query in `queries.json` that defines
 * the figure in stock BQL (`SELECT account, <fn>(sum(position)) … GROUP BY
 * account`); `bql-oracle.json` holds stock beanquery's answer. This runs the
 * report through `LedgerFinanceService`, flattens its account tree to the same
 * per-account balances, and fails on any account or amount that differs unless
 * `report-allowlist.json` documents it.
 *
 * Offline like the BQL oracle: the ledgers are served from memory and stock's
 * answer was captured by `generate-bql-oracle.py`.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { LedgerFinanceService } from "@/features/ledger/service/ledger-finance-service";
import { singleFileRepoFactory } from "../single-file-repo";
import { assertOracleCurrent } from "./bql-oracle-source-hash";
import {
  judge,
  parseAllowlist,
  type Difference,
  type QueryResult,
} from "./bql-oracle-compare";
import {
  compare,
  flatten,
  stockAmounts,
  type Node,
  type Report,
} from "./report-oracle-compare";

const DIR = __dirname;
const REPO_ROOT = join(DIR, "..", "..", "..", "..");

type Mode = "units" | "at_cost" | "at_value" | "usd";
type ReportCase = { id: string; ledger: string; report: Report; mode: Mode };

/** The service's conversion spelling for each mode the cases use. */
const CONVERSION: Record<Mode, string> = {
  units: "units",
  at_cost: "at_cost",
  at_value: "at_value",
  usd: "USD",
};

const finances = new Map<string, LedgerFinanceService>();
function financeFor(ledger: string): LedgerFinanceService {
  let finance = finances.get(ledger);
  if (!finance) {
    const source = readFileSync(join(DIR, "fixtures", ledger), "utf8");
    finance = new LedgerFinanceService(
      singleFileRepoFactory(source) as never,
      {} as never,
    );
    finances.set(ledger, finance);
  }
  return finance;
}

/** The account trees the report publishes, whatever it calls them. */
async function trees(c: ReportCase): Promise<Node[]> {
  const params = {
    ledgerId: "oracle/ledger",
    userId: undefined,
    conversion: CONVERSION[c.mode],
  };
  const finance = financeFor(c.ledger);
  if (c.report === "trial-balance") {
    const r = await finance.getTrialBalance(params);
    return [
      r.assets_hierarchy_data,
      r.liabilities_hierarchy_data,
      r.equity_hierarchy_data,
      r.income_hierarchy_data,
      r.expenses_hierarchy_data,
    ] as Node[];
  }
  if (c.report === "balance-sheet") {
    const r = await finance.getBalanceSheet(params);
    return [
      r.assets_hierarchy_data,
      r.liabilities_hierarchy_data,
      r.equity_hierarchy_data,
    ] as Node[];
  }
  const r = await finance.getIncomeStatement({ ...params, time: "2026" });
  return [r.income_hierarchy_data, r.expenses_hierarchy_data] as Node[];
}

type OracleFile = { results: Record<string, QueryResult & { query: string }> };

export async function verifyReportOracle(): Promise<void> {
  const oracle = JSON.parse(
    readFileSync(join(DIR, "bql-oracle.json"), "utf8"),
  ) as OracleFile;
  // The stock answers must be the ones the current queries and fixtures
  // produce, whether or not the BQL replay ran first.
  assertOracleCurrent(
    (oracle as { sourceHash?: string }).sourceHash,
    join(DIR, "queries.json"),
    join(DIR, "fixtures"),
  );
  const cases = JSON.parse(
    readFileSync(join(DIR, "report-cases.json"), "utf8"),
  ) as ReportCase[];
  const allowlist = parseAllowlist(
    JSON.parse(readFileSync(join(DIR, "report-allowlist.json"), "utf8")),
    new Set(cases.map((c) => c.id)),
    (reference) => existsSync(join(REPO_ROOT, reference)),
  );

  const found = new Map<string, Difference[]>();
  for (const c of cases) {
    const stock = oracle.results[c.id];
    if (!stock || "error" in stock) {
      throw new Error(`report case ${c.id} has no stock answer to compare`);
    }
    const stockBalances = new Map(
      stock.rows.map((row) => [String(row[0]), stockAmounts(row[1])]),
    );
    found.set(
      c.id,
      compare(stockBalances, flatten(await trees(c), c.report)),
    );
  }

  const verdict = judge(found, allowlist);
  const lines: string[] = [];
  for (const { id, differences } of verdict.unexpected) {
    lines.push(`  ${id}: ${oracle.results[id].query}`);
    for (const difference of differences) {
      lines.push(`    ${difference.kind}: ${difference.detail}`);
    }
  }
  for (const { id, kinds } of verdict.stale) {
    lines.push(
      `  ${id}: the allowlist excuses ${kinds.join(", ")} but the report no longer differs — remove it`,
    );
  }
  if (lines.length > 0) {
    throw new Error(
      `report oracle: ${verdict.unexpected.length} unexpected difference(s), ${verdict.stale.length} stale allowlist entr${verdict.stale.length === 1 ? "y" : "ies"}:\n${lines.join("\n")}`,
    );
  }
  console.log(
    `✓ the reports match stock beancount on ${cases.length} report cases (${verdict.allowed} documented deviation(s))`,
  );
}
