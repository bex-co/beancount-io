/**
 * Where an edit's new error is reported, on the live engine through the real
 * journal service (w31/116). Making the FARMERS MARKET entry one posting
 * longer breaks the balance assertion below it. The engine reads the edited
 * text, where the assertion sits one line lower, and the preview and the
 * refusal named that line. Neither commits, so both now name the line in the
 * file as it stands, as an add names it. A forced edit names the line the
 * assertion has once the edit lands.
 *
 * Run by `verify-rustledger.ts` (live engine; not a jest test).
 */
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
