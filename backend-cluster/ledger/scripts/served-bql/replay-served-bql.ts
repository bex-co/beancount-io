/**
 * Replays what the hosted MCP surface tells an agent about BQL (w23/m40).
 *
 * backend-v2 serves a `runBqlQuery` description that lists columns and
 * statement forms, and prompts that name expressions ("use `sum(weight)`").
 * An agent acts on those words, so each one has to run. The claims are
 * extracted from the served text by backend-v2's `served-bql-claims.test.ts`,
 * which keeps this directory's `served-bql-claims.json` equal to them; this
 * replays that list through the same service the API uses, on an in-memory
 * ledger, and fails when the engine refuses one (`SELECT change` was served
 * once and the engine has no such column, w1/226).
 *
 * It also checks the one number a playbook promises: the spending total over
 * an `@`-priced charge is one currency (w1/230).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { LedgerShellService } from "@/features/ledger/service/ledger-shell-service";
import { singleFileRepoFactory } from "../single-file-repo";

type Claims = {
  columns: string[];
  expressions: string[];
  forms: string[];
};

/** A ledger with a charge in a second currency, priced with `@`. */
const SERVED_BQL_LEDGER = `option "operating_currency" "USD"

2026-01-01 open Assets:Bank:Checking USD,EUR
2026-01-01 open Expenses:Food USD
2026-01-01 open Expenses:Travel EUR,USD
2026-01-01 open Equity:Opening USD

2026-01-02 * "Opening"
  Assets:Bank:Checking   1000.00 USD
  Equity:Opening        -1000.00 USD

2026-03-05 * "Groceries"
  Expenses:Food    42.50 USD
  Assets:Bank:Checking

2026-04-10 * "Train in Europe" "ticket"
  Expenses:Travel   80.00 EUR @ 1.09 USD
  Assets:Bank:Checking  -87.20 USD
`;

const service = new LedgerShellService(
  singleFileRepoFactory(SERVED_BQL_LEDGER) as never,
  {} as never,
);

async function run(query: string) {
  const result = await service.queryShell({
    ledgerId: "served/bql",
    userId: undefined,
    query,
  });
  if (!result.table) throw new Error("the engine answered without a table");
  return result.table;
}

/** The statement each claim stands for. */
function statementsFor(claims: Claims): string[] {
  return [
    ...claims.columns.map((column) => `SELECT ${column} LIMIT 1`),
    ...claims.expressions.map((expression) => `SELECT ${expression}`),
    ...claims.forms,
  ];
}

export async function verifyServedBql(): Promise<void> {
  const claims = JSON.parse(
    readFileSync(join(__dirname, "served-bql-claims.json"), "utf8"),
  ) as Claims;
  const statements = statementsFor(claims);
  if (statements.length === 0) {
    throw new Error("served-bql-claims.json holds no claims to replay");
  }

  const refused: string[] = [];
  for (const statement of statements) {
    try {
      await run(statement);
    } catch (error) {
      refused.push(
        `  ${statement}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  if (refused.length > 0) {
    throw new Error(
      `the engine refuses ${refused.length} of ${statements.length} BQL claims the MCP surface serves:\n${refused.join("\n")}`,
    );
  }

  // The spending playbook's total: one currency over a charge priced with `@`.
  const spending = await run(
    "SELECT sum(weight) WHERE account ~ '^Expenses:' AND year = 2026",
  );
  const cells = JSON.stringify(spending.rows);
  if (!cells.includes("USD") || cells.includes("EUR")) {
    throw new Error(
      `the spending total is not one USD figure: ${cells} (served as "use sum(weight)")`,
    );
  }

  console.log(
    `✓ the engine runs all ${statements.length} BQL claims the MCP surface serves, and the spending total is one currency`,
  );
}
