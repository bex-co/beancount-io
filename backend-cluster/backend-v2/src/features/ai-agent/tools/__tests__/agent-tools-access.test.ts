import { createAgentTools } from "../index";

describe("createAgentTools access profiles", () => {
  it("keeps query, file reads, and receipt analysis in read mode", () => {
    expect(Object.keys(createAgentTools({} as never, "read")).sort()).toEqual([
      "listLedgerFiles",
      "parseReceipt",
      "readLedgerFiles",
      "runBqlQuery",
    ]);
  });

  it("adds ledger mutations only in write mode", () => {
    expect(Object.keys(createAgentTools({} as never, "write")).sort()).toEqual([
      "editLedgerFiles",
      "insertReceiptTransaction",
      "listLedgerFiles",
      "parseReceipt",
      "readLedgerFiles",
      "runBqlQuery",
    ]);
  });
});
