/**
 * A 1,000-entry batch delete on a 1,000-entry ledger (w1/237), on the live
 * engine through the real journal service. Each entry used to be located
 * with its own full-ledger parse (about 65 ms apiece) and the file hashed
 * twice more per entry, so the batch took 90 s, overran the write deadline,
 * committed, and told its caller to retry. The dry run runs every check the
 * commit does; it must finish well inside the deadline and name every entry.
 *
 * Run by `verify-rustledger.ts` (live engine; not a jest test).
 */
import { LedgerJournalService } from "@/features/ledger/service/ledger-journal-service";
import { sliceSha256 } from "@/foundation/rustledger";
import { singleFileRepoFactory } from "./single-file-repo";

const N = 1000;
/**
 * Far inside the 90 s write deadline: the batch previews in about 0.2 s
 * here, where locating each entry in turn took 4.3 s on this fixture (and
 * 68 s on the production ledger the note measured).
 */
const BUDGET_MS = 3_000;

export async function verifyBatchDeleteScale(): Promise<void> {
  const block = (i: number) =>
    [
      `2026-03-04 * "QA batch ${i}"`,
      "  Expenses:Food  1.00 USD",
      "  Assets:Cash",
    ].join("\n");
  const source = [
    "2026-01-01 open Expenses:Food USD",
    "2026-01-01 open Assets:Cash USD",
    "",
    ...Array.from({ length: N }, (_, i) => `${block(i)}\n`),
  ].join("\n");
  const journal = new LedgerJournalService(
    singleFileRepoFactory(source) as never,
    {} as never,
  );
  const params = { ledgerId: "synthetic/batch-delete", userId: "usr_1" };
  const { data } = (await journal.getJournal({
    ...params,
    userId: undefined,
    query: { limit: N + 10 },
  })) as unknown as {
    data: { directive_type: string; entry_hash: string; narration: string }[];
  };
  const entries = data
    .filter((row) => row.directive_type === "Transaction")
    .map((row) => ({
      entryHash: row.entry_hash,
      sha256sum: sliceSha256(block(Number(row.narration.split(" ").at(-1)))),
    }));
  if (entries.length !== N) {
    throw new Error(`expected ${N} transactions, got ${entries.length}`);
  }
  const started = Date.now();
  const result = await journal.deleteMultiSourceSlices({
    ...params,
    entries,
    dryRun: true,
  });
  const elapsed = Date.now() - started;
  if (result.deletedHashes.length !== N) {
    throw new Error(
      `a ${N}-entry batch delete named ${result.deletedHashes.length} entries`,
    );
  }
  if (elapsed > BUDGET_MS) {
    throw new Error(
      `a ${N}-entry batch delete dry run took ${elapsed} ms (budget ${BUDGET_MS} ms)`,
    );
  }
  console.log(
    `✓ a ${N}-entry batch delete previews in ${elapsed} ms, one parse for the batch (w1/237)`,
  );
}
