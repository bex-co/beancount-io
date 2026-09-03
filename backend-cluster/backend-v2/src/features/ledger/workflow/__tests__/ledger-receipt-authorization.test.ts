import { LedgerReceiptWorkflow } from "../ledger-receipt-workflow";
import {
  AUTHORIZATION_ACTIONS,
  ledgerResource,
  tempAssetResource,
} from "@/server/api/authorization";
import type { Identity } from "@/server/api/identity";

const identity: Identity = {
  userId: "usr_1",
  method: "oauth",
  scopes: new Set(["ledger.write"]),
  ledgerScope: "owner/main",
};

const params = {
  ledgerId: "owner/main",
  receiptObjectKey: "tmp/usr_1/r.pdf",
  identity,
  input: {
    date: "2026-01-01",
    payee: "Shop",
    description: "Receipt",
    postings: [],
    documentAccount: "Assets:Receipts",
  },
};

describe("LedgerReceiptWorkflow authorization", () => {
  it("makes the composite PDP decision before the first side effect", async () => {
    const denied = new Error("denied");
    const authorizeOrThrow = jest.fn().mockRejectedValue(denied);
    const getPublicApiClient = jest.fn();
    const assetStorage = {
      generateDownloadUrl: jest.fn(),
      copyTempToPermanent: jest.fn(),
      deleteTempAsset: jest.fn(),
    };
    const ledgerEntry = { writeBulkEntries: jest.fn() };
    const workflow = new LedgerReceiptWorkflow(
      { getPublicApiClient } as never,
      assetStorage as never,
      ledgerEntry as never,
      { dashboard: { url: "https://example.test" } } as never,
      { authorizeOrThrow } as never,
    );

    await expect(workflow.insertReceiptTransaction(params)).rejects.toBe(
      denied,
    );
    expect(authorizeOrThrow).toHaveBeenCalledWith({
      principal: identity,
      action: AUTHORIZATION_ACTIONS.ASSISTED_RECEIPT_INSERT,
      resource: [
        tempAssetResource("tmp/usr_1/r.pdf"),
        ledgerResource("owner/main"),
      ],
    });
    expect(getPublicApiClient).not.toHaveBeenCalled();
    expect(assetStorage.copyTempToPermanent).not.toHaveBeenCalled();
    expect(ledgerEntry.writeBulkEntries).not.toHaveBeenCalled();
  });
});
