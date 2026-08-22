import "reflect-metadata";
import { LedgerReceiptWorkflow } from "@/features/ledger/workflow/ledger-receipt-workflow";
import type { BcioOptionsPublic } from "@/foundation/fava";

jest.mock("@/foundation/fava", () => ({
  unwrapFavaResponse: jest.fn(async (promise: Promise<unknown>) => promise),
}));

jest.mock("@/shared/fetch-asset-base64", () => ({
  fetchAssetAsBase64: jest.fn().mockResolvedValue("base64data"),
}));

/** Minimal bcio options stub with only the receipt routing field set. */
const bcio = (receipt_storage: string | null): BcioOptionsPublic =>
  ({ receipt_storage }) as unknown as BcioOptionsPublic;

const baseInput = {
  date: "2026-06-18",
  payee: "Cafe",
  description: "Coffee",
  postings: [],
  documentAccount: "Assets:Receipts",
};

function makeWorkflow({
  bcioData,
  addBulkEntries = jest.fn().mockResolvedValue({ success: true }),
  copyTempToPermanent = jest.fn().mockResolvedValue({ filename: "r.pdf" }),
  deleteTempAsset = jest.fn().mockResolvedValue(undefined),
  createLedgerFile = jest.fn().mockResolvedValue({ id: 42 }),
}: {
  bcioData: BcioOptionsPublic | undefined;
  addBulkEntries?: jest.Mock;
  copyTempToPermanent?: jest.Mock;
  deleteTempAsset?: jest.Mock;
  createLedgerFile?: jest.Mock;
}) {
  const mockFavaClientFactory = {
    getPublicApiClient: jest.fn().mockResolvedValue({
      reports: {
        getLedgerBcioOptions: jest
          .fn()
          .mockResolvedValue({ data: { success: !!bcioData, data: bcioData } }),
      },
      ledgers: {
        createLedgerFile,
        getLedger: jest.fn().mockResolvedValue({ id: 42 }),
      },
    }),
    getAdminClient: jest.fn().mockReturnValue({
      ledgers: { getLedger: jest.fn().mockResolvedValue({ id: 42 }) },
    }),
  };
  const mockAssetStorage = {
    copyTempToPermanent,
    deleteTempAsset,
    generateDownloadUrl: jest
      .fn()
      .mockResolvedValue({ downloadUrl: "https://s3.example/file" }),
  };
  const mockLedgerEntry = { addBulkEntries };
  const mockConfig = { dashboard: { url: "https://dash.example" } };

  return new LedgerReceiptWorkflow(
    mockFavaClientFactory as any,
    mockAssetStorage as any,
    mockLedgerEntry as any,
    mockConfig as any,
  );
}

describe("strategy routing", () => {
  it("uses git strategy when receipt_storage='git' (commits file to repo)", async () => {
    const createLedgerFile = jest.fn().mockResolvedValue({ success: true });
    const copyTempToPermanent = jest.fn();
    const workflow = makeWorkflow({
      bcioData: bcio("git"),
      createLedgerFile,
      copyTempToPermanent,
    });

    await workflow.insertReceiptTransaction({
      ledgerId: "owner/ledger",
      receiptObjectKey: "tmp/r.pdf",
      input: baseInput,
      userId: "user_1",
    });

    expect(copyTempToPermanent).not.toHaveBeenCalled();
  });

  it("uses S3 strategy when receipt_storage='s3' (no git commit)", async () => {
    const createLedgerFile = jest.fn();
    const copyTempToPermanent = jest
      .fn()
      .mockResolvedValue({ filename: "r.pdf" });
    const workflow = makeWorkflow({
      bcioData: bcio("s3"),
      createLedgerFile,
      copyTempToPermanent,
    });

    await workflow.insertReceiptTransaction({
      ledgerId: "owner/ledger",
      receiptObjectKey: "tmp/r.pdf",
      input: baseInput,
      userId: "user_1",
    });

    expect(copyTempToPermanent).toHaveBeenCalledTimes(1);
    expect(createLedgerFile).not.toHaveBeenCalled();
  });

  it("defaults to S3 strategy for an unknown value", async () => {
    const copyTempToPermanent = jest
      .fn()
      .mockResolvedValue({ filename: "r.pdf" });
    const workflow = makeWorkflow({
      bcioData: bcio("dropbox"),
      copyTempToPermanent,
    });

    await workflow.insertReceiptTransaction({
      ledgerId: "owner/ledger",
      receiptObjectKey: "tmp/r.pdf",
      input: baseInput,
      userId: "user_1",
    });

    expect(copyTempToPermanent).toHaveBeenCalledTimes(1);
  });

  it("defaults to S3 strategy when bcio options are absent", async () => {
    const copyTempToPermanent = jest
      .fn()
      .mockResolvedValue({ filename: "r.pdf" });
    const workflow = makeWorkflow({ bcioData: undefined, copyTempToPermanent });

    await workflow.insertReceiptTransaction({
      ledgerId: "owner/ledger",
      receiptObjectKey: "tmp/r.pdf",
      input: baseInput,
      userId: "user_1",
    });

    expect(copyTempToPermanent).toHaveBeenCalledTimes(1);
  });
});

describe("s3 receipt storage strategy — temp cleanup ordering", () => {
  const order: string[] = [];

  const addBulkEntries = jest.fn();
  const copyTempToPermanent = jest.fn();
  const deleteTempAsset = jest.fn();

  beforeEach(() => {
    order.length = 0;
    addBulkEntries.mockReset();
    addBulkEntries.mockImplementation(async () => {
      order.push("write");
      return { success: true };
    });
    copyTempToPermanent.mockReset();
    copyTempToPermanent.mockImplementation(async () => {
      order.push("copy");
      return { filename: "r.pdf" };
    });
    deleteTempAsset.mockReset();
    deleteTempAsset.mockImplementation(async () => {
      order.push("delete");
    });
  });

  it("deletes the temp asset only AFTER the ledger write commits", async () => {
    const workflow = makeWorkflow({
      bcioData: undefined,
      addBulkEntries,
      copyTempToPermanent,
      deleteTempAsset,
    });

    await workflow.insertReceiptTransaction({
      ledgerId: "owner/ledger",
      receiptObjectKey: "tmp/2026-06-18-r.pdf",
      input: baseInput,
      userId: "user_1",
    });

    expect(order).toEqual(["copy", "write", "delete"]);
  });

  it("does NOT delete the temp asset when the ledger write fails (retry stays safe)", async () => {
    addBulkEntries.mockRejectedValue(new Error("ledger write failed"));
    const workflow = makeWorkflow({
      bcioData: undefined,
      addBulkEntries,
      copyTempToPermanent,
      deleteTempAsset,
    });

    await expect(
      workflow.insertReceiptTransaction({
        ledgerId: "owner/ledger",
        receiptObjectKey: "tmp/2026-06-18-r.pdf",
        input: baseInput,
        userId: "user_1",
      }),
    ).rejects.toThrow("ledger write failed");

    expect(copyTempToPermanent).toHaveBeenCalledTimes(1);
    expect(deleteTempAsset).not.toHaveBeenCalled();
  });
});
