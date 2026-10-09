import { makeVar } from "@apollo/client";
import {
  openTransactionDetail,
  selectedTransactionVar,
  type StashedTransaction,
} from "../../open-transaction-detail";
import type { JournalTransaction } from "@/screens/transactions-screen/types";

describe("transaction preview navigation", () => {
  afterEach(() => {
    selectedTransactionVar(null);
  });
  it("opens the public detail without replacing the signed-in transaction cache", () => {
    const privateEntry = { entry_hash: "private" } as JournalTransaction;
    const publicEntry = { entry_hash: "example" } as JournalTransaction;
    const privateStash = { ledgerId: "alice/books", entry: privateEntry };
    selectedTransactionVar(privateStash);
    const pushes: unknown[] = [];
    const router = {
      push: (route: unknown) => pushes.push(route),
    } as unknown as Parameters<typeof openTransactionDetail>[0];
    const preview = {
      selectedTransaction: makeVar<StashedTransaction | null>(null),
    };
    openTransactionDetail(
      router,
      publicEntry,
      "open_ledger/example",
      "Assets:Cash",
      preview,
    );
    expect(preview.selectedTransaction()).toEqual({
      ledgerId: "open_ledger/example",
      entry: publicEntry,
    });
    expect(pushes).toEqual([
      {
        pathname: "/examples/transaction-detail",
        params: {
          entry_hash: "example",
          ledger: "open_ledger/example",
          origin_account: "Assets:Cash",
        },
      },
    ]);
    expect(selectedTransactionVar()).toBe(privateStash);
    openTransactionDetail(router, publicEntry, "alice/books");
    expect(selectedTransactionVar()).toEqual({
      ledgerId: "alice/books",
      entry: publicEntry,
    });
  });
});
