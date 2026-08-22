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
  capabilityExempt: false,
};

describe("LedgerEntryMutationResolver", () => {
  let resolver: LedgerEntryMutationResolver;
  let mockContext: IContext;
  let mockLedgerEntryService: { addBulkEntries: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();

    mockLedgerEntryService = {
      addBulkEntries: jest.fn().mockResolvedValue({ success: true }),
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
});
