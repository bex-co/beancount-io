import "reflect-metadata";
import { LedgerJournalQueryResolver } from "../ledger-journal-resolver.query";
import { LedgerJournalMutationResolver } from "../ledger-journal-resolver.mutation";
import { IContext } from "@/server/graphql/context";
import type { Identity } from "@/server/api/identity";
import { BadUserInputError, InternalServerError } from "@/shared/errors";
import {
  DirectiveType,
  TransactionSubtype,
  DocumentSubtype,
  CustomSubtype,
} from "@/foundation/fava";

const IDENTITY: Identity = {
  userId: "user-123",
  method: "oauth",
  scopes: new Set(),
};

describe("LedgerJournalResolver", () => {
  let queryResolver: LedgerJournalQueryResolver;
  let mutationResolver: LedgerJournalMutationResolver;
  let mockContext: Partial<IContext>;
  let mockJournalService: {
    getJournal: jest.Mock;
    getContext: jest.Mock;
    plaintextJournal: jest.Mock;
    getAccountJournal: jest.Mock;
    deleteSourceSlice: jest.Mock;
    deleteMultiSourceSlices: jest.Mock;
    updateSourceSlice: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockJournalService = {
      getJournal: jest.fn(),
      getContext: jest.fn(),
      plaintextJournal: jest.fn(),
      getAccountJournal: jest.fn(),
      deleteSourceSlice: jest.fn(),
      deleteMultiSourceSlices: jest.fn(),
      updateSourceSlice: jest.fn(),
    };

    mockContext = {
      userId: "user-123",
      identity: IDENTITY,
      getCurrentUserId: jest.fn().mockReturnValue("user-123"),
      getCurrentIdentity: jest.fn().mockReturnValue(IDENTITY),
    };

    queryResolver = new LedgerJournalQueryResolver(mockJournalService as any);
    mutationResolver = new LedgerJournalMutationResolver(
      mockJournalService as any,
    );
  });

  describe("getLedgerJournal", () => {
    it("should delegate to service and return result", async () => {
      const expected = {
        total: 2,
        data: [{ date: "2024-01-01" }, { date: "2024-01-02" }],
        is_empty: false,
      };
      mockJournalService.getJournal.mockResolvedValue(expected);

      const result = await queryResolver.getLedgerJournal(
        "testuser/testrepo",
        mockContext as IContext,
        undefined,
      );

      expect(mockJournalService.getJournal).toHaveBeenCalledWith({
        ledgerId: "testuser/testrepo",
        identity: IDENTITY,
        query: undefined,
      });
      expect(result).toEqual(expected);
    });

    it("should pass query parameters to service", async () => {
      mockJournalService.getJournal.mockResolvedValue({
        total: 1,
        data: [{ date: "2024-01-01" }],
        is_empty: false,
      });

      const queryInput = {
        account: "Assets:Cash",
        filter: "payee:Test",
        time: "2024-01",
        limit: 50,
        offset: 10,
        directiveTypes: [DirectiveType.Transaction],
        transactionSubtypes: [TransactionSubtype.Cleared],
        documentSubtypes: [DocumentSubtype.Linked],
        customSubtypes: [CustomSubtype.Budget],
      };

      await queryResolver.getLedgerJournal(
        "testuser/testrepo",
        mockContext as IContext,
        queryInput,
      );

      expect(mockJournalService.getJournal).toHaveBeenCalledWith({
        ledgerId: "testuser/testrepo",
        identity: IDENTITY,
        query: queryInput,
      });
    });

    it("should propagate errors thrown by the service", async () => {
      mockJournalService.getJournal.mockRejectedValue(
        new InternalServerError("Failed to get journal"),
      );

      await expect(
        queryResolver.getLedgerJournal(
          "testuser/testrepo",
          mockContext as IContext,
          undefined,
        ),
      ).rejects.toThrow(InternalServerError);
    });
  });

  describe("getLedgerEntryContext", () => {
    it("should delegate to service and return result", async () => {
      const expected = {
        entry: { directive_type: "Transaction", date: "2024-01-01" },
        balances_before: { "Assets:Cash": ["-100.00 USD"] },
        balances_after: { "Assets:Cash": ["0.00 USD"] },
        sha256sum: "abc123def456",
        slice: "2024-01-01 * Test",
      };
      mockJournalService.getContext.mockResolvedValue(expected);

      const result = await queryResolver.getLedgerEntryContext(
        "testuser/testrepo",
        mockContext as IContext,
        "test-hash",
      );

      expect(mockJournalService.getContext).toHaveBeenCalledWith({
        ledgerId: "testuser/testrepo",
        identity: IDENTITY,
        entryHash: "test-hash",
      });
      expect(result).toEqual(expected);
    });

    it("should propagate errors thrown by the service", async () => {
      mockJournalService.getContext.mockRejectedValue(
        new InternalServerError("Failed to get entry context"),
      );

      await expect(
        queryResolver.getLedgerEntryContext(
          "testuser/testrepo",
          mockContext as IContext,
          "test-hash",
        ),
      ).rejects.toThrow(InternalServerError);
    });

    // w23/m3/t001: the snake spelling list output uses works too; two
    // different hashes refuse instead of guessing.
    it("should accept entry_hash and refuse conflicting duplicates", async () => {
      mockJournalService.getContext.mockResolvedValue({});

      await queryResolver.getLedgerEntryContext(
        "testuser/testrepo",
        mockContext as IContext,
        undefined,
        "test-hash",
      );
      expect(mockJournalService.getContext).toHaveBeenCalledWith({
        ledgerId: "testuser/testrepo",
        identity: IDENTITY,
        entryHash: "test-hash",
      });

      await expect(
        queryResolver.getLedgerEntryContext(
          "testuser/testrepo",
          mockContext as IContext,
          "hash-a",
          "hash-b",
        ),
      ).rejects.toThrow(BadUserInputError);
    });
  });

  describe("getLedgerPlaintextJournal", () => {
    it("should delegate to service and return result", async () => {
      const expected = { content: "2024-01-01 * Test\n  Assets:Cash -100 USD" };
      mockJournalService.plaintextJournal.mockResolvedValue(expected);

      const result = await queryResolver.getLedgerPlaintextJournal(
        "testuser/testrepo",
        mockContext as IContext,
        undefined,
      );

      expect(mockJournalService.plaintextJournal).toHaveBeenCalledWith({
        ledgerId: "testuser/testrepo",
        identity: IDENTITY,
        query: undefined,
      });
      expect(result).toEqual(expected);
    });

    it("should pass query parameters to service", async () => {
      mockJournalService.plaintextJournal.mockResolvedValue({
        content: "filtered",
      });

      const queryInput = {
        account: "Assets:Cash",
        filter: "payee:Test",
        time: "2024-01",
      };

      await queryResolver.getLedgerPlaintextJournal(
        "testuser/testrepo",
        mockContext as IContext,
        queryInput,
      );

      expect(mockJournalService.plaintextJournal).toHaveBeenCalledWith({
        ledgerId: "testuser/testrepo",
        identity: IDENTITY,
        query: queryInput,
      });
    });

    it("should propagate errors thrown by the service", async () => {
      mockJournalService.plaintextJournal.mockRejectedValue(
        new InternalServerError("Failed to get plaintext journal"),
      );

      await expect(
        queryResolver.getLedgerPlaintextJournal(
          "testuser/testrepo",
          mockContext as IContext,
          undefined,
        ),
      ).rejects.toThrow(InternalServerError);
    });
  });

  describe("getLedgerAccountJournal", () => {
    it("should delegate to service and return result", async () => {
      const expected = {
        items: [
          {
            entry: { directive_type: "Transaction", date: "2024-01-01" },
            change: { USD: "-100.00 USD" },
            balance: { USD: "-100.00 USD" },
          },
        ],
        total: 1,
        account: "Assets:Cash",
        with_children: true,
      };
      mockJournalService.getAccountJournal.mockResolvedValue(expected);

      const queryInput = {
        account: "Assets:Cash",
        limit: 20,
        offset: 0,
        with_children: true,
        conversion: "at_cost",
      };

      const result = await queryResolver.getLedgerAccountJournal(
        "testuser/testrepo",
        mockContext as IContext,
        queryInput,
      );

      expect(mockJournalService.getAccountJournal).toHaveBeenCalledWith({
        ledgerId: "testuser/testrepo",
        identity: IDENTITY,
        query: queryInput,
      });
      expect(result).toEqual(expected);
    });

    it("should propagate errors thrown by the service", async () => {
      mockJournalService.getAccountJournal.mockRejectedValue(
        new InternalServerError("Failed to get account journal"),
      );

      await expect(
        queryResolver.getLedgerAccountJournal(
          "testuser/testrepo",
          mockContext as IContext,
          { account: "Assets:Cash" },
        ),
      ).rejects.toThrow(InternalServerError);
    });

    // w23/m10/t007: explicit nulls read as missing, and a null native
    // never conflicts with a set twin.
    it("treats explicit null params as missing", async () => {
      mockJournalService.getAccountJournal.mockResolvedValue({ total: 0 });

      await queryResolver.getLedgerAccountJournal(
        "testuser/testrepo",
        mockContext as IContext,
        {
          account: "Assets:Cash",
          filterAccount: null,
          with_children: null,
        } as never,
      );

      expect(mockJournalService.getAccountJournal).toHaveBeenCalledWith({
        ledgerId: "testuser/testrepo",
        identity: expect.anything(),
        query: expect.objectContaining({
          filterAccount: undefined,
          with_children: undefined,
        }),
      });
    });

    it("resolves the twin when the native is null", async () => {
      mockJournalService.getAccountJournal.mockResolvedValue({ total: 0 });

      await queryResolver.getLedgerAccountJournal(
        "testuser/testrepo",
        mockContext as IContext,
        {
          account: "Assets:Cash",
          with_children: null,
          withChildren: false,
        } as never,
      );

      expect(mockJournalService.getAccountJournal).toHaveBeenCalledWith({
        ledgerId: "testuser/testrepo",
        identity: expect.anything(),
        query: expect.objectContaining({ with_children: false }),
      });
    });
  });

  describe("deleteLedgerEntrySourceSlice", () => {
    it("should delegate to service and return result", async () => {
      const expected = {
        message: "Deleted",
        entryHash: "test-entry-hash",
        dryRun: false,
      };
      mockJournalService.deleteSourceSlice.mockResolvedValue(expected);

      const result = await mutationResolver.deleteLedgerEntrySourceSlice(
        "testuser/testrepo",
        { entryHash: "test-entry-hash", sha256sum: "abc123" },
        mockContext as IContext,
      );

      expect(mockJournalService.deleteSourceSlice).toHaveBeenCalledWith({
        ledgerId: "testuser/testrepo",
        identity: IDENTITY,
        entryHash: "test-entry-hash",
        sha256sum: "abc123",
        allowInvalid: false,
        dryRun: false,
      });
      expect(result).toEqual({ ...expected, preview: [] });
    });

    it("should propagate errors thrown by the service", async () => {
      mockJournalService.deleteSourceSlice.mockRejectedValue(
        new InternalServerError("Failed to delete source slice"),
      );

      await expect(
        mutationResolver.deleteLedgerEntrySourceSlice(
          "testuser/testrepo",
          { entryHash: "hash", sha256sum: "sha" },
          mockContext as IContext,
        ),
      ).rejects.toThrow(InternalServerError);
    });
  });

  describe("deleteMultipleLedgerEntrySourceSlices", () => {
    it("should delegate to service and return result", async () => {
      const expected = {
        message: "Deleted 2 entries",
        deletedHashes: ["hash-1", "hash-2"],
        dryRun: false,
      };
      mockJournalService.deleteMultiSourceSlices.mockResolvedValue(expected);

      const result =
        await mutationResolver.deleteMultipleLedgerEntrySourceSlices(
          "testuser/testrepo",
          {
            entries: [
              { entryHash: "hash-1", sha256sum: "sha-1" },
              { entryHash: "hash-2", sha256sum: "sha-2" },
            ],
          },
          mockContext as IContext,
        );

      expect(mockJournalService.deleteMultiSourceSlices).toHaveBeenCalledWith({
        ledgerId: "testuser/testrepo",
        identity: IDENTITY,
        entries: [
          { entryHash: "hash-1", sha256sum: "sha-1" },
          { entryHash: "hash-2", sha256sum: "sha-2" },
        ],
        allowInvalid: false,
        dryRun: false,
      });
      expect(result).toEqual({ ...expected, preview: [] });
    });

    it("should propagate errors thrown by the service", async () => {
      mockJournalService.deleteMultiSourceSlices.mockRejectedValue(
        new InternalServerError("Failed to delete source slices"),
      );

      await expect(
        mutationResolver.deleteMultipleLedgerEntrySourceSlices(
          "testuser/testrepo",
          { entries: [{ entryHash: "h", sha256sum: "s" }] },
          mockContext as IContext,
        ),
      ).rejects.toThrow(InternalServerError);
    });
  });

  describe("updateLedgerEntrySourceSlice", () => {
    it("should delegate to service and return result", async () => {
      const expected = {
        message: "Updated",
        entryHash: "test-entry-hash",
        newSha256sum: "new-sha",
        dryRun: false,
      };
      mockJournalService.updateSourceSlice.mockResolvedValue(expected);

      const result = await mutationResolver.updateLedgerEntrySourceSlice(
        "testuser/testrepo",
        {
          entryHash: "test-entry-hash",
          sha256sum: "abc123",
          newContent: "2024-01-01 * Updated",
        },
        { ...mockContext, platform: "mobile" } as IContext,
      );

      expect(mockJournalService.updateSourceSlice).toHaveBeenCalledWith({
        ledgerId: "testuser/testrepo",
        identity: IDENTITY,
        entryHash: "test-entry-hash",
        sha256sum: "abc123",
        newContent: "2024-01-01 * Updated",
        platform: "mobile",
        allowInvalid: false,
        dryRun: false,
      });
      expect(result).toEqual({ ...expected, preview: [] });
    });

    it("should propagate errors thrown by the service", async () => {
      mockJournalService.updateSourceSlice.mockRejectedValue(
        new InternalServerError("Failed to update source slice"),
      );

      await expect(
        mutationResolver.updateLedgerEntrySourceSlice(
          "testuser/testrepo",
          { entryHash: "h", sha256sum: "s", newContent: "content" },
          mockContext as IContext,
        ),
      ).rejects.toThrow(InternalServerError);
    });
  });
});
