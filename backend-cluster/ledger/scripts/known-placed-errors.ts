/**
 * A plugin error that a write moves to another file, on the live engine
 * through the real projection, the journal service's delete and the write
 * gate's diff (w31/128). Three plugins issue an error once per thing and place
 * it by a rule that reads entries across files, as stock Beancount does:
 * `coherent_cost` on the first transaction by date that holds the currency
 * without a cost, `unique_prices` on the day's first price by line whatever
 * its file, and `noduplicates` on the later copy of a balance by date and
 * line. An earlier uncosted holding in another file, deleting the first one,
 * or lines written above a price or a balance in the other file moved the
 * error there. Keyed on its file it read as new: the preview answered
 * `valid: false` with the count unchanged, and the write was refused. The diff
 * now matches it in any file, while a second currency held both ways, a
 * second disagreeing day and a third duplicate still count as new.
 *
 * Run by `verify-rustledger.ts` (live engine; not a jest test).
 */
import { LedgerDataService } from "@/features/ledger/service/ledger-data-service";
import { LedgerJournalService } from "@/features/ledger/service/ledger-journal-service";
import { projectNewLedgerErrors } from "@/features/ledger/utils/new-ledger-errors";
import { parseLedgerFiles } from "@/foundation/rustledger";
import { committingRepo } from "./entry-move";

const txn = (date: string, narration: string, ...postings: string[]) =>
  [`${date} * "${narration}"`, ...postings.map((p) => `  ${p}`), ""].join(
    "\n",
  );

const OTHER = "other.bean";
const VTI = "Currency 'VTI' is used both with and without cost";
const PRICES = "Disagreeing price entries";

function fail(message: string): never {
  throw new Error(`known placed errors: ${message}`);
}

type Located = { message: string; source?: { filename: string } | null };
const messages = (errors: readonly Located[]) =>
  errors.map((error) => error.message);
const fileOf = (errors: readonly Located[], message: string) =>
  errors.find((error) => error.message === message)?.source?.filename;

/** The ledger over `files`, and a projection of overlays through the diff. */
async function ledgerOver(files: Record<string, string>, name: string) {
  const { factory, commits } = committingRepo(files);
  const data = new LedgerDataService(factory as never, {} as never);
  const params = { ledgerId: `synthetic/${name}`, userId: undefined };
  const baseline = await data.getErrors(params);
  const project = async (overlays: Record<string, string>) => {
    const after = await data.checkProjectedErrors({
      ...params,
      overlays: Object.entries(overlays).map(([path, text]) => ({
        path,
        content: Buffer.from(text).toString("base64"),
      })),
    });
    return {
      after,
      ...(await projectNewLedgerErrors(after, async () => baseline)),
    };
  };
  /** A write that only moves `message` into `file` reads as nothing new. */
  const moves = async (
    what: string,
    overlays: Record<string, string>,
    message: string,
    file: string,
  ) => {
    const result = await project(overlays);
    if (fileOf(result.after, message) !== file) {
      fail(`${what} no longer moves the error: ${JSON.stringify(result.after)}`);
    }
    if (
      result.newErrors.length > 0 ||
      result.errorsAfter !== result.errorsBefore
    ) {
      fail(`${what} reads as new: ${JSON.stringify(messages(result.newErrors))}`);
    }
  };
  /** A write that adds `message` reports exactly that one as new. */
  const adds = async (
    what: string,
    overlays: Record<string, string>,
    message: string,
  ) => {
    const result = await project(overlays);
    const added = messages(result.newErrors);
    if (added.filter((text) => text === message).length !== 1) {
      fail(`${what}: ${JSON.stringify(added)}`);
    }
  };
  return { factory, commits, baseline, moves, adds };
}

const COST_MAIN = [
  'plugin "beancount.plugins.coherent_cost"',
  `include "${OTHER}"`,
  "2026-01-01 open Assets:Broker:VTI",
  "2026-01-01 open Assets:Gift",
  "2026-01-01 open Assets:Bank:Savings",
  "2026-01-01 open Income:Salary",
  "",
  txn(
    "2026-03-01",
    "buy VTI",
    "Assets:Broker:VTI  10 VTI {100.00 USD}",
    "Assets:Bank:Savings  -1000.00 USD",
  ),
  txn(
    "2026-04-01",
    "VTI gift",
    "Assets:Gift  2 VTI @ 100.00 USD",
    "Income:Salary  -200.00 USD",
  ),
].join("\n");
const gift = (date: string, narration: string) =>
  txn(date, narration, "Assets:Gift  1 VTI @ 100.00 USD", "Income:Salary  -100.00 USD");

async function verifyMovedCoherentCost(): Promise<void> {
  const ledger = await ledgerOver(
    { "main.bean": COST_MAIN, [OTHER]: "; other\n" },
    "coherent-cost",
  );
  if (fileOf(ledger.baseline, VTI) !== "main.bean") {
    fail(`the cost fixture's errors: ${JSON.stringify(ledger.baseline)}`);
  }
  await ledger.moves(
    "an uncosted holding dated earlier in the other file",
    { [OTHER]: `; other\n${gift("2026-02-01", "early gift")}` },
    VTI,
    OTHER,
  );
  await ledger.adds(
    "a second currency held both ways",
    {
      "main.bean": `${COST_MAIN}\n${txn(
        "2026-05-02",
        "BND both ways",
        "Assets:Broker:VTI  5 BND {70.00 USD}",
        "Assets:Gift  1 BND @ 70.00 USD",
        "Assets:Bank:Savings  -420.00 USD",
      )}`,
    },
    "Currency 'BND' is used both with and without cost",
  );

  // Deleting the first of two uncosted holdings, through the journal service.
  const files: Record<string, string> = {
    "main.bean": COST_MAIN,
    [OTHER]: `; other\n${gift("2026-05-01", "later gift")}`,
  };
  const { factory, commits } = committingRepo(files);
  const journal = new LedgerJournalService(factory as never, {} as never);
  const params = { ledgerId: "synthetic/coherent-cost-delete", userId: "usr_1" };
  const located = async () =>
    (await parseLedgerFiles({ ...files }, "main.bean")).errors;
  if ((await located()).find((e) => e.message === VTI)?.file !== "main.bean") {
    fail(`the delete fixture's errors: ${JSON.stringify(await located())}`);
  }
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
  ).find((item) => item.narration === "VTI gift");
  if (!row?.source) fail("no source for the first gift");
  const remove = {
    ...params,
    entryHash: row.entry_hash,
    sha256sum: row.source.sha256sum,
  };
  // backend-v2 sends every preview with allowInvalid (w23/m7/t008).
  const preview = await journal.deleteSourceSlice({
    ...remove,
    dryRun: true,
    allowInvalid: true,
  });
  const { errorsBefore, errorsAfter, newErrors } = preview.validation;
  if (errorsBefore !== errorsAfter || newErrors.length !== 0) {
    fail(`the delete's preview reads ${JSON.stringify(preview.validation)}`);
  }
  await journal.deleteSourceSlice(remove);
  if (commits.length !== 1) fail("the delete did not commit");
  if ((await located()).find((e) => e.message === VTI)?.file !== OTHER) {
    fail(`the delete left ${JSON.stringify(await located())}`);
  }
  console.log(
    "✓ a coherent_cost error the ledger already has stays known when an earlier holding or a delete moves it to another file (w31/128)",
  );
}

const PRICE_MAIN = [
  'plugin "beancount.plugins.unique_prices"',
  `include "${OTHER}"`,
  "2026-06-01 price VTI 100.00 USD",
  "2026-01-01 open Expenses:Food:Coffee",
  "2026-01-01 open Assets:Bank:Savings",
  "",
].join("\n");
const PRICE_OTHER = "; other\n2026-06-01 price VTI 101.00 USD\n";

async function verifyMovedPriceDisagreement(): Promise<void> {
  const ledger = await ledgerOver(
    { "main.bean": PRICE_MAIN, [OTHER]: PRICE_OTHER },
    "unique-prices",
  );
  if (fileOf(ledger.baseline, PRICES) !== OTHER) {
    fail(`the price fixture's errors: ${JSON.stringify(ledger.baseline)}`);
  }
  await ledger.moves(
    "an entry written above the other file's price",
    {
      [OTHER]: PRICE_OTHER.replace(
        "\n",
        `\n${txn("2026-02-01", "coffee", "Expenses:Food:Coffee  3.00 USD", "Assets:Bank:Savings  -3.00 USD")}\n`,
      ),
    },
    PRICES,
    "main.bean",
  );
  await ledger.adds(
    "a second disagreeing day",
    {
      "main.bean": `${PRICE_MAIN}2026-06-02 price VTI 100.00 USD\n`,
      [OTHER]: `${PRICE_OTHER}2026-06-02 price VTI 102.00 USD\n`,
    },
    PRICES,
  );
  console.log(
    "✓ a unique_prices disagreement the ledger already has stays known when lines above a price move it to another file (w31/128)",
  );
}

const DUP_MAIN = [
  'plugin "beancount.plugins.noduplicates"',
  `include "${OTHER}"`,
  "2026-01-01 open Assets:Cash USD",
  "2026-01-01 open Equity:Opening USD",
  "2026-01-01 open Expenses:Food USD",
  "",
  txn("2026-01-02", "fund", "Assets:Cash  10 USD", "Equity:Opening"),
  "2026-02-01 balance Assets:Cash 10 USD",
  "",
].join("\n");
const BALANCE = "2026-02-01 balance Assets:Cash 10 USD\n";

async function verifyMovedDuplicateBalance(): Promise<void> {
  const ledger = await ledgerOver(
    { "main.bean": DUP_MAIN, [OTHER]: `; other\n${BALANCE}` },
    "noduplicates",
  );
  const duplicate = ledger.baseline.find((error) =>
    error.message.startsWith("Duplicate entry: "),
  );
  if (duplicate?.source?.filename !== "main.bean") {
    fail(`the duplicate fixture's errors: ${JSON.stringify(ledger.baseline)}`);
  }
  const meals = ["03", "04", "05"]
    .map((day) =>
      txn(`2026-01-${day}`, "meal", "Expenses:Food  1 USD", "Equity:Opening  -1 USD"),
    )
    .join("\n");
  await ledger.moves(
    "entries written above the other file's copy",
    { [OTHER]: `; other\n${meals}\n${BALANCE}` },
    duplicate.message,
    OTHER,
  );
  await ledger.adds(
    "a third copy",
    { [OTHER]: `; other\n${BALANCE}${BALANCE}` },
    duplicate.message,
  );
  console.log(
    "✓ a noduplicates balance copy the ledger already has stays known when lines above the other copy move it to another file (w31/128)",
  );
}

export async function verifyKnownPlacedErrors(): Promise<void> {
  await verifyMovedCoherentCost();
  await verifyMovedPriceDisagreement();
  await verifyMovedDuplicateBalance();
}
