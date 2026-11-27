/**
 * A commodity-plugin error the ledger already has, on the live engine through
 * the real projection and the write gate's diff (w31/127). `check_commodity`
 * reports an undeclared currency once, naming the first account that uses
 * it, and `onecommodity` lists an account's currencies in the order they were
 * first used, on the account's last entry. Opening an account that sorts
 * first, posting the other currency earlier, or posting to the account later
 * in another file relabels or moves that error, and it read as new: the
 * preview answered `valid: false` and the write was refused. The same diff
 * now matches it, while a new undeclared currency and a third currency in a
 * mixed account still count as new.
 *
 * Run by `verify-rustledger.ts` (live engine; not a jest test).
 */
import { LedgerDataService } from "@/features/ledger/service/ledger-data-service";
import { projectNewLedgerErrors } from "@/features/ledger/utils/new-ledger-errors";
import { committingRepo } from "./entry-move";

const txn = (date: string, narration: string, ...postings: string[]) =>
  [`${date} * "${narration}"`, ...postings.map((p) => `  ${p}`), ""].join(
    "\n",
  );

const MAIN = [
  'plugin "beancount.plugins.check_commodity"',
  'plugin "beancount.plugins.onecommodity"',
  'include "2027.bean"',
  "2026-01-01 open Assets:US:BofA:Checking USD",
  "2026-01-01 open Assets:US:ETrade:Cash USD",
  "2026-01-01 open Expenses:Travel",
  "2026-01-01 open Equity:Opening",
  "",
  txn(
    "2026-02-01",
    "hotel",
    "Assets:US:BofA:Checking  -10 USD",
    "Expenses:Travel  10 USD",
  ),
  txn("2026-02-02", "train", "Expenses:Travel  5 EUR", "Equity:Opening  -5 EUR"),
].join("\n");

const LATER = "2027.bean";

function fail(message: string): never {
  throw new Error(`known commodity errors: ${message}`);
}

export async function verifyKnownCommodityErrors(): Promise<void> {
  const { factory } = committingRepo({ "main.bean": MAIN, [LATER]: "" });
  const service = new LedgerDataService(factory as never, {} as never);
  const params = { ledgerId: "synthetic/commodities", userId: undefined };
  const baseline = await service.getErrors(params);
  const messages = (errors: readonly { message: string }[]) =>
    errors.map((error) => error.message);
  const has = (errors: readonly { message: string }[], text: string) =>
    messages(errors).includes(text);
  const usd = (account: string) =>
    `Missing Commodity directive for 'USD' in '${account}'`;
  const travel = (currencies: string) =>
    `More than one currency in account 'Expenses:Travel': ${currencies}`;
  if (
    baseline.length !== 3 ||
    !has(baseline, usd("Assets:US:BofA:Checking")) ||
    !has(baseline, travel("USD,EUR"))
  ) {
    fail(`the fixture's errors: ${JSON.stringify(messages(baseline))}`);
  }
  const project = async (files: Record<string, string>) => {
    const after = await service.checkProjectedErrors({
      ...params,
      overlays: Object.entries(files).map(([path, text]) => ({
        path,
        content: Buffer.from(text).toString("base64"),
      })),
    });
    return {
      after,
      ...(await projectNewLedgerErrors(after, async () => baseline)),
    };
  };
  const known = async (
    what: string,
    files: Record<string, string>,
    relabelled: string,
    file?: string,
  ) => {
    const result = await project(files);
    const error = result.after.find((e) => e.message === relabelled);
    if (!error || (file && error.source?.filename !== file)) {
      fail(`${what} no longer relabels the error: ${JSON.stringify(result.after)}`);
    }
    if (result.newErrors.length > 0 || result.errorsAfter !== 3) {
      fail(`${what} reads as new: ${JSON.stringify(messages(result.newErrors))}`);
    }
  };

  await known(
    "opening an account that sorts first",
    { "main.bean": `${MAIN}\n2026-03-01 open Assets:US:Ally:Savings USD\n` },
    usd("Assets:US:Ally:Savings"),
  );
  await known(
    "renaming the first account",
    {
      "main.bean": MAIN.replaceAll(
        "Assets:US:BofA:Checking",
        "Assets:US:Wells:Checking",
      ),
    },
    usd("Assets:US:ETrade:Cash"),
  );
  console.log(
    "✓ a missing-commodity error the ledger already has stays known when another account becomes the first to use it (w31/127)",
  );
  await known(
    "an earlier entry in the other currency",
    {
      "main.bean": `${MAIN}\n${txn("2026-01-15", "taxi", "Expenses:Travel  3 EUR", "Equity:Opening  -3 EUR")}`,
    },
    travel("EUR,USD"),
  );
  await known(
    "a later entry in another file",
    {
      [LATER]: txn(
        "2027-01-10",
        "hotel",
        "Assets:US:BofA:Checking  -8 USD",
        "Expenses:Travel  8 USD",
      ),
    },
    travel("USD,EUR"),
    LATER,
  );
  console.log(
    "✓ a mixed-currency account's error stays known when its currencies reorder or it moves to another file (w31/127)",
  );

  const gbp = await project({
    "main.bean": `${MAIN}\n2026-03-01 open Assets:UK:Cash GBP\n`,
  });
  if (
    gbp.newErrors.length !== 1 ||
    gbp.newErrors[0]?.message !==
      "Missing Commodity directive for 'GBP' in 'Assets:UK:Cash'"
  ) {
    fail(`a new undeclared currency: ${JSON.stringify(messages(gbp.newErrors))}`);
  }
  const third = await project({
    "main.bean": `${MAIN}\n${txn("2026-03-01", "ferry", "Expenses:Travel  4 GBP", "Equity:Opening  -4 GBP")}`,
  });
  if (!has(third.newErrors, travel("USD,EUR,GBP"))) {
    fail(`a third currency: ${JSON.stringify(messages(third.newErrors))}`);
  }
  console.log(
    "✓ a new undeclared currency and a third currency in a mixed account still count as new (w31/127)",
  );
}
