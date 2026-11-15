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

/** A journal row's identity and what its scope gave it. */
type ScopedRow = SourcedRow & {
  type: string;
  payee?: string;
  comment?: string;
  tags?: string[];
  meta?: Record<string, unknown> | null;
};

/**
 * Moving entries out of a `pushtag`/`pushmeta` scope (w31/016): the push
 * statements stay behind, so the move writes the scope onto each entry. On the
 * live engine, every moved entry keeps its tags, its pushed metadata and its
 * hash; `getContext` resolves each reported hash in the target; an unscoped
 * entry's text is byte for byte; and the ledger's errors and balances are
 * what they were.
 */
export async function verifyScopedEntryMove(): Promise<void> {
  const tagged =
    '2026-09-02 * "PAYEE-A" "tagged by the scope"\n  Expenses:Food   3.00 USD\n  Assets:Cash';
  const inline =
    '2026-09-03 * "PAYEE-B" "inline tag" #qa-inline\n  Expenses:Food   4.00 USD\n  Assets:Cash';
  const withMeta =
    '2026-09-04 * "PAYEE-C" "meta from the scope"\n  Expenses:Food   5.00 USD\n  Assets:Cash';
  const files: Record<string, string> = {
    "main.bean": [
      'option "operating_currency" "USD"',
      "2026-01-01 open Assets:Cash USD",
      "2026-01-01 open Expenses:Food USD",
      "",
      "pushtag #qa-trip",
      tagged,
      '2026-09-02 note Assets:Cash "counted the float"',
      "poptag #qa-trip",
      "",
      inline,
      "",
      'pushmeta qa-meta: "pm"',
      withMeta,
      "popmeta qa-meta:",
      "",
    ].join("\n"),
  };
  const { factory, commits } = committingRepo(files);
  const journal = new LedgerJournalService(factory as never, {} as never);
  const params = { ledgerId: "synthetic/scoped-move", userId: "usr_1" };
  const rows = async (filter?: string) =>
    (
      await journal.getJournal({
        ...params,
        userId: undefined,
        query: { includeSource: true, filter },
      })
    ).data as unknown as ScopedRow[];
  // A note's journal row carries no tags; the tag filter reads them (w21/655).
  const tripHashes = async () =>
    (await rows("#qa-trip")).map((row) => row.entry_hash).sort();
  const find = (list: ScopedRow[], label: string) => {
    const row = list.find(
      (item) => item.payee === label || item.comment === label,
    );
    if (!row?.source) fail(`no source for ${label}`);
    return row;
  };
  const labels = ["PAYEE-A", "counted the float", "PAYEE-B", "PAYEE-C"];
  const shape = (row: ScopedRow) => ({
    hash: row.entry_hash,
    tags: [...(row.tags ?? [])].sort(),
    meta: row.meta?.["qa-meta"] ?? null,
  });

  const before = await ledgerState(files);
  if (before.errors.length > 0)
    fail(`the scoped fixture has errors: ${JSON.stringify(before.errors)}`);
  const listed = await rows();
  const was = labels.map((label) => shape(find(listed, label)));
  const trip = await tripHashes();
  if (
    JSON.stringify(was.map(({ tags, meta }) => [tags, meta])) !==
      JSON.stringify([
        [["qa-trip"], null],
        [[], null],
        [["qa-inline"], null],
        [[], "pm"],
      ]) ||
    JSON.stringify(trip) !==
      JSON.stringify([was[0].hash, was[1].hash].sort())
  )
    fail(`the fixture reads ${JSON.stringify({ was, trip })}`);
  const entries = labels.map((label) => {
    const { entry_hash, source } = find(listed, label);
    return { entryHash: entry_hash, sha256sum: source!.sha256sum };
  });
  const move = { ...params, entries, toPath: "moved.bean", includeFrom: "main.bean" };

  const preview = await journal.moveSourceSlices({ ...move, dryRun: true });
  const written = [
    '2026-09-02 * "PAYEE-A" "tagged by the scope" #qa-trip\n  Expenses:Food   3.00 USD\n  Assets:Cash',
    '2026-09-02 note Assets:Cash "counted the float" #qa-trip',
    inline,
    '2026-09-04 * "PAYEE-C" "meta from the scope"\n  qa-meta: "pm"\n  Expenses:Food   5.00 USD\n  Assets:Cash',
  ];
  if (
    JSON.stringify(preview.preview.map(({ text }) => text)) !==
    JSON.stringify(written)
  )
    fail(`the preview shows ${JSON.stringify(preview.preview)}`);
  if (preview.validation.newErrors.length !== 0 || commits.length !== 0)
    fail(`the preview is not clean: ${JSON.stringify(preview.validation)}`);

  const result = await journal.moveSourceSlices(move);
  if (files["moved.bean"] !== `${written.join("\n\n")}\n`)
    fail(`the target holds:\n${files["moved.bean"]}`);
  if (files["main.bean"].includes("PAYEE-"))
    fail(`an entry is still in main.bean:\n${files["main.bean"]}`);
  const now = await rows();
  const is = labels.map((label) => shape(find(now, label)));
  if (JSON.stringify(is) !== JSON.stringify(was))
    fail(
      `a moved entry changed: ${JSON.stringify(was)} -> ${JSON.stringify(is)}`,
    );
  if (JSON.stringify(await tripHashes()) !== JSON.stringify(trip))
    fail(`#qa-trip now lists ${JSON.stringify(await tripHashes())}`);
  if (
    JSON.stringify(result.movedHashes) !==
    JSON.stringify(was.map(({ hash }) => hash))
  )
    fail(`movedHashes ${JSON.stringify(result.movedHashes)}`);
  for (const hash of result.movedHashes) {
    const context = await journal.getContext({
      ...params,
      userId: undefined,
      entryHash: hash,
    });
    if (!files["moved.bean"].includes(context.slice))
      fail(`${hash} resolves outside moved.bean: ${context.slice}`);
  }
  const after = await ledgerState(files);
  if (JSON.stringify(after) !== JSON.stringify(before))
    fail(
      `the ledger changed: ${JSON.stringify(before)} -> ${JSON.stringify(after)}`,
    );

  console.log(
    "✓ entries moved out of a pushtag/pushmeta scope keep its tags, metadata and their hashes; an unscoped one moves byte for byte (w31/016)",
  );
}
