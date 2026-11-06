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
import { assertOracleCurrent } from "./bql-oracle-source-hash";
import {
  compareQuery,
  judge,
  parseAllowlist,
  type Difference,
  type EngineResult,
  type OracleResult,
} from "./bql-oracle-compare";

const DIR = __dirname;
const REPO_ROOT = join(DIR, "..", "..", "..", "..");

type OracleFile = {
  sourceHash?: string;
  results: Record<string, OracleResult & { ledger: string; query: string; source: string }>;
};

/** A repository holding exactly one ledger file, as the loader expects it. */
function singleLedgerFactory(source: string) {
  return {
    getPublicApiClient: async () => ({
      repos: {
        repoGetAllCommits: async () => ({ data: [] }),
        getTree: async () => ({
          data: { tree: [{ path: "main.bean", type: "blob" }], truncated: false },
        }),
        repoGetContents: async () => ({
          data: {
            type: "file",
            encoding: "base64",
            content: Buffer.from(source).toString("base64"),
          },
        }),
      },
    }),
  };
}

async function runOnEngine(ledger: string, query: string): Promise<EngineResult> {
  const source = readFileSync(join(DIR, "fixtures", ledger), "utf8");
  const service = new LedgerShellService(
    singleLedgerFactory(source) as never,
    {} as never,
  );
  try {
    const result = await service.queryShell({
      ledgerId: "oracle/ledger",
      userId: undefined,
      query,
    });
    const table = result.table;
    if (!table) return { error: "engine answered without a table" };
    return {
      columns: table.types.map((type) => ({ name: type.name, dtype: type.dtype })),
      rows: table.rows,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

function loadAllowlist(ids: ReadonlySet<string>) {
  const path = join(DIR, "allowlist.json");
  if (!existsSync(path)) return [];
  return parseAllowlist(
    JSON.parse(readFileSync(path, "utf8")),
    ids,
    (reference) => existsSync(join(REPO_ROOT, reference)),
  );
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
  const ids = Object.keys(oracle.results);
  const allowlist = loadAllowlist(new Set(ids));

  const found = new Map<string, Difference[]>();
  for (const id of ids) {
    const entry = oracle.results[id];
    found.set(id, compareQuery(entry, await runOnEngine(entry.ledger, entry.query)));
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
