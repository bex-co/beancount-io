import "reflect-metadata";
import {
  LedgerEntryMutationResolver,
  LedgerEntryType,
} from "../ledger-entry-resolver.mutation";
import { IContext } from "@/server/graphql/context";
import type { Identity } from "@/server/api/identity";
import { BadUserInputError } from "@/shared/errors";

const IDENTITY: Identity = {
  userId: "user-123",
  method: "oauth",
  scopes: new Set(),
};

describe("LedgerEntryMutationResolver", () => {
  let resolver: LedgerEntryMutationResolver;
  let mockContext: IContext;
  let mockLedgerEntryService: { addBulkEntries: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();

    mockLedgerEntryService = {
      addBulkEntries: jest.fn().mockResolvedValue({
        success: true,
        validation: { errorsBefore: 0, errorsAfter: 0, newErrors: [] },
      }),
    };

    mockContext = {
      platform: "web",
      getCurrentUserId: jest.fn().mockReturnValue("user-123"),
      getCurrentIdentity: jest.fn().mockReturnValue(IDENTITY),
    } as unknown as IContext;

    resolver = new LedgerEntryMutationResolver(mockLedgerEntryService as any);
  });

  it("delegates to ledgerEntry.addBulkEntries with parsed owner/name and userId", async () => {
    const result = await resolver.bulkEntries(
      "owner/my-ledger",
      [
        {
          type: LedgerEntryType.COMMODITY,
          commodity: { date: "2024-01-01", currency: "USD" },
        },
      ],
      mockContext,
    );

    expect(mockLedgerEntryService.addBulkEntries).toHaveBeenCalledWith(
      IDENTITY,
      "owner",
      "my-ledger",
      [{ type: "commodity", entry: { date: "2024-01-01", currency: "USD" } }],
      "web",
      false,
      false,
    );
    expect(result.success).toBe(true);
  });

  it("throws BadUserInputError when an entry's payload field is missing", async () => {
    await expect(
      resolver.bulkEntries(
        "owner/ledger",
        [{ type: LedgerEntryType.TRANSACTION }],
        mockContext,
      ),
    ).rejects.toThrow(BadUserInputError);

    expect(mockLedgerEntryService.addBulkEntries).not.toHaveBeenCalled();
  });

  it("propagates rejection from the service", async () => {
    mockLedgerEntryService.addBulkEntries.mockRejectedValue(
      new Error("ledger write failed"),
    );

    await expect(
      resolver.bulkEntries(
        "owner/ledger",
        [
          {
            type: LedgerEntryType.COMMODITY,
            commodity: { date: "2024-01-01", currency: "EUR" },
          },
        ],
        mockContext,
      ),
    ).rejects.toThrow("ledger write failed");
  });

  // w23/m9/t007: GraphQL nullable args arrive as explicit null when set
  // to null — that reads as missing, not as a conflicting false.
  it("treats explicit null flags as missing", async () => {
    await resolver.bulkEntries(
      "owner/my-ledger",
      [
        {
          type: LedgerEntryType.COMMODITY,
          commodity: { date: "2024-01-01", currency: "USD" },
        },
      ],
      mockContext,
      null as unknown as undefined,
      null as unknown as undefined,
      null as unknown as undefined,
      null as unknown as undefined,
    );

    expect(mockLedgerEntryService.addBulkEntries).toHaveBeenCalledWith(
      IDENTITY,
      "owner",
      "my-ledger",
      [{ type: "commodity", entry: { date: "2024-01-01", currency: "USD" } }],
      "web",
      false,
      false,
    );
  });

  it("previews when the twin is true and the native is null", async () => {
    await resolver.bulkEntries(
      "owner/my-ledger",
      [
        {
          type: LedgerEntryType.COMMODITY,
          commodity: { date: "2024-01-01", currency: "USD" },
        },
      ],
      mockContext,
      undefined,
      undefined,
      null as unknown as undefined,
      true,
    );

    expect(mockLedgerEntryService.addBulkEntries).toHaveBeenCalledWith(
      IDENTITY,
      "owner",
      "my-ledger",
      [{ type: "commodity", entry: { date: "2024-01-01", currency: "USD" } }],
      "web",
      false,
      true,
    );
  });
});
