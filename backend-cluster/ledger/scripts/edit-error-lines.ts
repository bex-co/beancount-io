/**
 * Where an edit's new error is reported, on the live engine through the real
 * journal service (w31/116). Making the FARMERS MARKET entry one posting
 * longer breaks the balance assertion below it. The engine reads the edited
 * text, where the assertion sits one line lower, and the preview and the
 * refusal named that line. Neither commits, so both now name the line in the
 * file as it stands, as an add names it. A forced edit names the line the
 * assertion has once the edit lands.
 *
 * backend-v2's `updateLedgerFiles` maps an exact-text edit's errors back the
 * same way (w31/118), from the projected check this package answers. The
 * packages share no code, so that mapping is tested there; the premise it
 * maps from, that the check names an error at its line in the edited text, is
 * checked here.
 *
 * Run by `verify-rustledger.ts` (live engine; not a jest test).
 */
import { LedgerDataService } from "@/features/ledger/service/ledger-data-service";
import { LedgerJournalService } from "@/features/ledger/service/ledger-journal-service";
import { committingRepo } from "./entry-move";

const BALANCE = "2026-08-29 balance Assets:Cash 49.75 USD";
const FARMERS = [
  '2026-08-28 * "FARMERS MARKET"',
  "  Assets:Cash  -23.50 USD",
  "  Expenses:Food:Groceries  23.50 USD",
].join("\n");
const LONGER = [
  '2026-08-28 * "FARMERS MARKET"',
  "  Assets:Cash  -24.50 USD",
  "  Expenses:Food:Groceries  23.50 USD",
  "  Expenses:Food:Coffee  1.00 USD",
].join("\n");
const MAIN = [
  "2026-01-01 open Assets:Cash USD",
  "2026-01-01 open Equity:Opening USD",
  "2026-01-01 open Expenses:Food:Groceries USD",
  "2026-01-01 open Expenses:Food:Coffee USD",
  "",
  '2026-08-01 * "Opening"',
  "  Assets:Cash  73.25 USD",
  "  Equity:Opening",
  "",
  FARMERS,
  "",
  BALANCE,
  "",
].join("\n");

function fail(message: string): never {
  throw new Error(`edit error lines: ${message}`);
}

export async function verifyEditErrorLines(): Promise<void> {
  const files: Record<string, string> = { "main.bean": MAIN };
  const { factory, commits } = committingRepo(files);
  const journal = new LedgerJournalService(factory as never, {} as never);
  const params = { ledgerId: "synthetic/edit-lines", userId: "usr_1" };
  const { data } = await journal.getJournal({
    ...params,
    userId: undefined,
    query: { includeSource: true },
  });
  const row = (
    data as unknown as {
      entry_hash: string;
      narration?: string;
      source?: { sha256sum: string } | null;
    }[]
  ).find((item) => item.narration === "FARMERS MARKET");
  if (!row?.source) fail("no source for FARMERS MARKET");
  const edit = {
    ...params,
    entryHash: row.entry_hash,
    sha256sum: row.source.sha256sum,
    newContent: LONGER,
  };
  const current = MAIN.split("\n").indexOf(BALANCE) + 1;
  const lines = (newErrors: { source?: { lineno: number } | null }[]) =>
    JSON.stringify(newErrors.map(({ source }) => source?.lineno));

  // backend-v2 sends every preview with allowInvalid (w23/m7/t008).
  const preview = await journal.updateSourceSlice({
    ...edit,
    allowInvalid: true,
    dryRun: true,
  });
  if (lines(preview.validation.newErrors) !== `[${current}]`)
    fail(`the preview names ${JSON.stringify(preview.validation.newErrors)}`);
  const refused = await journal.updateSourceSlice(edit).then(
    () => fail("the breaking edit committed"),
    (error: Error) => error.message,
  );
  if (!refused.includes(`got 48.75 USD (main.bean:${current})`))
    fail(`the refusal says: ${refused}`);
  if (commits.length !== 0) fail("the preview or the refusal committed");
  console.log(
    "✓ an edit that makes an entry longer is previewed and refused at the assertion's current line (w31/116)",
  );

  const forced = await journal.updateSourceSlice({
    ...edit,
    allowInvalid: true,
  });
  const after = files["main.bean"].split("\n").indexOf(BALANCE) + 1;
  if (after !== current + 1 || lines(forced.validation.newErrors) !== `[${after}]`)
    fail(`the forced edit names ${JSON.stringify(forced.validation.newErrors)}`);
  console.log(
    "✓ a forced edit reports the line the assertion has once the edit lands (w31/116)",
  );
}

/**
 * A projected exact-text edit that grows a posting line into three, as
 * `updateLedgerFiles` sends it: the check names the assertion it breaks two
 * lines below its current line, at its line in the edited text (w31/118).
 */
export async function verifyProjectedEditLines(): Promise<void> {
  const { factory } = committingRepo({ "main.bean": MAIN });
  const data = new LedgerDataService(factory as never, {} as never);
  const groceries = "  Expenses:Food:Groceries  23.50 USD";
  const edited = MAIN.replace(
    groceries,
    [
      groceries,
      "  Expenses:Food:Coffee  1.00 USD",
      "  Assets:Cash  -1.00 USD",
    ].join("\n"),
  );
  const current = MAIN.split("\n").indexOf(BALANCE) + 1;
  const written = edited.split("\n").indexOf(BALANCE) + 1;
  if (written !== current + 2) fail(`the edit put the assertion at ${written}`);
  const errors = await data.checkProjectedErrors({
    ledgerId: "synthetic/edit-lines",
    userId: undefined,
    overlays: [
      { path: "main.bean", content: Buffer.from(edited).toString("base64") },
    ],
  });
  const named = errors.map(
    ({ message, source }) => `${source?.filename}:${source?.lineno} ${message}`,
  );
  if (
    JSON.stringify(named) !==
    JSON.stringify([
      `main.bean:${written} Balance failed for Assets:Cash: expected 49.75 USD, got 48.75 USD`,
    ])
  )
    fail(`the projected edit names ${JSON.stringify(named)}`);
  console.log(
    "✓ a projected file edit names the assertion it breaks at its line in the edited text, the line backend-v2 maps back (w31/118)",
  );
}
