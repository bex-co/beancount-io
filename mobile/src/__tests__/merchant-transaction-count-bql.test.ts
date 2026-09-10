import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import {
  PAYEE_ROLLUP_BQL,
  aggregatePayees,
} from "../screens/merchants-screen/selectors/aggregate-payees";
import { buildMerchantMetaBql } from "../screens/merchant-detail-screen/selectors/merchant-stats";

const FIXTURE = path.join(
  __dirname,
  "fixtures",
  "merchant-transaction-counts.beancount",
);
const CLI_DIR = path.resolve(__dirname, "../../../cli");

function beanQueryAvailable(): boolean {
  if (!existsSync(path.join(CLI_DIR, "pyproject.toml"))) {
    return false;
  }
  try {
    execFileSync("uv", ["run", "bean-query", "--help"], {
      cwd: CLI_DIR,
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

function runBql(query: string): string {
  return execFileSync("uv", ["run", "bean-query", FIXTURE, query], {
    cwd: CLI_DIR,
    encoding: "utf8",
  });
}

describe("merchant transaction-count BQL relation", () => {
  it("counts FROM #entries in both directory and detail builders", () => {
    expect(PAYEE_ROLLUP_BQL).toBe(
      "SELECT payee, count(*) as transaction_count, min(date) as first_date, max(date) as last_date FROM #entries WHERE payee != '' GROUP BY payee ORDER BY transaction_count DESC",
    );
    expect(buildMerchantMetaBql("Hoogle")).toBe(
      'SELECT count(*) as transaction_count, min(date) as first_date, max(date) as last_date FROM #entries WHERE payee = "Hoogle"',
    );
    // Currency totals stay posting-aware (no #entries) on purpose.
    expect(buildMerchantMetaBql("Cafe").includes("FROM #entries")).toBe(true);
  });

  const canRun = beanQueryAvailable();
  (canRun ? it : it.skip)(
    "executes the real count queries against an unequal-posting fixture",
    () => {
      const rollupOut = runBql(PAYEE_ROLLUP_BQL);
      // Hoogle: 1 txn / 3 postings; Cafe: 2 same-day txns; empty payee excluded.
      expect(rollupOut.includes("Cafe")).toBe(true);
      expect(rollupOut.includes("Hoogle")).toBe(true);
      expect(rollupOut.includes("Cafe    2")).toBe(true);
      expect(rollupOut.includes("Hoogle  1")).toBe(true);
      expect(rollupOut.includes('""')).toBe(false);

      const hoogleMeta = runBql(buildMerchantMetaBql("Hoogle"));
      expect(hoogleMeta.includes("2025-01-15")).toBe(true);
      expect(hoogleMeta.trim().split("\n").some((line) => /^\s*1\b/.test(line))).toBe(
        true,
      );

      // Directory ordering must prefer Cafe (2) over Hoogle (1), not posting counts.
      const mapped = aggregatePayees({
        types: [
          { name: "payee", dtype: "str" },
          { name: "transaction_count", dtype: "int" },
          { name: "first_date", dtype: "date" },
          { name: "last_date", dtype: "date" },
        ],
        rows: [
          ["Cafe", 2, "2025-01-10", "2025-01-10"],
          ["Hoogle", 1, "2025-01-15", "2025-01-15"],
        ],
      });
      expect(mapped.map((row) => row.payee)).toEqual(["Cafe", "Hoogle"]);
    },
  );
});
