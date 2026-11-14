/**
 * Moving entries into a new file on the live engine, through the real journal
 * service over an in-memory repository that commits (w1/m45). Three August
 * transactions — two in `main.bean`, one in an included `imports.bean` — that
 * a September `balance` assertion depends on move to `2026/08.bean`, with
 * `main.bean` gaining its include in the same commit. The preview reports no
 * new error; the commit is exactly one; afterwards the ledger's errors and
 * every account balance are what they were, the entries' text is byte for
 * byte in the target, and `main.bean` includes it once. A stale checksum for
 * any listed entry refuses the whole move.
 *
 * Run by `verify-rustledger.ts` (live engine; not a jest test).
 */
import { createHash } from "node:crypto";
import { LedgerJournalService } from "@/features/ledger/service/ledger-journal-service";
import {
  accountHierarchy,
  buildPriceMap,
  parseLedgerFiles,
} from "@/foundation/rustledger";

const TEA = '2026-08-04 * "Tea"\n  Expenses:Food  4.00 USD\n  Assets:Cash';
const CAKE = '2026-08-09 * "Cake"\n  Expenses:Food  6.50 USD\n  Assets:Cash';
const LUNCH = '2026-08-20 * "Lunch"\n  Expenses:Food  12.25 USD\n  Assets:Cash';

function fail(message: string): never {
  throw new Error(`entry move: ${message}`);
}

/** A repository the loader reads and `commitLedgerFiles` writes, one commit per change. */
function committingRepo(files: Record<string, string>) {
  const commits: string[][] = [];
  const blob = (text: string) =>
    createHash("sha1").update(text).digest("hex");
  const factory = {
    getPublicApiClient: async () => ({
      repos: {
        repoGetAllCommits: async () => ({ data: [] }),
        getTree: async () => ({
          data: {
            tree: Object.keys(files).map((path) => ({ path, type: "blob" })),
            truncated: false,
          },
        }),
        repoGetContents: async (_owner: string, _repo: string, path: string) => {
          const text = files[decodeURIComponent(path)];
          if (text === undefined) throw { status: 404, error: "Not Found" };
          return {
            data: {
              type: "file",
              encoding: "base64",
              content: Buffer.from(text).toString("base64"),
              sha: blob(text),
            },
          };
        },
        repoChangeFiles: async (
          _owner: string,
          _repo: string,
          body: {
            files: { operation: string; path: string; content?: string }[];
          },
        ) => {
          for (const op of body.files) {
            if (op.operation === "delete") delete files[op.path];
            else files[op.path] = Buffer.from(op.content ?? "", "base64").toString();
          }
          commits.push(body.files.map((op) => op.path));
          return { data: { commit: { sha: `c${commits.length}` } } };
        },
      },
    }),
  };
  return { factory, commits };
}

/** A journal row as `includeSource` returns it (w1/m44). */
type SourcedRow = {
  entry_hash: string;
  narration?: string;
  source?: { sha256sum: string } | null;
};

/** The ledger's errors and the balance of every root, as the engine reads them. */
async function ledgerState(files: Record<string, string>) {
  const snapshot = await parseLedgerFiles({ ...files }, "main.bean");
  const prices = buildPriceMap(snapshot.directives);
  const balances = Object.fromEntries(
    ["Assets", "Expenses", "Equity"].map((root) => [
      root,
      accountHierarchy(snapshot.directives, root, "USD", prices)
        .balance_children,
    ]),
  );
  return {
    errors: snapshot.errors.map((error) => error.message).sort(),
    balances,
  };
}

export async function verifyEntryMove(): Promise<void> {
  const files: Record<string, string> = {
    "main.bean": [
      'option "operating_currency" "USD"',
      'include "accounts.bean"',
      'include "imports.bean"',
      "",
      '2026-07-31 * "Opening"',
      "  Assets:Cash  100.00 USD",
      "  Equity:Opening",
      "",
      TEA,
      "",
      CAKE,
      "",
      "2026-09-01 balance Assets:Cash  77.25 USD",
      "",
    ].join("\n"),
    "accounts.bean": [
      "2026-01-01 open Assets:Cash USD",
      "2026-01-01 open Expenses:Food USD",
      "2026-01-01 open Equity:Opening USD",
      "",
    ].join("\n"),
    "imports.bean": `${LUNCH}\n`,
  };
  const { factory, commits } = committingRepo(files);
  // Read through a function: the checks below must see each new commit.
  const commitCount = () => commits.length;
  const journal = new LedgerJournalService(factory as never, {} as never);
  const params = { ledgerId: "synthetic/entry-move", userId: "usr_1" };

  const before = await ledgerState(files);
  if (before.errors.length > 0)
    fail(`the fixture has errors: ${JSON.stringify(before.errors)}`);

  // Each entry's hash and checksum, from one journal page with source (m44).
  const { data } = await journal.getJournal({
    ...params,
    userId: undefined,
    query: { includeSource: true },
  });
  const rows = data as unknown as SourcedRow[];
  const pick = (narration: string) => {
    const row = rows.find((item) => item.narration === narration);
    if (!row?.source) fail(`no source for ${narration}`);
    return { entryHash: row.entry_hash, sha256sum: row.source.sha256sum };
  };
  const entries = [pick("Tea"), pick("Cake"), pick("Lunch")];
  const move = { ...params, entries, toPath: "2026/08.bean", includeFrom: "main.bean" };

  const preview = await journal.moveSourceSlices({ ...move, dryRun: true });
  if (commitCount() !== 0) fail("the preview committed");
  if (preview.validation.newErrors.length !== 0 || preview.commit)
    fail(`the preview is not clean: ${JSON.stringify(preview.validation)}`);
  if (preview.preview.length !== 3 || !preview.includeAdded)
    fail(`the preview names ${preview.preview.length} entries`);

  const result = await journal.moveSourceSlices(move);
  if (commitCount() !== 1 || result.commit !== "c1")
    fail(`expected one commit, got ${JSON.stringify(commits)}`);
  if (
    JSON.stringify([...commits[0]].sort()) !==
    JSON.stringify(["2026/08.bean", "imports.bean", "main.bean"])
  )
    fail(`the commit wrote ${JSON.stringify(commits[0])}`);
  // Ledger order: by file path, then line.
  if (files["2026/08.bean"] !== `${LUNCH}\n\n${TEA}\n\n${CAKE}\n`)
    fail(`the target holds:\n${files["2026/08.bean"]}`);
  if (files["main.bean"].split('include "2026/08.bean"').length !== 2)
    fail(`main.bean does not include the target once:\n${files["main.bean"]}`);
  if (["Tea", "Cake"].some((name) => files["main.bean"].includes(name)))
    fail("an entry is still in main.bean");
  if (files["imports.bean"].includes("Lunch"))
    fail("Lunch is still in imports.bean");

  const after = await ledgerState(files);
  if (JSON.stringify(after) !== JSON.stringify(before))
    fail(
      `the ledger changed: ${JSON.stringify(before)} -> ${JSON.stringify(after)}`,
    );

  // A stale checksum for one listed entry refuses the whole move.
  files["main.bean"] = `${files["main.bean"]}\n${TEA.replace("Tea", "Tea again")}\n`;
  const { data: again } = await journal.getJournal({
    ...params,
    userId: undefined,
    query: { includeSource: true },
  });
  const fresh = (again as unknown as SourcedRow[]).find(
    (item) => item.narration === "Tea again",
  );
  if (!fresh?.source) fail("no source for the second Tea");
  const refused = await journal
    .moveSourceSlices({
      ...params,
      entries: [
        { entryHash: fresh.entry_hash, sha256sum: fresh.source.sha256sum },
        { entryHash: entries[0].entryHash, sha256sum: "0".repeat(64) },
      ],
      toPath: "2026/08.bean",
    })
    .then(
      () => null,
      (error: Error) => error,
    );
  if (!refused || commitCount() !== 1)
    fail("a stale checksum did not refuse the whole move");

  console.log(
    "✓ moving entries a balance assertion depends on into a new, included file keeps errors and balances, in one commit (w1/m45)",
  );
}
