import "dotenv/config";

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";
import { isNotNull, asc, sql } from "drizzle-orm";
import {
  createDatabaseConnection,
  closeDatabaseConnection,
  type DbExecutor,
} from "@/drizzle/drizzle";
import { UserPostgresModel, users } from "@/features/auth/data/user-model";
import { FavaClientFactory } from "@/foundation/clients/fava-client-factory";
import { LedgerDataService } from "@/features/ledger/service/ledger-data-service";
import { unwrapFavaResponse } from "@/foundation/fava";
import type { LedgerPublic } from "@/foundation/fava/Api";
import { config } from "@/config/config";
import { logger } from "@/shared/logger";
import { systemIdentity } from "@/server/api/identity";
import { AuthorizationService } from "@/server/api/authorization";

/**
 * ONE-TIME offline script (h2-plan.md item 3 — free-tier transaction limit).
 *
 * Walks every user with `lastSeenAt IS NOT NULL` (deliberately no time window,
 * no free/paid filter, no isBlocked filter — confirmed scope), lists each
 * user's OWNED ledgers, and sums directive counts per ledger (not broken down
 * by type) via the beancount_ledger `entries_count_per_type` endpoint.
 *
 * Every ledger fetch there does a full `git clone` + beancount parse (no
 * cheaper "just count" endpoint exists) with only a 50-slot in-process LRU
 * cache — so this script deliberately keeps concurrency low (default 3),
 * processes a user's own ledgers sequentially, skips empty ledgers entirely,
 * and treats every user/ledger failure as skip-and-continue rather than
 * aborting the run.
 *
 * Output (raw per-ledger rows + summaries, includes user emails) is written
 * under the gitignored `tmp/` directory, not next to this script — this file
 * lives in `scripts/` so it's typechecked/linted like the rest of the repo,
 * but its output must never end up committed.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register --transpile-only ./scripts/collect-directive-counts.ts --dry-run
 *   npx ts-node -r tsconfig-paths/register --transpile-only ./scripts/collect-directive-counts.ts --limit=50 --concurrency=3
 *   npx ts-node -r tsconfig-paths/register --transpile-only ./scripts/collect-directive-counts.ts
 *   npx ts-node -r tsconfig-paths/register --transpile-only ./scripts/collect-directive-counts.ts --recompute-from=./tmp/directive-count-stats/output/<run-id>/raw-ledgers.jsonl
 */

const POSTGRES_URI =
  process.env.POSTGRES_BACKEND_URI ||
  "postgresql://localhost:5432/beancount";
const USER_PAGE_SIZE = 50;
const LEDGER_PAGE_SIZE = 50;
const PROGRESS_EVERY = 50;
// Output (contains user emails) always goes under the gitignored tmp/ dir,
// regardless of this script's own location — never write it into scripts/.
const OUTPUT_ROOT = path.join(
  __dirname,
  "..",
  "tmp",
  "directive-count-stats",
  "output",
);

const scriptLogger = logger.child({ module: "DirectiveCountStats" });

interface EverSeenUser {
  id: string;
  email: string;
  ledgerUsername: string;
  lastSeenAt: Date;
}

type RawLedgerStatus = "ok" | "skipped_empty" | "error" | "user_error";

interface RawLedgerRow {
  userId: string;
  userEmail: string;
  ledgerUsername: string;
  ledgerId: string;
  empty: boolean;
  directiveCount: number | null;
  status: RawLedgerStatus;
  error?: string;
}

interface UserSummaryRow {
  userId: string;
  userEmail: string;
  ledgerUsername: string;
  lastSeenAt: string;
  ledgerCount: number;
  totalDirectiveCount: number;
  hadErrors: boolean;
  userError: boolean;
}

interface ScriptArgs {
  limit?: number;
  concurrency: number;
  recomputeFrom?: string;
}

function parseArgs(argv: string[]): ScriptArgs {
  const out: ScriptArgs = { concurrency: 3 };
  for (const arg of argv) {
    if (arg === "--dry-run") {
      out.limit = out.limit ?? 10;
    } else if (arg.startsWith("--limit=")) {
      out.limit = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--concurrency=")) {
      out.concurrency = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--recompute-from=")) {
      out.recomputeFrom = arg.split("=")[1];
    }
  }
  return out;
}

// Bounded-concurrency map: exactly `concurrency` lanes pull work off a shared
// cursor, so total in-flight calls never exceeds `concurrency` regardless of
// how many items are queued. Deliberately hand-rolled instead of pulling in
// the (ESM-only, awkward under this repo's commonjs ts-node setup) p-limit
// dependency that's already in package.json but unused elsewhere.
async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function runLane(): Promise<void> {
    for (;;) {
      const i = cursor;
      cursor += 1;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  }
  const lanes = Array.from(
    { length: Math.min(concurrency, items.length) },
    runLane,
  );
  await Promise.all(lanes);
  return results;
}

async function countEverSeenUsers(db: DbExecutor): Promise<number> {
  const result = await db
    .select({ total: sql<number>`cast(count(*) as integer)` })
    .from(users)
    .where(isNotNull(users.lastSeenAt));
  return result[0]?.total ?? 0;
}

// Deliberately NOT filtering isBlocked — confirmed scope is "every user ever
// seen", full stop, not the codebase's other narrower "active user" queries.
async function fetchEverSeenUsersPage(
  db: DbExecutor,
  offset: number,
  limit: number,
): Promise<EverSeenUser[]> {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      ledgerUsername: users.ledger_username,
      lastSeenAt: users.lastSeenAt,
    })
    .from(users)
    .where(isNotNull(users.lastSeenAt))
    .orderBy(asc(users.id))
    .limit(limit)
    .offset(offset);
  return rows.map((r) => ({ ...r, lastSeenAt: r.lastSeenAt as Date }));
}

// Cheap: Gitea repo metadata only, no beancount parse. Mirrors
// LedgerWorkflow.listUserOwnedLedgers (src/features/ledger/workflow/ledger-workflow.ts).
// Owned ledgers only — collaborator ledgers are intentionally excluded to
// avoid double-counting a shared ledger under multiple users.
async function listOwnedLedgers(
  favaClientFactory: FavaClientFactory,
  userId: string,
): Promise<{ ledgers: LedgerPublic[]; ledgerUsername: string }> {
  const { favaApiClient, favaUser } =
    await favaClientFactory.getApiContext(userId);
  const ledgers: LedgerPublic[] = [];
  let page = 1;
  for (;;) {
    const data = await unwrapFavaResponse(
      favaApiClient.ledgers.listUserLedgers(favaUser.username, {
        page,
        limit: LEDGER_PAGE_SIZE,
      }),
      `list ledgers for ${favaUser.username}`,
    );
    ledgers.push(...data);
    if (data.length < LEDGER_PAGE_SIZE) break;
    page += 1;
  }
  return { ledgers, ledgerUsername: favaUser.username };
}

function writeRawRow(rawStream: fs.WriteStream, row: RawLedgerRow): void {
  rawStream.write(JSON.stringify(row) + "\n");
}

async function processUser(
  user: EverSeenUser,
  ctx: {
    favaClientFactory: FavaClientFactory;
    ledgerDataService: LedgerDataService;
    rawStream: fs.WriteStream;
  },
): Promise<UserSummaryRow> {
  const base = {
    userId: user.id,
    userEmail: user.email,
    ledgerUsername: user.ledgerUsername,
    lastSeenAt: user.lastSeenAt.toISOString(),
  };

  let ledgers: LedgerPublic[];
  try {
    ({ ledgers } = await listOwnedLedgers(ctx.favaClientFactory, user.id));
  } catch (err) {
    scriptLogger.error("Failed to list ledgers for user", {
      userId: user.id,
      error: err,
    });
    writeRawRow(ctx.rawStream, {
      userId: user.id,
      userEmail: user.email,
      ledgerUsername: user.ledgerUsername,
      ledgerId: "",
      empty: false,
      directiveCount: null,
      status: "user_error",
      error: err instanceof Error ? err.message : String(err),
    });
    return {
      ...base,
      ledgerCount: 0,
      totalDirectiveCount: 0,
      hadErrors: true,
      userError: true,
    };
  }

  let total = 0;
  let hadErrors = false;

  // Sequential per user — concurrency is bounded at the user level by the
  // caller, so this keeps total in-flight entries_count_per_type calls
  // exactly == concurrency, regardless of how many ledgers a user owns.
  for (const ledger of ledgers) {
    if (ledger.empty) {
      writeRawRow(ctx.rawStream, {
        userId: user.id,
        userEmail: user.email,
        ledgerUsername: user.ledgerUsername,
        ledgerId: ledger.full_name,
        empty: true,
        directiveCount: 0,
        status: "skipped_empty",
      });
      continue;
    }
    try {
      // An offline sweep has no caller; the subject is whichever user this
      // row is about.
      const counts = await ctx.ledgerDataService.getEntriesCountPerType({
        ledgerId: ledger.full_name,
        identity: systemIdentity(user.id),
      });
      const sum = counts.reduce((acc, c) => acc + c.number, 0);
      total += sum;
      writeRawRow(ctx.rawStream, {
        userId: user.id,
        userEmail: user.email,
        ledgerUsername: user.ledgerUsername,
        ledgerId: ledger.full_name,
        empty: false,
        directiveCount: sum,
        status: "ok",
      });
    } catch (err) {
      hadErrors = true;
      scriptLogger.error("Failed to get entries count for ledger", {
        userId: user.id,
        ledgerId: ledger.full_name,
        error: err,
      });
      writeRawRow(ctx.rawStream, {
        userId: user.id,
        userEmail: user.email,
        ledgerUsername: user.ledgerUsername,
        ledgerId: ledger.full_name,
        empty: false,
        directiveCount: null,
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    ...base,
    ledgerCount: ledgers.length,
    totalDirectiveCount: total,
    hadErrors,
    userError: false,
  };
}

function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const idx = Math.min(
    sortedAsc.length - 1,
    Math.max(0, Math.ceil((p / 100) * sortedAsc.length) - 1),
  );
  return sortedAsc[idx];
}

interface Distribution {
  count: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
}

function summarizeDistribution(values: number[]): Distribution {
  if (values.length === 0) {
    return {
      count: 0,
      min: 0,
      max: 0,
      mean: 0,
      median: 0,
      p75: 0,
      p90: 0,
      p95: 0,
      p99: 0,
    };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  return {
    count: sorted.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: sum / sorted.length,
    median: percentile(sorted, 50),
    p75: percentile(sorted, 75),
    p90: percentile(sorted, 90),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
  };
}

// Stats are always recomputed by reading the flushed JSONL file back, rather
// than accumulated in memory during collection — this way a live run and a
// `--recompute-from` run share the exact same aggregation logic.
async function computePerLedgerCountsFromRawFile(
  filePath: string,
): Promise<number[]> {
  const counts: number[] = [];
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath),
  });
  for await (const line of rl) {
    if (!line.trim()) continue;
    const row: RawLedgerRow = JSON.parse(line);
    if (row.status === "ok" || row.status === "skipped_empty") {
      counts.push(row.directiveCount ?? 0);
    }
  }
  return counts;
}

async function computeUserSumsFromRawFile(
  filePath: string,
): Promise<Map<string, { sum: number; ledgerCount: number }>> {
  const byUser = new Map<string, { sum: number; ledgerCount: number }>();
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath),
  });
  for await (const line of rl) {
    if (!line.trim()) continue;
    const row: RawLedgerRow = JSON.parse(line);
    if (row.status !== "ok" && row.status !== "skipped_empty") continue;
    const entry = byUser.get(row.userId) ?? { sum: 0, ledgerCount: 0 };
    entry.sum += row.directiveCount ?? 0;
    entry.ledgerCount += 1;
    byUser.set(row.userId, entry);
  }
  return byUser;
}

interface Summary {
  generatedAt: string;
  totalUsersConsidered: number;
  totalUsersFailed: number;
  usersWithZeroLedgers: number;
  perLedger: Distribution;
  perUserAll: Distribution;
  perUserExcludingZeroLedgerUsers: Distribution;
}

function buildSummary(
  userSummaries: UserSummaryRow[],
  perLedgerCounts: number[],
  extra: { totalUsersFailed: number },
): Summary {
  const userSums = userSummaries.map((u) => u.totalDirectiveCount);
  const nonZeroUserSums = userSummaries
    .filter((u) => u.ledgerCount > 0)
    .map((u) => u.totalDirectiveCount);
  return {
    generatedAt: new Date().toISOString(),
    totalUsersConsidered: userSummaries.length,
    totalUsersFailed: extra.totalUsersFailed,
    usersWithZeroLedgers: userSummaries.filter((u) => u.ledgerCount === 0)
      .length,
    perLedger: summarizeDistribution(perLedgerCounts),
    perUserAll: summarizeDistribution(userSums),
    perUserExcludingZeroLedgerUsers: summarizeDistribution(nonZeroUserSums),
  };
}

function printSummaryTable(summary: Summary): void {
  console.log(
    `\nUsers considered: ${summary.totalUsersConsidered} (failed: ${summary.totalUsersFailed}, zero-ledger: ${summary.usersWithZeroLedgers})\n`,
  );
  console.table({
    perLedger: summary.perLedger,
    perUserAll: summary.perUserAll,
    perUserExcludingZero: summary.perUserExcludingZeroLedgerUsers,
  });
}

async function runRecomputeOnly(rawPath: string): Promise<void> {
  const perLedgerCounts = await computePerLedgerCountsFromRawFile(rawPath);
  const byUser = await computeUserSumsFromRawFile(rawPath);
  const userSummaries: UserSummaryRow[] = Array.from(byUser.entries()).map(
    ([userId, v]) => ({
      userId,
      userEmail: "",
      ledgerUsername: "",
      lastSeenAt: "",
      ledgerCount: v.ledgerCount,
      totalDirectiveCount: v.sum,
      hadErrors: false,
      userError: false,
    }),
  );
  const summary = buildSummary(userSummaries, perLedgerCounts, {
    totalUsersFailed: 0,
  });
  printSummaryTable(summary);
  const outPath = rawPath.replace(
    /raw-ledgers\.jsonl$/,
    "stats-summary.recomputed.json",
  );
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2));
  console.log(`Recomputed summary written to: ${outPath}`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.recomputeFrom) {
    await runRecomputeOnly(args.recomputeFrom);
    return;
  }

  console.log("=== Directive Count Stats ===");
  console.log(`PostgreSQL URI: ${POSTGRES_URI}`);
  console.log(`Fava API URL: ${config.favaApi.baseUrl}`);
  console.log(`Concurrency: ${args.concurrency}`);
  if (args.limit) console.log(`Limit: first ${args.limit} users (id-ordered)`);
  console.log("");

  const db = await createDatabaseConnection(POSTGRES_URI);
  const models = { user: new UserPostgresModel() };
  const favaClientFactory = new FavaClientFactory(models, db, config);
  const ledgerDataService = new LedgerDataService(
    favaClientFactory,
    new AuthorizationService({ check: async () => true }),
  );

  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = path.join(OUTPUT_ROOT, runId);
  fs.mkdirSync(outDir, { recursive: true });
  const rawPath = path.join(outDir, "raw-ledgers.jsonl");
  const rawStream = fs.createWriteStream(rawPath, { flags: "a" });

  const totalEverSeen = await countEverSeenUsers(db);
  console.log(`Ever-seen users (lastSeenAt IS NOT NULL): ${totalEverSeen}`);

  const userSummaries: UserSummaryRow[] = [];
  let offset = 0;
  let processed = 0;
  let failedUsers = 0;
  const startedAt = Date.now();

  try {
    for (;;) {
      const remaining =
        args.limit !== undefined ? args.limit - processed : undefined;
      if (remaining !== undefined && remaining <= 0) break;
      const pageSize =
        remaining !== undefined
          ? Math.min(USER_PAGE_SIZE, remaining)
          : USER_PAGE_SIZE;

      const page = await fetchEverSeenUsersPage(db, offset, pageSize);
      if (page.length === 0) break;

      const results = await mapWithConcurrency(page, args.concurrency, (u) =>
        processUser(u, { favaClientFactory, ledgerDataService, rawStream }),
      );
      for (const r of results) {
        userSummaries.push(r);
        if (r.hadErrors) failedUsers += 1;
      }
      processed += page.length;
      offset += page.length;

      if (processed % PROGRESS_EVERY === 0 || page.length < pageSize) {
        const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1);
        scriptLogger.info("Progress", {
          processed,
          totalEverSeen,
          failedUsers,
          elapsedSec,
        });
      }
      if (page.length < pageSize) break;
    }
  } finally {
    await new Promise<void>((resolve) => rawStream.end(() => resolve()));
  }

  fs.writeFileSync(
    path.join(outDir, "user-summary.jsonl"),
    userSummaries.map((u) => JSON.stringify(u)).join("\n") + "\n",
  );

  const perLedgerCounts = await computePerLedgerCountsFromRawFile(rawPath);
  const summary = buildSummary(userSummaries, perLedgerCounts, {
    totalUsersFailed: failedUsers,
  });
  fs.writeFileSync(
    path.join(outDir, "stats-summary.json"),
    JSON.stringify(summary, null, 2),
  );
  printSummaryTable(summary);

  console.log(`\nOutput written to: ${outDir}`);
}

main()
  .catch((error) => {
    console.error("Script failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabaseConnection();
  });
