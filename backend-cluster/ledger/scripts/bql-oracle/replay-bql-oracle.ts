/**
 * Replays the stock beanquery oracle (`bql-oracle.json`) through the same
 * service the API uses — `LedgerShellService.queryShell`, so the complexity
 * refusal, the normalization pipeline, and the result mapping all run — and
 * fails on any difference that `allowlist.json` does not excuse.
 *
 * The fixtures are served from memory as a one-file repository: nothing here
 * touches the network, and the oracle itself was generated offline.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { LedgerShellService } from "@/features/ledger/service/ledger-shell-service";
import { singleFileRepoFactory } from "../single-file-repo";
import { assertOracleCurrent } from "./bql-oracle-source-hash";
import {
  compareQuery,
  judge,
  parseAllowlist,
  type Difference,
  type QueryResult,
} from "./bql-oracle-compare";

const DIR = __dirname;
const REPO_ROOT = join(DIR, "..", "..", "..", "..");

type OracleFile = {
  sourceHash?: string;
  results: Record<
    string,
    QueryResult & { ledger: string; query: string; source: string }
  >;
};

/**
 * One service per fixture. The service keeps no per-ledger state and the fake
 * repository reports no commits, so the loader never caches: every query still
 * loads and parses the ledger afresh.
 */
const services = new Map<string, LedgerShellService>();

function serviceFor(ledger: string): LedgerShellService {
  let service = services.get(ledger);
  if (!service) {
    const source = readFileSync(join(DIR, "fixtures", ledger), "utf8");
    service = new LedgerShellService(
      singleFileRepoFactory(source) as never,
      {} as never,
    );
    services.set(ledger, service);
  }
  return service;
}

async function runOnEngine(
  ledger: string,
  query: string,
): Promise<QueryResult> {
  try {
    const result = await serviceFor(ledger).queryShell({
      ledgerId: "oracle/ledger",
      userId: undefined,
      query,
    });
    const table = result.table;
    if (!table) return { error: "engine answered without a table" };
    return {
      columns: table.types.map((type) => ({
        name: type.name,
        dtype: type.dtype,
      })),
      rows: table.rows,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

export async function verifyBqlOracle(): Promise<void> {
  const oracle = JSON.parse(
    readFileSync(join(DIR, "bql-oracle.json"), "utf8"),
  ) as OracleFile;
  assertOracleCurrent(
    oracle.sourceHash,
    join(DIR, "queries.json"),
    join(DIR, "fixtures"),
  );
  // Queries that only define a report's figure in stock BQL (`report-*`) are
  // replayed by `replay-report-oracle.ts`, against the report, not the engine.
  const skipped = new Set(
    (
      JSON.parse(readFileSync(join(DIR, "queries.json"), "utf8")) as {
        id: string;
        replay?: boolean;
      }[]
    )
      .filter((query) => query.replay === false)
      .map((query) => query.id),
  );
  const ids = Object.keys(oracle.results).filter((id) => !skipped.has(id));
  const allowlist = parseAllowlist(
    JSON.parse(readFileSync(join(DIR, "allowlist.json"), "utf8")),
    new Set(ids),
    (reference) => existsSync(join(REPO_ROOT, reference)),
  );

  const found = new Map<string, Difference[]>();
  for (const id of ids) {
    const entry = oracle.results[id];
    found.set(
      id,
      compareQuery(entry, await runOnEngine(entry.ledger, entry.query)),
    );
  }

  const verdict = judge(found, allowlist);
  const lines: string[] = [];
  for (const { id, differences } of verdict.unexpected) {
    const entry = oracle.results[id];
    lines.push(`  ${id} (${entry.source}): ${entry.query}`);
    for (const difference of differences) {
      lines.push(`    ${difference.kind}: ${difference.detail}`);
    }
  }
  for (const { id, kinds } of verdict.stale) {
    lines.push(
      `  ${id}: the allowlist excuses ${kinds.join(", ")} but the engine no longer differs — remove it`,
    );
  }
  if (lines.length > 0) {
    throw new Error(
      `BQL oracle: ${verdict.unexpected.length} unexpected difference(s), ${verdict.stale.length} stale allowlist entr${verdict.stale.length === 1 ? "y" : "ies"}\n${lines.join("\n")}`,
    );
  }
  console.log(
    `✓ the engine matches stock beanquery on ${ids.length} oracle queries (${verdict.allowed} documented deviation(s))`,
  );
}
