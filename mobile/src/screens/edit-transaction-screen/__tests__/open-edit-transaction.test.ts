import { openEditTransaction } from "../open-edit-transaction";
import type { EditTransactionParams } from "../open-edit-transaction";

const PARAMS: EditTransactionParams = {
  entryHash: "hash-xyz",
  ledgerId: "ledger-1",
};

describe("openEditTransaction", () => {
  it("calls router.push with /edit-transaction pathname and entryHash/ledgerId params", () => {
    const pushArgs: unknown[] = [];
    const router = { push: (arg: unknown) => pushArgs.push(arg) };

    openEditTransaction(router as never, PARAMS);

    expect(pushArgs.length).toBe(1);
    const call = pushArgs[0] as {
      pathname: string;
      params: EditTransactionParams;
    };
    expect(call.pathname).toBe("/edit-transaction");
    expect(call.params.entryHash).toBe(PARAMS.entryHash);
    expect(call.params.ledgerId).toBe(PARAMS.ledgerId);
  });

  it("passes entryHash and ledgerId exactly as provided", () => {
    const params: EditTransactionParams = {
      entryHash: "different-hash",
      ledgerId: "another-ledger",
    };
    const pushArgs: unknown[] = [];
    const router = { push: (arg: unknown) => pushArgs.push(arg) };

    openEditTransaction(router as never, params);

    const call = pushArgs[0] as { params: EditTransactionParams };
    expect(call.params.entryHash).toBe("different-hash");
    expect(call.params.ledgerId).toBe("another-ledger");
  });
});
