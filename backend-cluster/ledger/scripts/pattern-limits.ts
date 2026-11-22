/**
 * Plugin and filter patterns too complex to run (`pattern-complexity.ts`) are
 * refused before they match any text, so they hold no worker: an unrelated
 * ledger's parse, sent while they are in the pool, is not delayed. Drives the
 * real worker pool on the live engine, then the journal service, which
 * answers a refused filter as the caller's bad input.
 *
 * Run by `verify-rustledger.ts` (live engine; not a jest test).
 */
import type { FileMap } from "@rustledger/wasm";
import { LedgerJournalService } from "@/features/ledger/service/ledger-journal-service";
import { RustledgerWorkerPool } from "@/foundation/rustledger";
import { BadUserInputError } from "@/shared/errors";
import { singleFileRepoFactory } from "./single-file-repo";

/** An account name long enough that matching it repeatedly would show. */
const LONG_ACCOUNT = `Assets:${"A".repeat(40)}`;
const NESTED = "Assets:(A+)+B";
const TOO_COMPLEX = "pattern is too complex: ";
/** A parse of a one-line ledger, with the pool's other tasks ahead of it. */
const PARSE_BUDGET_MS = 2_000;

const ledgerWith = (pluginLine: string): FileMap => ({
  "main.bean": [
    pluginLine,
    `2020-01-01 open ${LONG_ACCOUNT} USD`,
    "2020-01-01 open Equity:Opening",
    "",
    '2020-01-02 * "Seed"',
    `  ${LONG_ACCOUNT}  1 USD`,
    "  Equity:Opening",
    "",
  ].join("\n"),
});

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
  console.log(`✓ ${message}`);
}

const settled = <T>(promise: Promise<T>) =>
  promise.then(
    (value) => ({ value, error: undefined }),
    (error: Error) => ({ value: undefined, error }),
  );

export async function verifyPatternLimits(): Promise<void> {
  // Short budgets, so a pattern that did hold a worker fails here in seconds.
  const pool = new RustledgerWorkerPool({
    workerCount: 2,
    taskTimeoutMs: 5_000,
  });
  try {
    await pool.warmup();
    const plain = await pool.parse(ledgerWith(""), "main.bean");
    const started = Date.now();
    const checkCommodity = settled(
      pool.parse(
        ledgerWith(
          `plugin "beancount.plugins.check_commodity" "{'${NESTED}': 'X'}"`,
        ),
        "main.bean",
      ),
    );
    const oneCommodity = settled(
      pool.parse(
        ledgerWith(`plugin "beancount.plugins.onecommodity" "${NESTED}"`),
        "main.bean",
      ),
    );
    // Sent to the pool directly, past the request thread's own check.
    const filter = settled(
      pool.filter(plain.directives, { account: "(.|.)*Z" }),
    );
    const parsing = Date.now();
    const unrelated = await pool.parse(
      { "main.bean": "2020-01-01 open Assets:Cash USD\n" },
      "main.bean",
    );
    const waited = Date.now() - parsing;
    assert(
      unrelated.valid && waited < PARSE_BUDGET_MS,
      `an unrelated parse queued behind refused patterns finishes in ${waited} ms`,
    );

    const commodity = await checkCommodity;
    assert(
      commodity.value?.errors.some((error) =>
        error.message.startsWith(
          `Invalid regexp: '${NESTED}' for check_commodity: ${TOO_COMPLEX}`,
        ),
      ) === true,
      "check_commodity reports a pattern too complex to run",
    );
    const one = await oneCommodity;
    assert(
      one.value?.errors.some((error) =>
        error.message.startsWith(
          `Invalid regexp: '${NESTED}' for onecommodity: ${TOO_COMPLEX}`,
        ),
      ) === true,
      "onecommodity reports a pattern too complex to run",
    );
    const filtered = await filter;
    const workerMessage = (
      filtered.error as { metadata?: { originalMessage?: string } } | undefined
    )?.metadata?.originalMessage;
    assert(
      workerMessage?.includes("Filter pattern is too complex: ") === true,
      "a filter task refuses the pattern inside the worker too",
    );
    const elapsed = Date.now() - started;
    assert(
      elapsed < PARSE_BUDGET_MS,
      `the refused plugin and filter patterns all answer in ${elapsed} ms`,
    );

    const ordinary = await pool.filter(plain.directives, {
      account: `^Assets:A+$`,
    });
    assert(ordinary.length === 2, "an ordinary regex filter still matches");
  } finally {
    await pool.close();
  }

  // Through the journal service, on the shared pool: the caller's 400.
  const journal = new LedgerJournalService(
    singleFileRepoFactory(ledgerWith("")["main.bean"]!) as never,
    {} as never,
  );
  const read = (account: string) =>
    journal.getJournal({
      ledgerId: "synthetic/pattern-limits",
      userId: undefined,
      query: { account },
    });
  const started = Date.now();
  const refused = await settled(read("(.|.)*Z"));
  assert(
    refused.error instanceof BadUserInputError &&
      refused.error.message.startsWith("Filter pattern is too complex: ") &&
      Date.now() - started < PARSE_BUDGET_MS,
    "the journal answers a pattern too complex to run as bad input, at once",
  );
  const { data } = (await read("^Assets:(A+|Cash)$")) as unknown as {
    data: { directive_type: string }[];
  };
  assert(
    data.some((row) => row.directive_type === "Transaction"),
    "the journal still filters by an ordinary regex",
  );
}
