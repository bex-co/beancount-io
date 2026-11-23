import { LedgerJournalService } from "../ledger-journal-service";
import {
  BadUserInputError,
  ConflictError,
  InternalServerError,
  NotFoundError,
} from "@/shared/errors";
import { FavaApiError } from "@/foundation/fava";
import {
  CustomSubtype,
  DirectiveType,
  DocumentSubtype,
  TransactionSubtype,
} from "@/foundation/fava";
import { authorizeLedger } from "@/features/ledger/utils/authorize-ledger";
import type { Identity } from "@/server/api/identity";

// Exercises this service's own behavior; authorizeLedger has its own suite.
jest.mock("@/features/ledger/utils/authorize-ledger", () => ({
  ...jest.requireActual("@/features/ledger/utils/authorize-ledger"),
  authorizeLedger: jest.fn(),
}));

const mockGetJournal = jest.fn();
const mockGetContext = jest.fn();
const mockPlaintextJournal = jest.fn();
const mockGetAccountJournal = jest.fn();
const mockDeleteSourceSlice = jest.fn();
const mockDeleteMultiSourceSlices = jest.fn();
const mockMoveSourceSlices = jest.fn();
const mockUpdateSourceSlice = jest.fn();

const mockFavaApiClient = {
  journal: {
    getJournal: mockGetJournal,
    getContext: mockGetContext,
    plaintextJournal: mockPlaintextJournal,
    getAccountJournal: mockGetAccountJournal,
    deleteSourceSlice: mockDeleteSourceSlice,
    deleteMultiSourceSlices: mockDeleteMultiSourceSlices,
    moveSourceSlices: mockMoveSourceSlices,
    updateSourceSlice: mockUpdateSourceSlice,
  },
};

const mockFavaClientFactory = {
  getPublicApiClient: jest.fn().mockResolvedValue(mockFavaApiClient),
};

const LEDGER_ID = "testowner/testledger";
const USER_ID = "user-123";
const IDENTITY: Identity = {
  userId: USER_ID,
  method: "oauth",
  scopes: new Set(),
};

describe("LedgerJournalService", () => {
  let service: LedgerJournalService;

  beforeEach(() => {
    jest.clearAllMocks();
    (authorizeLedger as jest.Mock).mockResolvedValue({
      ledgerRepoId: 1,
      ownerUserId: USER_ID,
    });
    service = new LedgerJournalService(mockFavaClientFactory as any, {} as any);
  });

  describe("getJournal", () => {
    it("returns mapped journal data on success", async () => {
      mockGetJournal.mockResolvedValue({
        data: {
          success: true,
          data: { total: 5, items: [{ id: 1 }], is_empty: false },
        },
      });

      const result = await service.getJournal({
        ledgerId: LEDGER_ID,
        identity: IDENTITY,
      });

      expect(result).toEqual({ total: 5, data: [{ id: 1 }], is_empty: false });
      expect(mockGetJournal).toHaveBeenCalledWith("testowner", "testledger", {
        account: undefined,
        filter: undefined,
        time: undefined,
        directive_types: undefined,
        limit: 20,
        offset: 0,
        transaction_subtypes: undefined,
        document_subtypes: undefined,
        custom_subtypes: undefined,
      });
    });

    it("passes query params to the fava client", async () => {
      mockGetJournal.mockResolvedValue({
        data: {
          success: true,
          data: { total: 0, items: [], is_empty: true },
        },
      });

      await service.getJournal({
        ledgerId: LEDGER_ID,
        identity: IDENTITY,
        query: {
          account: "Assets:Cash",
          limit: 50,
          offset: 10,
          filter: "year:2024",
        },
      });

      expect(mockGetJournal).toHaveBeenCalledWith(
        "testowner",
        "testledger",
        expect.objectContaining({
          account: "Assets:Cash",
          limit: 50,
          offset: 10,
          filter: "year:2024",
        }),
      );
    });

    it("throws InternalServerError when fava response is not successful", async () => {
      mockGetJournal.mockResolvedValue({ data: { success: false } });

      await expect(
        service.getJournal({ ledgerId: LEDGER_ID, identity: IDENTITY }),
      ).rejects.toThrow(InternalServerError);
    });

    it("maps a ledger 400 for a malformed filter to BadUserInputError", async () => {
      mockGetJournal.mockRejectedValue(
        new FavaApiError("Unexpected end of filter", 400, {
          success: false,
          error: "Unexpected end of filter",
        }),
      );

      await expect(
        service.getJournal({
          ledgerId: LEDGER_ID,
          identity: IDENTITY,
          query: { filter: "(" },
        }),
      ).rejects.toThrow(BadUserInputError);
    });
  });

  describe("getContext", () => {
    // Entry hashes are 32 lowercase hex digits.
    const DEAD = "de".repeat(16);
    const ABC = "ab".repeat(16);
    const H = "0f".repeat(16);
    const X = "9a".repeat(16);

    it("maps a ledger 404 for a dead entry hash to NotFoundError", async () => {
      mockGetContext.mockRejectedValue(
        new FavaApiError("Entry not found", 404, { error: "Entry not found" }),
      );

      await expect(
        service.getContext({
          ledgerId: LEDGER_ID,
          identity: IDENTITY,
          entryHash: DEAD,
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it("returns mapped entry context on success", async () => {
      mockGetContext.mockResolvedValue({
        data: {
          success: true,
          data: {
            entry: { type: "TxnPosting" },
            balances_before: { "Assets:Cash": ["100 USD"] },
            balances_after: null,
            sha256sum: "abc123",
            slice: "some slice",
          },
        },
      });

      const result = await service.getContext({
        ledgerId: LEDGER_ID,
        identity: IDENTITY,
        entryHash: ABC,
      });

      expect(result.sha256sum).toBe("abc123");
      expect(result.slice).toBe("some slice");
      expect(result.balances_before).toEqual({ "Assets:Cash": ["100 USD"] });
      expect(mockGetContext).toHaveBeenCalledWith(
        "testowner",
        "testledger",
        ABC,
      );
    });

    it("passes through the managed price source, defaulting to null", async () => {
      const context = (managed_source?: string | null) => ({
        data: {
          success: true,
          data: { entry: {}, sha256sum: "s", slice: "x", managed_source },
        },
      });
      mockGetContext.mockResolvedValueOnce(
        context("https://beancount.io/prices/BTC-USD"),
      );
      const managed = await service.getContext({
        ledgerId: LEDGER_ID,
        identity: IDENTITY,
        entryHash: H,
      });
      expect(managed.managed_source).toBe(
        "https://beancount.io/prices/BTC-USD",
      );

      // An older ledger service omits the field: read as "not managed".
      mockGetContext.mockResolvedValueOnce(context(undefined));
      const plain = await service.getContext({
        ledgerId: LEDGER_ID,
        identity: IDENTITY,
        entryHash: H,
      });
      expect(plain.managed_source).toBeNull();
    });

    it("throws InternalServerError on failure", async () => {
      mockGetContext.mockResolvedValue({ data: { success: false } });

      await expect(
        service.getContext({
          ledgerId: LEDGER_ID,
          identity: IDENTITY,
          entryHash: X,
        }),
      ).rejects.toThrow(InternalServerError);
    });
  });

  describe("plaintextJournal", () => {
    it("returns content on success", async () => {
      mockPlaintextJournal.mockResolvedValue({
        data: { success: true, data: { content: "2024-01-01 * ...\n" } },
      });

      const result = await service.plaintextJournal({
        ledgerId: LEDGER_ID,
        identity: IDENTITY,
      });

      expect(result.content).toBe("2024-01-01 * ...\n");
    });

    it("throws InternalServerError on failure", async () => {
      mockPlaintextJournal.mockResolvedValue({ data: { success: false } });

      await expect(
        service.plaintextJournal({ ledgerId: LEDGER_ID, identity: IDENTITY }),
      ).rejects.toThrow(InternalServerError);
    });

    it("maps a ledger 400 for a malformed filter to BadUserInputError", async () => {
      mockPlaintextJournal.mockRejectedValue(
        new FavaApiError("Unexpected end of filter", 400, {
          success: false,
          error: "Unexpected end of filter",
        }),
      );

      await expect(
        service.plaintextJournal({
          ledgerId: LEDGER_ID,
          identity: IDENTITY,
          query: { filter: "(" },
        }),
      ).rejects.toThrow(BadUserInputError);
    });
  });

  describe("getAccountJournal", () => {
    it("returns mapped account journal on success", async () => {
      mockGetAccountJournal.mockResolvedValue({
        data: {
          success: true,
          data: {
            items: [
              {
                entry: { id: 1 },
                change: { USD: "100" },
                balance: { USD: "200" },
              },
            ],
            total: 1,
            account: "Assets:Cash",
            with_children: false,
          },
        },
      });

      const result = await service.getAccountJournal({
        ledgerId: LEDGER_ID,
        identity: IDENTITY,
        query: { account: "Assets:Cash" },
      });

      expect(result.account).toBe("Assets:Cash");
      expect(result.total).toBe(1);
      expect(result.items[0].change).toEqual({ USD: "100" });
    });

    it("defaults with_children to true and conversion to at_cost", async () => {
      mockGetAccountJournal.mockResolvedValue({
        data: {
          success: true,
          data: {
            items: [],
            total: 0,
            account: "Assets:Cash",
            with_children: true,
          },
        },
      });

      await service.getAccountJournal({
        ledgerId: LEDGER_ID,
        identity: IDENTITY,
        query: { account: "Assets:Cash" },
      });

      expect(mockGetAccountJournal).toHaveBeenCalledWith(
        "testowner",
        "testledger",
        expect.objectContaining({
          with_children: true,
          conversion: "at_cost",
          directive_types: undefined,
          transaction_subtypes: undefined,
          document_subtypes: undefined,
          custom_subtypes: undefined,
        }),
      );
    });

    it("forwards optional display selectors to the ledger client", async () => {
      mockGetAccountJournal.mockResolvedValue({
        data: {
          success: true,
          data: {
            items: [],
            total: 0,
            account: "Assets:Cash",
            with_children: true,
          },
        },
      });

      await service.getAccountJournal({
        ledgerId: LEDGER_ID,
        identity: IDENTITY,
        query: {
          account: "Assets:Cash",
          directiveTypes: [DirectiveType.Transaction],
          transactionSubtypes: [TransactionSubtype.Pending],
          documentSubtypes: [DocumentSubtype.Linked],
          customSubtypes: [CustomSubtype.Budget],
        },
      });

      expect(mockGetAccountJournal).toHaveBeenCalledWith(
        "testowner",
        "testledger",
        expect.objectContaining({
          directive_types: [DirectiveType.Transaction],
          transaction_subtypes: [TransactionSubtype.Pending],
          document_subtypes: [DocumentSubtype.Linked],
          custom_subtypes: [CustomSubtype.Budget],
        }),
      );
    });

    it("throws InternalServerError on failure", async () => {
      mockGetAccountJournal.mockResolvedValue({ data: { success: false } });

      await expect(
        service.getAccountJournal({
          ledgerId: LEDGER_ID,
          identity: IDENTITY,
          query: { account: "A" },
        }),
      ).rejects.toThrow(InternalServerError);
    });

    it("maps a ledger 400 for a malformed filter to BadUserInputError", async () => {
      mockGetAccountJournal.mockRejectedValue(
        new FavaApiError("Unexpected end of filter", 400, {
          success: false,
          error: "Unexpected end of filter",
        }),
      );

      await expect(
        service.getAccountJournal({
          ledgerId: LEDGER_ID,
          identity: IDENTITY,
          query: { account: "Income:US:Hoogle:Salary", filter: "(" },
        }),
      ).rejects.toThrow(BadUserInputError);
    });

    it.each(["", "  ", "\t", "\n"])(
      "refuses empty or whitespace-only account=%j as BadUserInputError before calling the ledger",
      async (blankAccount) => {
        mockGetAccountJournal.mockResolvedValue({
          data: {
            success: true,
            data: {
              items: [],
              total: 0,
              account: blankAccount,
              with_children: true,
            },
          },
        });
        const failure = await service
          .getAccountJournal({
            ledgerId: LEDGER_ID,
            identity: IDENTITY,
            query: { account: blankAccount },
          })
          .catch((error: unknown) => error);

        expect(failure).toBeInstanceOf(BadUserInputError);
        expect(failure).toMatchObject({
          category: "BAD_USER_INPUT",
          metadata: { field: "account" },
        });
        expect(mockGetAccountJournal).not.toHaveBeenCalled();
      },
    );
  });

  describe("deleteSourceSlice", () => {
    const HASH_ABC = "ab".repeat(16);
    const HASH_DUP = `${"ab".repeat(16)}:2`;
    const SHA_ABC = "a1".repeat(32);

    it("returns message and entryHash on success", async () => {
      mockDeleteSourceSlice.mockResolvedValue({
        data: {
          success: true,
          data: { message: "Deleted", entry_hash: HASH_ABC },
        },
      });

      const result = await service.deleteSourceSlice({
        ledgerId: LEDGER_ID,
        identity: IDENTITY,
        entryHash: HASH_ABC,
        sha256sum: SHA_ABC,
      });

      expect(result.message).toBe("Deleted");
      expect(result.entryHash).toBe(HASH_ABC);
      expect(mockDeleteSourceSlice).toHaveBeenCalledWith(
        "testowner",
        "testledger",
        { entry_hash: HASH_ABC, sha256sum: SHA_ABC },
      );
    });

    it("accepts a valid duplicate :<n> entryHash suffix", async () => {
      mockDeleteSourceSlice.mockResolvedValue({
        data: {
          success: true,
          data: { message: "Deleted", entry_hash: HASH_DUP },
        },
      });

      const result = await service.deleteSourceSlice({
        ledgerId: LEDGER_ID,
        identity: IDENTITY,
        entryHash: HASH_DUP,
        sha256sum: SHA_ABC,
      });

      expect(result.entryHash).toBe(HASH_DUP);
      expect(mockDeleteSourceSlice).toHaveBeenCalledWith(
        "testowner",
        "testledger",
        { entry_hash: HASH_DUP, sha256sum: SHA_ABC },
      );
    });

    it.each(["", "   ", "not-a-hash", HASH_ABC.toUpperCase(), `${HASH_ABC}:0`])(
      "refuses malformed entryHash=%j with BadUserInputError before calling the ledger",
      async (badHash) => {
        const failure = await service
          .deleteSourceSlice({
            ledgerId: LEDGER_ID,
            identity: IDENTITY,
            entryHash: badHash,
            sha256sum: SHA_ABC,
            dryRun: true,
          })
          .catch((error: unknown) => error);

        expect(failure).toBeInstanceOf(BadUserInputError);
        expect(failure).toMatchObject({
          category: "BAD_USER_INPUT",
          metadata: { field: "entryHash" },
        });
        expect(mockDeleteSourceSlice).not.toHaveBeenCalled();
      },
    );

    it.each(["", "   ", "not-a-sha", HASH_ABC, SHA_ABC.toUpperCase()])(
      "refuses malformed sha256sum=%j with BadUserInputError before calling the ledger",
      async (badSha) => {
        const failure = await service
          .deleteSourceSlice({
            ledgerId: LEDGER_ID,
            identity: IDENTITY,
            entryHash: HASH_ABC,
            sha256sum: badSha,
            dryRun: true,
          })
          .catch((error: unknown) => error);

        expect(failure).toBeInstanceOf(BadUserInputError);
        expect(failure).toMatchObject({
          category: "BAD_USER_INPUT",
          metadata: { field: "sha256sum" },
        });
        expect(mockDeleteSourceSlice).not.toHaveBeenCalled();
      },
    );

    it("throws InternalServerError on failure", async () => {
      mockDeleteSourceSlice.mockResolvedValue({ data: { success: false } });

      await expect(
        service.deleteSourceSlice({
          ledgerId: LEDGER_ID,
          identity: IDENTITY,
          entryHash: HASH_ABC,
          sha256sum: SHA_ABC,
        }),
      ).rejects.toThrow(InternalServerError);
    });
  });

  describe("deleteMultiSourceSlices", () => {
    const H1 = "1a".repeat(16);
    const H2 = "2b".repeat(16);
    const H2_DUP = `${H2}:1`;
    const S1 = "1a".repeat(32);
    const S2 = "2b".repeat(32);

    it("returns message and deletedHashes on success", async () => {
      mockDeleteMultiSourceSlices.mockResolvedValue({
        data: {
          success: true,
          data: { message: "Deleted 2", deleted_hashes: [H1, H2_DUP] },
        },
      });

      const result = await service.deleteMultiSourceSlices({
        ledgerId: LEDGER_ID,
        identity: IDENTITY,
        entries: [
          { entryHash: H1, sha256sum: S1 },
          { entryHash: H2_DUP, sha256sum: S2 },
        ],
      });

      expect(result.deletedCount).toBe(2);
      expect(mockDeleteMultiSourceSlices).toHaveBeenCalledWith(
        "testowner",
        "testledger",
        {
          entries: [
            { entry_hash: H1, sha256sum: S1 },
            { entry_hash: H2_DUP, sha256sum: S2 },
          ],
        },
      );
    });

    it.each(["", "   ", "not-a-hash", H1.toUpperCase(), `${H1}:0`])(
      "refuses malformed entryHash=%j in any entry with BadUserInputError before calling the ledger",
      async (badHash) => {
        const failure = await service
          .deleteMultiSourceSlices({
            ledgerId: LEDGER_ID,
            identity: IDENTITY,
            entries: [
              { entryHash: H1, sha256sum: S1 },
              { entryHash: badHash, sha256sum: S2 },
            ],
            dryRun: true,
          })
          .catch((error: unknown) => error);

        expect(failure).toBeInstanceOf(BadUserInputError);
        expect(failure).toMatchObject({
          category: "BAD_USER_INPUT",
          metadata: { field: "entryHash" },
        });
        expect(mockDeleteMultiSourceSlices).not.toHaveBeenCalled();
      },
    );

    it.each(["", "   ", "not-a-sha", H2, S2.toUpperCase()])(
      "refuses malformed sha256sum=%j in any entry with BadUserInputError before calling the ledger",
      async (badSha) => {
        const failure = await service
          .deleteMultiSourceSlices({
            ledgerId: LEDGER_ID,
            identity: IDENTITY,
            entries: [
              { entryHash: H1, sha256sum: S1 },
              { entryHash: H2, sha256sum: badSha },
            ],
            dryRun: true,
          })
          .catch((error: unknown) => error);

        expect(failure).toBeInstanceOf(BadUserInputError);
        expect(failure).toMatchObject({
          category: "BAD_USER_INPUT",
          metadata: { field: "sha256sum" },
        });
        expect(mockDeleteMultiSourceSlices).not.toHaveBeenCalled();
      },
    );

    it("throws InternalServerError on failure", async () => {
      mockDeleteMultiSourceSlices.mockResolvedValue({
        data: { success: false },
      });

      await expect(
        service.deleteMultiSourceSlices({
          ledgerId: LEDGER_ID,
          identity: IDENTITY,
          entries: [{ entryHash: H1, sha256sum: S1 }],
        }),
      ).rejects.toThrow(InternalServerError);
    });

    it.each([false, true])(
      "refuses empty entries with BadUserInputError without calling the ledger (dryRun: %s)",
      async (dryRun) => {
        const failure = await service
          .deleteMultiSourceSlices({
            ledgerId: LEDGER_ID,
            identity: IDENTITY,
            entries: [],
            dryRun,
          })
          .catch((error: unknown) => error);

        expect(failure).toBeInstanceOf(BadUserInputError);
        expect(failure).toMatchObject({
          category: "BAD_USER_INPUT",
          message: "entries must name at least one entry",
          metadata: { field: "entries" },
        });
        expect(mockDeleteMultiSourceSlices).not.toHaveBeenCalled();
      },
    );
  });

  describe("moveSourceSlices", () => {
    const H1 = "3c".repeat(16);
    const H2_DUP = `${"4d".repeat(16)}:1`;
    const S1 = "3c".repeat(32);
    const S2 = "4d".repeat(32);

    it("forwards valid hashes including :<n> suffixes to the ledger", async () => {
      mockMoveSourceSlices.mockResolvedValue({
        data: {
          success: true,
          data: {
            message: "Moved 2 entries to 2026.bean",
            moved_hashes: [H1, H2_DUP],
            include_added: false,
            files: ["main.bean", "2026.bean"],
          },
        },
      });

      const result = await service.moveSourceSlices({
        ledgerId: LEDGER_ID,
        identity: IDENTITY,
        entries: [
          { entryHash: H1, sha256sum: S1 },
          { entryHash: H2_DUP, sha256sum: S2 },
        ],
        toPath: "2026.bean",
      });

      expect(result.movedHashes).toEqual([H1, H2_DUP]);
      expect(mockMoveSourceSlices).toHaveBeenCalledWith(
        "testowner",
        "testledger",
        {
          entries: [
            { entry_hash: H1, sha256sum: S1 },
            { entry_hash: H2_DUP, sha256sum: S2 },
          ],
          to_path: "2026.bean",
        },
      );
    });

    it.each(["", "   ", "not-a-hash", H1.toUpperCase(), `${H1}:0`])(
      "refuses malformed entryHash=%j in any entry with BadUserInputError before calling the ledger",
      async (badHash) => {
        const failure = await service
          .moveSourceSlices({
            ledgerId: LEDGER_ID,
            identity: IDENTITY,
            entries: [
              { entryHash: H1, sha256sum: S1 },
              { entryHash: badHash, sha256sum: S2 },
            ],
            toPath: "2026.bean",
            dryRun: true,
          })
          .catch((error: unknown) => error);

        expect(failure).toBeInstanceOf(BadUserInputError);
        expect(failure).toMatchObject({
          category: "BAD_USER_INPUT",
          metadata: { field: "entryHash" },
        });
        expect(mockMoveSourceSlices).not.toHaveBeenCalled();
      },
    );

    it.each(["", "   ", "not-a-sha", H1, S2.toUpperCase()])(
      "refuses malformed sha256sum=%j in any entry with BadUserInputError before calling the ledger",
      async (badSha) => {
        const failure = await service
          .moveSourceSlices({
            ledgerId: LEDGER_ID,
            identity: IDENTITY,
            entries: [
              { entryHash: H1, sha256sum: S1 },
              { entryHash: H2_DUP, sha256sum: badSha },
            ],
            toPath: "2026.bean",
            dryRun: true,
          })
          .catch((error: unknown) => error);

        expect(failure).toBeInstanceOf(BadUserInputError);
        expect(failure).toMatchObject({
          category: "BAD_USER_INPUT",
          metadata: { field: "sha256sum" },
        });
        expect(mockMoveSourceSlices).not.toHaveBeenCalled();
      },
    );
  });

  describe("updateSourceSlice", () => {
    const HASH_OLD = "aa".repeat(16);
    const HASH_NEW = "bb".repeat(16);
    const HASH_STALE = "cc".repeat(16);
    const HASH_DUP = `${HASH_OLD}:1`;
    const SHA_OLD = "5e".repeat(32);
    const SHA_NEW = "6f".repeat(32);

    it("returns mapped result on success", async () => {
      mockUpdateSourceSlice.mockResolvedValue({
        data: {
          success: true,
          data: {
            message: "Updated",
            entry_hash: HASH_NEW,
            new_sha256sum: SHA_NEW,
            new_entry_hash: HASH_NEW,
          },
        },
      });

      const result = await service.updateSourceSlice({
        ledgerId: LEDGER_ID,
        identity: IDENTITY,
        entryHash: HASH_OLD,
        sha256sum: SHA_OLD,
        newContent: '2024-01-02 * "new"\n',
      });

      expect(result.newSha256sum).toBe(SHA_NEW);
      expect(result.entryHash).toBe(HASH_NEW);
      expect(result.newEntryHash).toBe(HASH_NEW);
      expect(mockUpdateSourceSlice).toHaveBeenCalledWith(
        "testowner",
        "testledger",
        {
          entry_hash: HASH_OLD,
          sha256sum: SHA_OLD,
          new_content: '2024-01-02 * "new"\n',
        },
        {},
      );
    });

    it("accepts a valid duplicate :<n> entryHash suffix", async () => {
      mockUpdateSourceSlice.mockResolvedValue({
        data: {
          success: true,
          data: {
            message: "Updated",
            entry_hash: HASH_NEW,
            new_sha256sum: SHA_NEW,
            new_entry_hash: HASH_NEW,
          },
        },
      });

      await service.updateSourceSlice({
        ledgerId: LEDGER_ID,
        identity: IDENTITY,
        entryHash: HASH_DUP,
        sha256sum: SHA_OLD,
        newContent: '2024-01-02 * "new"\n',
      });

      expect(mockUpdateSourceSlice).toHaveBeenCalledWith(
        "testowner",
        "testledger",
        expect.objectContaining({ entry_hash: HASH_DUP }),
        {},
      );
    });

    it.each(["", "   ", "not-a-hash", HASH_OLD.toUpperCase(), `${HASH_OLD}:0`])(
      "refuses malformed entryHash=%j with BadUserInputError before calling the ledger",
      async (badHash) => {
        const failure = await service
          .updateSourceSlice({
            ledgerId: LEDGER_ID,
            identity: IDENTITY,
            entryHash: badHash,
            sha256sum: SHA_OLD,
            newContent: '2024-01-02 * "new"\n',
            dryRun: true,
          })
          .catch((error: unknown) => error);

        expect(failure).toBeInstanceOf(BadUserInputError);
        expect(failure).toMatchObject({
          category: "BAD_USER_INPUT",
          metadata: { field: "entryHash" },
        });
        expect(mockUpdateSourceSlice).not.toHaveBeenCalled();
      },
    );

    it.each(["", "   ", "not-a-sha", HASH_OLD, SHA_OLD.toUpperCase()])(
      "refuses malformed sha256sum=%j with BadUserInputError before calling the ledger",
      async (badSha) => {
        const failure = await service
          .updateSourceSlice({
            ledgerId: LEDGER_ID,
            identity: IDENTITY,
            entryHash: HASH_OLD,
            sha256sum: badSha,
            newContent: '2024-01-02 * "new"\n',
            dryRun: true,
          })
          .catch((error: unknown) => error);

        expect(failure).toBeInstanceOf(BadUserInputError);
        expect(failure).toMatchObject({
          category: "BAD_USER_INPUT",
          metadata: { field: "sha256sum" },
        });
        expect(mockUpdateSourceSlice).not.toHaveBeenCalled();
      },
    );

    // w23/m43: the ledger service decides from the file bytes. A checksum that
    // equals the request's does not make an edit a no-op (a comment kept beside
    // the entry is not in it), and a ledger service that predates the field
    // reports a change.
    it.each([
      ["reports the ledger's unchanged", { unchanged: true }, true, []],
      [
        "does not infer it from the checksum",
        { unchanged: false },
        false,
        ["main.bean"],
      ],
      ["treats an absent flag as a change", {}, false, ["main.bean"]],
    ])("%s", async (_name, flag, expected, files) => {
      mockUpdateSourceSlice.mockResolvedValue({
        data: {
          success: true,
          data: {
            message: "Updated",
            entry_hash: HASH_NEW,
            new_sha256sum: SHA_OLD,
            new_entry_hash: HASH_NEW,
            files: ["main.bean"],
            ...flag,
          },
        },
      });

      const result = await service.updateSourceSlice({
        ledgerId: LEDGER_ID,
        identity: IDENTITY,
        entryHash: HASH_OLD,
        sha256sum: SHA_OLD,
        newContent: "x",
      });

      expect(result.unchanged).toBe(expected);
      expect(result.files).toEqual(files);
      if (expected) expect(result.message).toMatch(/^No change/);
    });

    // A slice edit can add directives, so the ledger service holds it to the
    // limit — and the mobile app, exempt by product policy, must say so.
    it("forwards the directive-limit exemption for a mobile edit", async () => {
      mockUpdateSourceSlice.mockResolvedValue({
        data: {
          success: true,
          data: {
            message: "Updated",
            entry_hash: HASH_NEW,
            new_sha256sum: SHA_NEW,
            new_entry_hash: HASH_NEW,
          },
        },
      });

      await service.updateSourceSlice({
        ledgerId: LEDGER_ID,
        identity: IDENTITY,
        entryHash: HASH_OLD,
        sha256sum: SHA_OLD,
        newContent: "x",
        platform: "mobile",
      });

      expect(mockUpdateSourceSlice).toHaveBeenLastCalledWith(
        "testowner",
        "testledger",
        expect.anything(),
        { headers: { "x-directive-limit-exempt": "1" } },
      );
    });

    // w21/120: an emptied edit replaced the entry with a blank line, deleting
    // it without the delete confirmation and reporting it saved.
    it("refuses an empty or whitespace-only edit before the ledger sees it", async () => {
      for (const newContent of ["", "  ", "\n\t\n"]) {
        await expect(
          service.updateSourceSlice({
            ledgerId: LEDGER_ID,
            identity: IDENTITY,
            entryHash: HASH_OLD,
            sha256sum: SHA_OLD,
            newContent,
          }),
        ).rejects.toMatchObject({ category: "BAD_USER_INPUT" });
      }
      expect(mockUpdateSourceSlice).not.toHaveBeenCalled();
    });

    // w23/081: the slice commits verbatim, and an amount past the engine's
    // 28 digits would read back rounded with no check failing. REST,
    // GraphQL and MCP all edit through here.
    it("refuses an amount past 28 digits before the ledger sees it", async () => {
      const newContent = [
        '2021-01-02 * "raw"',
        "  Assets:Cash  9999999999999999999999999999.99 USD",
        "  Equity:Initial",
        "",
      ].join("\n");
      await expect(
        service.updateSourceSlice({
          ledgerId: LEDGER_ID,
          identity: IDENTITY,
          entryHash: HASH_OLD,
          sha256sum: SHA_OLD,
          newContent,
        }),
      ).rejects.toMatchObject({
        category: "BAD_USER_INPUT",
        message: expect.stringContaining(
          "9999999999999999999999999999.99 has more than 28 significant digits",
        ),
      });
      expect(mockUpdateSourceSlice).not.toHaveBeenCalled();
    });

    it("throws InternalServerError on failure", async () => {
      mockUpdateSourceSlice.mockResolvedValue({ data: { success: false } });

      await expect(
        service.updateSourceSlice({
          ledgerId: LEDGER_ID,
          identity: IDENTITY,
          entryHash: HASH_OLD,
          sha256sum: SHA_OLD,
          newContent: "x",
        }),
      ).rejects.toThrow(InternalServerError);
    });

    // A stale entry hash (the entry was edited, so its content-derived
    // identity moved) is a client-visible condition, not a server fault.
    it("maps a ledger 404 for a stale entry hash to NotFoundError", async () => {
      mockUpdateSourceSlice.mockRejectedValue(
        new FavaApiError("Entry not found", 404, { error: "Entry not found" }),
      );

      await expect(
        service.updateSourceSlice({
          ledgerId: LEDGER_ID,
          identity: IDENTITY,
          entryHash: HASH_STALE,
          sha256sum: SHA_OLD,
          newContent: "x",
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it("maps a ledger 409 for a changed slice to ConflictError", async () => {
      mockUpdateSourceSlice.mockRejectedValue(
        new FavaApiError("Entry conflict", 409, {
          error: "Entry conflict: it has changed since it was loaded",
        }),
      );

      await expect(
        service.updateSourceSlice({
          ledgerId: LEDGER_ID,
          identity: IDENTITY,
          entryHash: HASH_OLD,
          sha256sum: SHA_OLD,
          newContent: "x",
        }),
      ).rejects.toThrow(ConflictError);
    });
  });
});
