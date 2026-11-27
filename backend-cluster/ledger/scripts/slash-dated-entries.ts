/**
 * Entries dated `2026/08/30` or `2026-8-30` on the live engine, through the
 * real journal service over an in-memory repository that commits (w31/106).
 * Beancount's lexer reads both as dates and the engine loads them, but the
 * source slicer knew only `YYYY-MM-DD`: the journal listed such an entry with
 * `source: null`, and reading, editing, deleting or moving it by the hash the
 * journal had just returned answered NOT_FOUND on every surface. A ledger
 * converted from ledger-cli, which writes `2026/08/30`, was all like that.
 *
 * Run by `verify-rustledger.ts` (live engine; not a jest test).
 */
import { LedgerJournalService } from "@/features/ledger/service/ledger-journal-service";
import { sliceSha256 } from "@/foundation/rustledger";
import { committingRepo } from "./entry-move";

const BALANCE = "2026-08-29 balance Assets:Cash  49.75 USD";
const entry = (date: string, narration: string) =>
  [
    `${date} * "qa" "${narration}"`,
    "  Assets:Cash                 -1.00 USD",
    "  Expenses:Food:Coffee         1.00 USD",
  ].join("\n");
const SLASHED = entry("2026/08/30", "slash-dated probe");
const UNPADDED = entry("2026-8-30", "unpadded probe");

function fail(message: string): never {
  throw new Error(`slash-dated entries: ${message}`);
}

type SourcedRow = {
  entry_hash: string;
  date: string;
  narration?: string;
  source?: { path: string; lineno: number; sha256sum: string } | null;
};

export async function verifySlashDatedEntries(): Promise<void> {
  const files: Record<string, string> = {
    "main.bean": [
      "2026/01/01 open Assets:Cash USD",
      "2026-1-1 open Expenses:Food:Coffee USD",
      "2026-01-01 open Equity:Opening USD",
      "",
      '2026-08-01 * "Opening"',
      "  Assets:Cash  49.75 USD",
      "  Equity:Opening",
      "",
      BALANCE,
      "",
      SLASHED,
      "",
      UNPADDED,
      "",
    ].join("\n"),
  };
  const { factory, commits } = committingRepo(files);
  const journal = new LedgerJournalService(factory as never, {} as never);
  const params = { ledgerId: "synthetic/slash-dates", userId: "usr_1" };

  const readRows = async () =>
    (
      await journal.getJournal({
        ...params,
        userId: undefined,
        query: { includeSource: true, limit: 100 },
      })
    ).data as unknown as SourcedRow[];
  const rows = await readRows();
  const row = (narration: string) => {
    const found = rows.find((item) => item.narration === narration);
    if (!found) fail(`the journal has no "${narration}"`);
    return found;
  };

  for (const [narration, text, lineno] of [
    ["slash-dated probe", SLASHED, 11],
    ["unpadded probe", UNPADDED, 15],
  ] as const) {
    const { entry_hash: entryHash, date, source } = row(narration);
    if (date !== "2026-08-30") fail(`${narration} is dated ${date}`);
    if (
      source?.path !== "main.bean" ||
      source.lineno !== lineno ||
      source.sha256sum !== sliceSha256(text)
    ) {
      fail(`${narration} has source ${JSON.stringify(source)}`);
    }
    const context = await journal.getContext({
      ...params,
      userId: undefined,
      entryHash,
    });
    if (context.slice !== text || context.sha256sum !== sliceSha256(text)) {
      fail(`the context of ${narration} is ${JSON.stringify(context.slice)}`);
    }
    const preview = await journal.deleteSourceSlice({
      ...params,
      entryHash,
      sha256sum: source.sha256sum,
      dryRun: true,
    });
    if (
      commits.length !== 0 ||
      preview.preview[0]?.text !== text ||
      preview.validation.newErrors.length !== 0
    ) {
      fail(`the delete preview of ${narration} is ${JSON.stringify(preview)}`);
    }
  }
  console.log(
    "✓ a slash-dated or unpadded entry has a source, a context and a delete preview by the journal's hash (w31/106)",
  );

  // Every editor starts from the served slice. Sent back as served it writes
  // nothing; an edit that keeps the spelling is told the rewrite (w31/110).
  for (const [narration, text, written] of [
    ["slash-dated probe", SLASHED, "2026/08/30"],
    ["unpadded probe", UNPADDED, "2026-8-30"],
  ] as const) {
    const { entry_hash: entryHash, source } = row(narration);
    const same = await journal.updateSourceSlice({
      ...params,
      entryHash,
      sha256sum: source!.sha256sum,
      newContent: text,
    });
    if (!same.unchanged || commits.length !== 0) {
      fail(`${narration} resent as served is ${JSON.stringify(same)}`);
    }
    const refusal = await journal
      .updateSourceSlice({
        ...params,
        entryHash,
        sha256sum: source!.sha256sum,
        newContent: text.replace(narration, `${narration} edited`),
      })
      .then(
        () => undefined,
        (error: unknown) => error,
      );
    const expected = `newContent dates its entry ${written}; an entry edit takes YYYY-MM-DD: write ${written} as 2026-08-30`;
    if (
      !(refusal instanceof Error) ||
      refusal.message !== expected ||
      commits.length !== 0
    ) {
      fail(`${narration} edited as written answered ${String(refusal)}`);
    }
  }
  console.log(
    "✓ a slash-dated or unpadded entry resent as served is unchanged, and an edit that keeps the spelling names the rewrite (w31/110)",
  );

  // An edit may write the dash spelling; the entry is the same one.
  const unpadded = row("unpadded probe");
  const dashed = UNPADDED.replace("2026-8-30", "2026-08-30");
  await journal.updateSourceSlice({
    ...params,
    entryHash: unpadded.entry_hash,
    sha256sum: unpadded.source!.sha256sum,
    newContent: dashed,
  });
  const slashed = row("slash-dated probe");
  await journal.deleteSourceSlice({
    ...params,
    entryHash: slashed.entry_hash,
    sha256sum: slashed.source!.sha256sum,
  });
  if (commits.length !== 2) fail(`expected two commits, got ${commits.length}`);
  if (files["main.bean"].includes("2026/08/30"))
    fail(`the slash-dated entry is still there:\n${files["main.bean"]}`);
  if (
    !files["main.bean"].includes(dashed) ||
    files["main.bean"].includes("2026-8-30")
  )
    fail(`the edit was not written:\n${files["main.bean"]}`);
  const after = await readRows();
  if (after.some((item) => item.narration === "slash-dated probe"))
    fail("the journal still lists the deleted entry");
  if (
    after.find((item) => item.narration === "unpadded probe")?.source
      ?.sha256sum !== sliceSha256(dashed)
  )
    fail("the edited entry's source is not its new text");
  console.log(
    "✓ a slash-dated entry deletes and an unpadded one edits by hash, one commit each (w31/106)",
  );
}
