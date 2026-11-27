import {
  fakeRedisIdempotency as mockFakeRedisIdempotency,
  fakeRedisIdempotencyState,
} from "@/foundation/redis/__tests__/fake-redis-idempotency";
import { LedgerEntryService } from "../ledger-entry-service";
import { LedgerReceiptWorkflow } from "@/features/ledger/workflow/ledger-receipt-workflow";
import { authorizeLedger } from "@/features/ledger/utils/authorize-ledger";
import type { LedgerEntryInput } from "../ledger-entry-service";
import type { Identity } from "@/server/api/identity";
import {
  BadUserInputError,
  ConflictError,
  ValidationError,
} from "@/shared/errors";

jest.mock(
  "@/foundation/redis/redis-idempotency",
  () => mockFakeRedisIdempotency,
);
jest.mock("@/features/ledger/utils/authorize-ledger", () => ({
  ...jest.requireActual("@/features/ledger/utils/authorize-ledger"),
  authorizeLedger: jest.fn(),
}));

const identity: Identity = {
  userId: "usr_1",
  method: "oauth",
  scopes: new Set(["ledger.write"]),
};
const rent: LedgerEntryInput[] = [
  {
    type: "transaction" as const,
    entry: {
      date: "2026-11-01",
      flag: "*",
      narration: "Rent",
      postings: [
        {
          account: "Expenses:Rent",
          units: { number: "2000", currency: "USD" },
        },
        { account: "Assets:Bank" },
      ],
    },
  },
];

function entryService() {
  const writer = {
    writeBulkEntries: jest
      .fn()
      .mockResolvedValue({ success: true, dryRun: false, entryHashes: ["h1"] }),
  };
  const directiveAppend = {
    appendDirectiveText: jest.fn().mockResolvedValue({
      success: true,
      message: "ok",
      dryRun: false,
      count: 1,
      wrote: [{ path: "main.bean", line: 9 }],
    }),
  };
  const service = new LedgerEntryService(
    writer as never,
    {} as never,
    directiveAppend as never,
  );
  return { service, writer, directiveAppend };
}

beforeEach(() => {
  fakeRedisIdempotencyState.reset();
  (authorizeLedger as jest.Mock).mockReset().mockResolvedValue({});
});

describe("addBulkEntries with a requestId", () => {
  it("returns the first result to a retry and writes once", async () => {
    const { service, writer } = entryService();
    const add = () =>
      service.addBulkEntries(
        identity,
        "alice",
        "books",
        rent,
        "web",
        false,
        false,
        "rent-a7f3",
      );

    const first = await add();
    const retry = await add();

    expect(retry).toEqual(first);
    expect(writer.writeBulkEntries).toHaveBeenCalledTimes(1);
  });

  it("authorizes every attempt, so a replay never reaches a caller without write access", async () => {
    const { service } = entryService();
    await service.addBulkEntries(
      identity,
      "alice",
      "books",
      rent,
      "web",
      false,
      false,
      "id",
    );
    (authorizeLedger as jest.Mock).mockRejectedValueOnce(new Error("denied"));

    await expect(
      service.addBulkEntries(
        identity,
        "alice",
        "books",
        rent,
        "web",
        false,
        false,
        "id",
      ),
    ).rejects.toThrow("denied");
  });

  it("refuses the same id with different entries", async () => {
    const { service } = entryService();
    await service.addBulkEntries(
      identity,
      "alice",
      "books",
      rent,
      "web",
      false,
      false,
      "id",
    );
    const changed = [
      { ...rent[0], entry: { ...rent[0].entry, narration: "Rent (Nov)" } },
    ] as LedgerEntryInput[];

    await expect(
      service.addBulkEntries(
        identity,
        "alice",
        "books",
        changed,
        "web",
        false,
        false,
        "id",
      ),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("keeps ids apart per ledger", async () => {
    const { service, writer } = entryService();
    await service.addBulkEntries(
      identity,
      "alice",
      "books",
      rent,
      "web",
      false,
      false,
      "id",
    );
    await service.addBulkEntries(
      identity,
      "alice",
      "other",
      rent,
      "web",
      false,
      false,
      "id",
    );

    expect(writer.writeBulkEntries).toHaveBeenCalledTimes(2);
  });

  it("leaves a dry run outside idempotency, since it writes nothing", async () => {
    const { service, writer } = entryService();
    await service.addBulkEntries(
      identity,
      "alice",
      "books",
      rent,
      "web",
      false,
      true,
      "id",
    );
    await service.addBulkEntries(
      identity,
      "alice",
      "books",
      rent,
      "web",
      false,
      false,
      "id",
    );

    expect(writer.writeBulkEntries).toHaveBeenCalledTimes(2);
    expect(fakeRedisIdempotencyState.records.size).toBe(1);
  });

  it("still saves when Redis is down", async () => {
    const { service, writer } = entryService();
    fakeRedisIdempotencyState.down = true;

    await expect(
      service.addBulkEntries(
        identity,
        "alice",
        "books",
        rent,
        "web",
        false,
        false,
        "id",
      ),
    ).resolves.toMatchObject({ success: true });
    expect(writer.writeBulkEntries).toHaveBeenCalledTimes(1);
  });

  it.each([false, true])(
    "refuses empty entries without touching Redis or writing (dryRun: %s, w31/048)",
    async (dryRun) => {
      const { service, writer } = entryService();
      const failure = await service
        .addBulkEntries(
          identity,
          "alice",
          "books",
          [],
          "web",
          false,
          dryRun,
          "empty-batch-1",
        )
        .catch((error: unknown) => error);

      expect(failure).toBeInstanceOf(BadUserInputError);
      expect(failure).toMatchObject({
        category: "BAD_USER_INPUT",
        message: "entries must contain at least one entry",
        metadata: { field: "entries" },
      });
      expect(writer.writeBulkEntries).not.toHaveBeenCalled();
      expect(fakeRedisIdempotencyState.records.size).toBe(0);
    },
  );
});

describe("appendDirectiveText with a requestId", () => {
  it("returns the first result to a retry and appends once", async () => {
    const { service, directiveAppend } = entryService();
    const input = {
      text: '2026-11-01 * "Rent"\n  Expenses:Rent 2000 USD\n  Assets:Bank\n',
    };

    const first = await service.appendDirectiveText(
      identity,
      "alice",
      "books",
      input,
      "txt-1",
    );
    const retry = await service.appendDirectiveText(
      identity,
      "alice",
      "books",
      input,
      "txt-1",
    );

    expect(retry).toEqual(first);
    expect(directiveAppend.appendDirectiveText).toHaveBeenCalledTimes(1);
  });

  it("answers a repeat while the first append runs with a retryable conflict", async () => {
    const { service, directiveAppend } = entryService();
    let finish!: (value: unknown) => void;
    directiveAppend.appendDirectiveText.mockImplementationOnce(
      () => new Promise((resolve) => (finish = resolve)),
    );
    const input = { text: '2026-11-01 note Assets:Bank "hi"\n' };

    const first = service.appendDirectiveText(
      identity,
      "alice",
      "books",
      input,
      "txt-2",
    );
    await new Promise((resolve) => setImmediate(resolve));
    await expect(
      service.appendDirectiveText(identity, "alice", "books", input, "txt-2"),
    ).rejects.toBeInstanceOf(ConflictError);
    finish({
      success: true,
      message: "ok",
      dryRun: false,
      count: 1,
      wrote: [],
    });
    await first;
    expect(directiveAppend.appendDirectiveText).toHaveBeenCalledTimes(1);
  });
});

/**
 * w1/195. A preview answered `valid: true` for a requestId the commit refuses,
 * so resending the approved preview with dry_run false failed on an argument
 * the preview had accepted. Both writes check the id the same way either way.
 */
describe("a requestId the commit refuses", () => {
  const writes = {
    addBulkEntries: (
      service: LedgerEntryService,
      dryRun: boolean,
      requestId: string,
    ) =>
      service.addBulkEntries(
        identity,
        "alice",
        "books",
        rent,
        "web",
        false,
        dryRun,
        requestId,
      ),
    appendDirectiveText: (
      service: LedgerEntryService,
      dryRun: boolean,
      requestId: string,
    ) =>
      service.appendDirectiveText(
        identity,
        "alice",
        "books",
        { text: '2026-11-01 note Assets:Bank "hi"\n', dryRun },
        requestId,
      ),
  };

  it.each(
    Object.keys(writes).flatMap((write) =>
      ["", "x".repeat(201)].map((id) => [write, id.length] as const),
    ),
  )(
    "%s refuses a %i-character id on a dry run as on a commit",
    async (write, length) => {
      const { service, writer, directiveAppend } = entryService();
      const call = writes[write as keyof typeof writes];
      const id = "x".repeat(length);
      for (const dryRun of [true, false]) {
        const refusal = await call(service, dryRun, id).catch(
          (error: unknown) => error,
        );
        expect(refusal).toBeInstanceOf(ValidationError);
        expect((refusal as ValidationError).message).toMatch(
          /requestId must be 1-200 characters/,
        );
      }
      expect(writer.writeBulkEntries).not.toHaveBeenCalled();
      expect(directiveAppend.appendDirectiveText).not.toHaveBeenCalled();
    },
  );

  it.each(
    Object.keys(writes).flatMap((write) =>
      ["   ", "\t\n"].map((id) => [write, id] as const),
    ),
  )(
    "%s refuses a whitespace-only requestId (%j) on a dry run and on a commit without touching Redis (w31/044)",
    async (write, id) => {
      const { service, writer, directiveAppend } = entryService();
      const call = writes[write as keyof typeof writes];
      for (const dryRun of [true, false]) {
        const refusal = await call(service, dryRun, id).catch(
          (error: unknown) => error,
        );
        expect(refusal).toBeInstanceOf(ValidationError);
        expect(refusal).toMatchObject({
          metadata: { field: "requestId" },
        });
      }
      expect(writer.writeBulkEntries).not.toHaveBeenCalled();
      expect(directiveAppend.appendDirectiveText).not.toHaveBeenCalled();
      expect(fakeRedisIdempotencyState.records.size).toBe(0);
    },
  );

  it.each(Object.keys(writes))(
    "%s still records nothing for a dry run with a valid id",
    async (write) => {
      const { service } = entryService();
      await writes[write as keyof typeof writes](service, true, "ok-id");
      expect(fakeRedisIdempotencyState.records.size).toBe(0);
    },
  );
});

/**
 * w31/136. A preview read nothing from the store, so it answered `valid: true`
 * for an id that had already committed a different write, and its commit was
 * refused; for an id that had committed the same write it projected a second
 * copy that its commit would never write.
 */
describe("a preview under an id that already committed", () => {
  const otherRent = [
    { ...rent[0], entry: { ...rent[0].entry, narration: "Rent (Nov)" } },
  ] as LedgerEntryInput[];
  const add = (service: LedgerEntryService, dryRun: boolean, entries = rent) =>
    service.addBulkEntries(
      identity,
      "alice",
      "books",
      entries,
      "web",
      false,
      dryRun,
      "id-1",
    );
  const append = (
    service: LedgerEntryService,
    dryRun: boolean,
    text = '2026-11-01 note Assets:Bank "hi"\n',
  ) =>
    service.appendDirectiveText(
      identity,
      "alice",
      "books",
      { text, dryRun },
      "id-1",
    );

  it("refuses a different structured write exactly as its commit does, without projecting it", async () => {
    const { service, writer } = entryService();
    await add(service, false);

    for (const dryRun of [true, false]) {
      const refusal = await add(service, dryRun, otherRent).catch(
        (error: unknown) => error,
      );
      expect(refusal).toBeInstanceOf(ValidationError);
      expect(refusal).toMatchObject({
        message: expect.stringContaining(
          "requestId was already used with a different write request",
        ),
        metadata: { field: "requestId" },
      });
    }
    expect(writer.writeBulkEntries).toHaveBeenCalledTimes(1);
  });

  it("refuses different text exactly as its commit does, without projecting it", async () => {
    const { service, directiveAppend } = entryService();
    await append(service, false);

    for (const dryRun of [true, false]) {
      await expect(
        append(service, dryRun, '2026-11-02 note Assets:Bank "other"\n'),
      ).rejects.toBeInstanceOf(ValidationError);
    }
    expect(directiveAppend.appendDirectiveText).toHaveBeenCalledTimes(1);
  });

  it("refuses a preview of the other kind of write under the same id", async () => {
    const { service, writer } = entryService();
    await append(service, false);

    await expect(add(service, true)).rejects.toBeInstanceOf(ValidationError);
    expect(writer.writeBulkEntries).not.toHaveBeenCalled();
  });

  it("says a structured commit would replay the first result instead of projecting a second copy", async () => {
    const { service, writer } = entryService();
    writer.writeBulkEntries.mockResolvedValueOnce({
      success: true,
      dryRun: false,
      message: "Added 1 entry successfully",
      files: ["main.bean"],
      entryHashes: ["h1"],
      commit: "c0ffee1",
      validation: {
        errorsBefore: 0,
        errorsAfter: 0,
        newErrors: [],
        valid: true,
      },
    });
    await add(service, false);

    const preview = await add(service, true);

    expect(writer.writeBulkEntries).toHaveBeenCalledTimes(1);
    expect(preview).toEqual({
      success: true,
      dryRun: true,
      replayed: true,
      message: expect.stringMatching(/^Would add nothing: .*c0ffee1/),
      files: [],
      entryHashes: [],
      preview: [],
      validation: {
        errorsBefore: 0,
        errorsAfter: 0,
        newErrors: [],
        valid: true,
      },
    });
    // The commit it previews replays the first result and writes nothing.
    await expect(add(service, false)).resolves.toMatchObject({
      commit: "c0ffee1",
      entryHashes: ["h1"],
    });
    expect(writer.writeBulkEntries).toHaveBeenCalledTimes(1);
  });

  it("says a text commit would replay the first result instead of projecting a second copy", async () => {
    const { service, directiveAppend } = entryService();
    directiveAppend.appendDirectiveText.mockResolvedValueOnce({
      success: true,
      message: "Added 1 directive to main.bean",
      dryRun: false,
      count: 1,
      wrote: [{ path: "main.bean", line: 9 }],
      entryHashes: ["h1"],
      diff: [],
      errorsBefore: 2,
      errorsAfter: 2,
      newErrors: [],
      valid: true,
      appendedUnsorted: [],
      commit: "c0ffee1",
    });
    await append(service, false);

    const preview = await append(service, true);

    expect(directiveAppend.appendDirectiveText).toHaveBeenCalledTimes(1);
    expect(preview).toEqual({
      success: true,
      message: expect.stringMatching(/^Would add nothing: .*c0ffee1/),
      dryRun: true,
      count: 1,
      wrote: [],
      entryHashes: [],
      diff: [],
      errorsBefore: 2,
      errorsAfter: 2,
      newErrors: [],
      valid: true,
      appendedUnsorted: [],
    });
  });

  it("previews as before, recording nothing, while the store is down", async () => {
    const { service, writer, directiveAppend } = entryService();
    await add(service, false);
    const stored = new Map(fakeRedisIdempotencyState.records);
    fakeRedisIdempotencyState.down = true;

    // Both would be refused with the store up: a different request, and the
    // other kind of write, under the committed id.
    await expect(add(service, true, otherRent)).resolves.toMatchObject({
      success: true,
    });
    await expect(append(service, true)).resolves.toMatchObject({
      success: true,
    });
    expect(writer.writeBulkEntries).toHaveBeenCalledTimes(2);
    expect(directiveAppend.appendDirectiveText).toHaveBeenCalledTimes(1);
    expect(fakeRedisIdempotencyState.records).toEqual(stored);
  });

  it("previews a fresh id without claiming it, so its commit writes once and is not replayed", async () => {
    const { service, writer } = entryService();
    writer.writeBulkEntries
      .mockResolvedValueOnce({ success: true, dryRun: true, preview: [] })
      .mockResolvedValueOnce({ success: true, dryRun: false, commit: "c1" });

    await add(service, true);
    expect(fakeRedisIdempotencyState.records.size).toBe(0);
    await expect(add(service, false)).resolves.toMatchObject({
      dryRun: false,
      commit: "c1",
    });
    expect(writer.writeBulkEntries).toHaveBeenCalledTimes(2);
  });
});

describe("insertReceiptTransaction with a requestId", () => {
  it("does not store the receipt or post the entry a second time on retry", async () => {
    const getAdminClient = jest.fn(() => ({
      ledgers: {
        getLedger: jest
          .fn()
          .mockResolvedValue({ data: { success: true, data: { id: 7 } } }),
      },
    }));
    const getPublicApiClient = jest.fn().mockResolvedValue({
      reports: {
        getLedgerBcioOptions: jest
          .fn()
          .mockResolvedValue({ data: { success: true, data: {} } }),
      },
    });
    const assetStorage = {
      copyTempToPermanent: jest.fn().mockResolvedValue({ filename: "r.pdf" }),
      generateDownloadUrl: jest
        .fn()
        .mockResolvedValue("https://example.test/r.pdf"),
      deleteTempAsset: jest.fn().mockResolvedValue(undefined),
    };
    const writer = {
      writeBulkEntries: jest.fn().mockResolvedValue({
        success: true,
        dryRun: false,
        files: ["main.bean"],
      }),
    };
    const authorizeOrThrow = jest.fn();
    const workflow = new LedgerReceiptWorkflow(
      { getPublicApiClient, getAdminClient } as never,
      assetStorage as never,
      writer as never,
      { dashboard: { url: "https://example.test" } } as never,
      { authorizeOrThrow } as never,
    );
    const params = {
      ledgerId: "alice/books",
      receiptObjectKey: "tmp/usr_1/r.pdf",
      identity,
      requestId: "rcpt-1",
      input: {
        date: "2026-11-01",
        payee: "Shop",
        description: "Receipt",
        postings: [
          {
            account: "Expenses:Food",
            amountNumber: "12.50",
            amountCurrency: "USD",
          },
          {
            account: "Assets:Cash",
            amountNumber: "-12.50",
            amountCurrency: "USD",
          },
        ],
        documentAccount: "Expenses:Food",
      },
    };

    const first = await workflow.insertReceiptTransaction(params);
    const writes = writer.writeBulkEntries.mock.calls.length;
    const retry = await workflow.insertReceiptTransaction(params);

    expect(retry).toEqual(first);
    expect(writer.writeBulkEntries).toHaveBeenCalledTimes(writes);
    expect(getPublicApiClient).toHaveBeenCalledTimes(1);
    expect(assetStorage.copyTempToPermanent).toHaveBeenCalledTimes(1);
    expect(authorizeOrThrow).toHaveBeenCalledTimes(2);
  });

  it.each(["   ", "\t\n"])(
    "refuses a whitespace-only requestId (%j) before touching Redis or promoting the receipt (w31/044)",
    async (requestId) => {
      const getAdminClient = jest.fn();
      const getPublicApiClient = jest.fn();
      const assetStorage = {
        copyTempToPermanent: jest.fn(),
        generateDownloadUrl: jest.fn(),
        deleteTempAsset: jest.fn(),
      };
      const writer = { writeBulkEntries: jest.fn() };
      const workflow = new LedgerReceiptWorkflow(
        { getPublicApiClient, getAdminClient } as never,
        assetStorage as never,
        writer as never,
        { dashboard: { url: "https://example.test" } } as never,
        { authorizeOrThrow: jest.fn() } as never,
      );

      await expect(
        workflow.insertReceiptTransaction({
          ledgerId: "alice/books",
          receiptObjectKey: "tmp/usr_1/r.pdf",
          identity,
          requestId,
          input: {
            date: "2026-11-01",
            payee: "Shop",
            description: "Receipt",
            postings: [
              {
                account: "Expenses:Food",
                amountNumber: "12.50",
                amountCurrency: "USD",
              },
              {
                account: "Assets:Cash",
                amountNumber: "-12.50",
                amountCurrency: "USD",
              },
            ],
            documentAccount: "Expenses:Food",
          },
        }),
      ).rejects.toMatchObject({
        category: "VALIDATION_FAILED",
        metadata: { field: "requestId" },
      });

      expect(fakeRedisIdempotencyState.records.size).toBe(0);
      expect(getPublicApiClient).not.toHaveBeenCalled();
      expect(assetStorage.copyTempToPermanent).not.toHaveBeenCalled();
      expect(writer.writeBulkEntries).not.toHaveBeenCalled();
    },
  );
});
