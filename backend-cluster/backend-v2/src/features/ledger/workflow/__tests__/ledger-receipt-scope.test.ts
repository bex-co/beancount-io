import "reflect-metadata";
import { LedgerReceiptWorkflow } from "../ledger-receipt-workflow";
import type { Identity } from "@/server/api/identity";
import { ForbiddenError } from "@/shared/errors";

jest.mock("@/foundation/fava", () => ({
  unwrapFavaResponse: jest.fn(async (promise: Promise<unknown>) => promise),
}));

jest.mock("@/shared/fetch-asset-base64", () => ({
  fetchAssetAsBase64: jest.fn().mockResolvedValue("base64data"),
}));

/**
 * w3/m9 — the receipt workflow authorizes as its caller.
 *
 * `addBulkEntries` is the only `authorizeLedger` seam on this path, and it runs
 * *last*: the git strategy commits the receipt file into the repository before
 * reaching it. So the workflow rebuilding `trustedIdentity(userId)` was worse
 * than a widened write — a ledger-pinned credential could drop a file into
 * another ledger's repo and the seam never got a chance to object.
 *
 * Two things are under test: the scope check fires before any Fava call, and
 * the caller's own identity — not a reconstruction — is what reaches
 * `addBulkEntries`.
 */
describe("LedgerReceiptWorkflow authorizes as the caller", () => {
  const pinnedToA: Identity = {
    userId: "usr_1",
    method: "oauth",
    scopes: new Set(["ledger.read", "ledger.write"]),
    ledgerScope: "alice/a",
    tokenId: "tok_1",
  };

  const readOnlyKey: Identity = {
    userId: "usr_1",
    method: "apikey",
    scopes: new Set(["ledger.read"]),
    tokenId: "key_1",
  };

  const getPublicApiClient = jest.fn();
  const getAdminClient = jest.fn();
  const addBulkEntries = jest.fn();
  const copyTempToPermanent = jest.fn();

  function makeWorkflow() {
    return new LedgerReceiptWorkflow(
      { getPublicApiClient, getAdminClient } as never,
      {
        copyTempToPermanent,
        deleteTempAsset: jest.fn().mockResolvedValue(undefined),
        generateDownloadUrl: jest
          .fn()
          .mockResolvedValue({ downloadUrl: "https://s3.example/file" }),
      } as never,
      { addBulkEntries } as never,
      { dashboard: { url: "https://dash.example" } } as never,
    );
  }

  const params = (ledgerId: string, identity: Identity) => ({
    ledgerId,
    // Owner-bound temp key: both fixtures upload as usr_1, so the scope
    // refusals above are the only thing that can stop these calls.
    receiptObjectKey: "tmp/usr_1/r.pdf",
    input: {
      date: "2026-06-18",
      payee: "Cafe",
      description: "Coffee",
      postings: [],
      documentAccount: "Assets:Receipts",
    },
    identity,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    addBulkEntries.mockResolvedValue({ success: true });
    getAdminClient.mockReturnValue({
      ledgers: { getLedger: jest.fn().mockResolvedValue({ id: 42 }) },
    });
    copyTempToPermanent.mockResolvedValue({ filename: "r.pdf" });
    getPublicApiClient.mockResolvedValue({
      reports: {
        getLedgerBcioOptions: jest
          .fn()
          .mockResolvedValue({ data: { success: false } }),
      },
      ledgers: {
        createLedgerFile: jest.fn().mockResolvedValue({ success: true }),
        getLedger: jest.fn().mockResolvedValue({ id: 42 }),
      },
    });
  });

  it("refuses a ledger the grant is not pinned to, before any ledger call", async () => {
    await expect(
      makeWorkflow().insertReceiptTransaction(params("alice/b", pinnedToA)),
    ).rejects.toThrow(ForbiddenError);

    expect(getPublicApiClient).not.toHaveBeenCalled();
    expect(copyTempToPermanent).not.toHaveBeenCalled();
    expect(addBulkEntries).not.toHaveBeenCalled();
  });

  it("refuses a read-only credential on this write-class verb", async () => {
    await expect(
      makeWorkflow().insertReceiptTransaction(params("alice/a", readOnlyKey)),
    ).rejects.toThrow(ForbiddenError);
    expect(getPublicApiClient).not.toHaveBeenCalled();
  });

  it("hands the caller's own identity to addBulkEntries, still narrowed", async () => {
    await makeWorkflow().insertReceiptTransaction(params("alice/a", pinnedToA));

    expect(addBulkEntries).toHaveBeenCalledTimes(1);
    const identity = addBulkEntries.mock.calls[0]![0]! as Identity;
    expect(identity).toBe(pinnedToA);
    // The pre-fix shape: same user, entirely different authority. If this ever
    // holds again, `authorizeLedger` downstream has no pin left to check.
    expect(identity.method).toBe("oauth");
    expect(identity.ledgerScope).toBe("alice/a");
  });
});
