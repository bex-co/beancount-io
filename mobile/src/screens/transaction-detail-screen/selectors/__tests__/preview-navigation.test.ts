import { makeVar } from "@apollo/client";
import {
  openTransactionDetail,
  selectedTransactionVar,
} from "../../open-transaction-detail";
import type { JournalTransaction } from "@/screens/transactions-screen/types";

describe("transaction preview navigation", () => {
  afterEach(() => {
    selectedTransactionVar(null);
  });
  it("opens the public detail without replacing the signed-in transaction cache", () => {
    const privateEntry = { entry_hash: "private" } as JournalTransaction;
    const publicEntry = { entry_hash: "example" } as JournalTransaction;
    selectedTransactionVar(privateEntry);
    const pushes: unknown[] = [];
    const router = {
      push: (route: unknown) => pushes.push(route),
    } as unknown as Parameters<typeof openTransactionDetail>[0];
    const preview = {
      selectedTransaction: makeVar<JournalTransaction | null>(null),
    };
    openTransactionDetail(router, publicEntry, "Assets:Cash", preview);
    expect(preview.selectedTransaction()).toBe(publicEntry);
    expect(pushes).toEqual([
      {
        pathname: "/examples/transaction-detail",
        params: { entry_hash: "example", origin_account: "Assets:Cash" },
      },
    ]);
    expect(selectedTransactionVar()).toBe(privateEntry);
    openTransactionDetail(router, publicEntry);
    expect(selectedTransactionVar()).toBe(publicEntry);
  });
});
