/**
 * A lot-booking error the ledger already has, on the live engine through the
 * real projection and the write gate's diff (w31/115). A sale whose buys are
 * missing fails to book, and the engine's error quotes the lots the account
 * holds: "requested 10, available 5" on a FIFO account, "2 lots match" on a
 * STRICT one. Importing one of the missing buys, dated before the sale, moves
 * that figure, and the error the ledger already had read as new: the preview
 * answered `valid: false` and every partial batch was refused. The same
 * diff now matches it, while a changed requested amount and a second failing
 * sale still count as new.
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

const SELL_A = (units: number) =>
  txn(
    "2026-03-01",
    "sell-a",
    `Assets:Broker  -${units} HOOL {10.00 USD}`,
    `Assets:Cash  ${units * 10}.00 USD`,
  );

const MAIN = [
  '2026-01-01 open Assets:Broker "FIFO"',
  '2026-01-01 open Assets:Strict "STRICT"',
  "2026-01-01 open Assets:Cash",
  "",
  txn(
    "2026-02-01",
    "buy-a",
    "Assets:Broker  5 HOOL {10.00 USD}",
    "Assets:Cash  -50.00 USD",
  ),
  txn(
    "2026-02-01",
    "buy-s1",
    "Assets:Strict  5 HOOL {10.00 USD}",
    "Assets:Cash  -50.00 USD",
  ),
  txn(
    "2026-02-02",
    "buy-s2",
    "Assets:Strict  5 HOOL {11.00 USD}",
    "Assets:Cash  -55.00 USD",
  ),
  SELL_A(10),
  txn(
    "2026-03-01",
    "sell-s",
    "Assets:Strict  -3 HOOL {}",
    "Assets:Cash  30.00 USD",
  ),
].join("\n");

const BUY_B = (units: number) =>
  txn(
    "2026-02-15",
    "buy-b",
    `Assets:Broker  ${units} HOOL {10.00 USD}`,
    `Assets:Cash  -${units * 10}.00 USD`,
  );
const BUY_S3 = txn(
  "2026-02-15",
  "buy-s3",
  "Assets:Strict  1 HOOL {12.00 USD}",
  "Assets:Cash  -12.00 USD",
);

function fail(message: string): never {
  throw new Error(`known lot errors: ${message}`);
}

export async function verifyKnownLotErrors(): Promise<void> {
  const { factory } = committingRepo({ "main.bean": MAIN });
  const service = new LedgerDataService(factory as never, {} as never);
  const params = { ledgerId: "synthetic/lots", userId: undefined };
  const baseline = await service.getErrors(params);
  const messages = (errors: readonly { message: string }[]) =>
    errors.map((error) => error.message);
  if (
    baseline.length !== 2 ||
    !baseline[0]?.message.includes("requested 10, available 5") ||
    !baseline[1]?.message.includes("2 lots match in Assets:Strict")
  ) {
    fail(`the fixture fails to book as expected: ${JSON.stringify(messages(baseline))}`);
  }
  const project = async (text: string) => {
    const after = await service.checkProjectedErrors({
      ...params,
      overlays: [
        {
          path: "main.bean",
          content: Buffer.from(text).toString("base64"),
        },
      ],
    });
    return {
      after: messages(after),
      ...(await projectNewLedgerErrors(after, async () => baseline)),
    };
  };

  const partial = await project(`${MAIN}\n${BUY_B(2)}\n${BUY_S3}`);
  if (
    !partial.after.some((m) => m.includes("requested 10, available 7")) ||
    !partial.after.some((m) => m.includes("3 lots match in Assets:Strict"))
  ) {
    fail(`a partial buy no longer moves the figures: ${JSON.stringify(partial.after)}`);
  }
  if (partial.newErrors.length > 0 || partial.errorsAfter !== 2) {
    fail(`a partial buy reads as new: ${JSON.stringify(messages(partial.newErrors))}`);
  }
  const complete = await project(`${MAIN}\n${BUY_B(5)}`);
  if (complete.newErrors.length > 0 || complete.errorsAfter !== 1) {
    fail(`a buy that covers the sale: ${JSON.stringify(complete.after)}`);
  }
  console.log(
    "✓ a buy dated before a sale that fails to book keeps its error known: available and lot count are not new (w31/115)",
  );

  const larger = await project(MAIN.replace(SELL_A(10), SELL_A(12)));
  if (
    larger.newErrors.length !== 1 ||
    !larger.newErrors[0]?.message.includes("requested 12, available 5")
  ) {
    fail(`a larger sale: ${JSON.stringify(messages(larger.newErrors))}`);
  }
  const second = await project(
    `${MAIN}\n${txn("2026-03-02", "sell-a2", "Assets:Broker  -10 HOOL {10.00 USD}", "Assets:Cash  100.00 USD")}`,
  );
  if (second.newErrors.length !== 1) {
    fail(`a second failing sale: ${JSON.stringify(messages(second.newErrors))}`);
  }
  console.log(
    "✓ a changed requested amount and a second failing sale still count as new (w31/115)",
  );
}
