import { LedgerJournalService } from "../ledger-journal-service";
import { InternalServerError } from "@/shared/errors";
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
const mockUpdateSourceSlice = jest.fn();

const mockFavaApiClient = {
  journal: {
    getJournal: mockGetJournal,
    getContext: mockGetContext,
    plaintextJournal: mockPlaintextJournal,
    getAccountJournal: mockGetAccountJournal,
    deleteSourceSlice: mockDeleteSourceSlice,
    deleteMultiSourceSlices: mockDeleteMultiSourceSlices,
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
    service = new LedgerJournalService(
      mockFavaClientFactory as any,
      {} as any,
      {} as any,
    );
  });

  describe("getJournal", () => {
    it("returns mapped journal data on success", async () => {
      mockGetJournal.mockResolvedValue({
        data: {
          success: true,
          data: { total: 5, items: [{ id: 1 }], is_empty: false },
        },
      });

      const result = await service.getJournal({ ledgerId: LEDGER_ID, identity: IDENTITY });

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
        query: { account: "Assets:Cash", limit: 50, offset: 10, filter: "year:2024" },
      });

      expect(mockGetJournal).toHaveBeenCalledWith(
        "testowner",
        "testledger",
        expect.objectContaining({ account: "Assets:Cash", limit: 50, offset: 10, filter: "year:2024" }),
      );
    });

    it("throws InternalServerError when fava response is not successful", async () => {
      mockGetJournal.mockResolvedValue({ data: { success: false } });

      await expect(
        service.getJournal({ ledgerId: LEDGER_ID, identity: IDENTITY }),
      ).rejects.toThrow(InternalServerError);
    });
  });

  describe("getContext", () => {
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
        entryHash: "hash-abc",
      });

      expect(result.sha256sum).toBe("abc123");
      expect(result.slice).toBe("some slice");
      expect(result.balances_before).toEqual({ "Assets:Cash": ["100 USD"] });
      expect(mockGetContext).toHaveBeenCalledWith("testowner", "testledger", "hash-abc");
    });

    it("throws InternalServerError on failure", async () => {
      mockGetContext.mockResolvedValue({ data: { success: false } });

      await expect(
        service.getContext({ ledgerId: LEDGER_ID, identity: IDENTITY, entryHash: "x" }),
      ).rejects.toThrow(InternalServerError);
    });
  });

  describe("plaintextJournal", () => {
    it("returns content on success", async () => {
      mockPlaintextJournal.mockResolvedValue({
        data: { success: true, data: { content: "2024-01-01 * ...\n" } },
      });

      const result = await service.plaintextJournal({ ledgerId: LEDGER_ID, identity: IDENTITY });

      expect(result.content).toBe("2024-01-01 * ...\n");
    });

    it("throws InternalServerError on failure", async () => {
      mockPlaintextJournal.mockResolvedValue({ data: { success: false } });

      await expect(
        service.plaintextJournal({ ledgerId: LEDGER_ID, identity: IDENTITY }),
      ).rejects.toThrow(InternalServerError);
    });
  });

  describe("getAccountJournal", () => {
    it("returns mapped account journal on success", async () => {
      mockGetAccountJournal.mockResolvedValue({
        data: {
          success: true,
          data: {
            items: [{ entry: { id: 1 }, change: { USD: "100" }, balance: { USD: "200" } }],
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
          data: { items: [], total: 0, account: "Assets:Cash", with_children: true },
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
        expect.objectContaining({ with_children: true, conversion: "at_cost" }),
      );
    });

    it("throws InternalServerError on failure", async () => {
      mockGetAccountJournal.mockResolvedValue({ data: { success: false } });

      await expect(
        service.getAccountJournal({ ledgerId: LEDGER_ID, identity: IDENTITY, query: { account: "A" } }),
      ).rejects.toThrow(InternalServerError);
    });
  });

  describe("deleteSourceSlice", () => {
    it("returns message and entryHash on success", async () => {
      mockDeleteSourceSlice.mockResolvedValue({
        data: {
          success: true,
          data: { message: "Deleted", entry_hash: "hash-abc" },
        },
      });

      const result = await service.deleteSourceSlice({
        ledgerId: LEDGER_ID,
        identity: IDENTITY,
        entryHash: "hash-abc",
        sha256sum: "sum-xyz",
      });

      expect(result.message).toBe("Deleted");
      expect(result.entryHash).toBe("hash-abc");
      expect(mockDeleteSourceSlice).toHaveBeenCalledWith(
        "testowner",
        "testledger",
        { entry_hash: "hash-abc", sha256sum: "sum-xyz" },
      );
    });

    it("throws InternalServerError on failure", async () => {
      mockDeleteSourceSlice.mockResolvedValue({ data: { success: false } });

      await expect(
        service.deleteSourceSlice({
          ledgerId: LEDGER_ID,
          identity: IDENTITY,
          entryHash: "h",
          sha256sum: "s",
        }),
      ).rejects.toThrow(InternalServerError);
    });
  });

  describe("deleteMultiSourceSlices", () => {
    it("returns message and deletedHashes on success", async () => {
      mockDeleteMultiSourceSlices.mockResolvedValue({
        data: {
          success: true,
          data: { message: "Deleted 2", deleted_hashes: ["h1", "h2"] },
        },
      });

      const result = await service.deleteMultiSourceSlices({
        ledgerId: LEDGER_ID,
        identity: IDENTITY,
        entries: [
          { entryHash: "h1", sha256sum: "s1" },
          { entryHash: "h2", sha256sum: "s2" },
        ],
      });

      expect(result.deletedHashes).toEqual(["h1", "h2"]);
      expect(mockDeleteMultiSourceSlices).toHaveBeenCalledWith(
        "testowner",
        "testledger",
        { entries: [{ entry_hash: "h1", sha256sum: "s1" }, { entry_hash: "h2", sha256sum: "s2" }] },
      );
    });

    it("throws InternalServerError on failure", async () => {
      mockDeleteMultiSourceSlices.mockResolvedValue({ data: { success: false } });

      await expect(
        service.deleteMultiSourceSlices({ ledgerId: LEDGER_ID, identity: IDENTITY, entries: [] }),
      ).rejects.toThrow(InternalServerError);
    });
  });

  describe("updateSourceSlice", () => {
    it("returns mapped result on success", async () => {
      mockUpdateSourceSlice.mockResolvedValue({
        data: {
          success: true,
          data: { message: "Updated", entry_hash: "hash-new", new_sha256sum: "newsum" },
        },
      });

      const result = await service.updateSourceSlice({
        ledgerId: LEDGER_ID,
        identity: IDENTITY,
        entryHash: "hash-old",
        sha256sum: "oldsum",
        newContent: "2024-01-02 * \"new\"\n",
      });

      expect(result.newSha256sum).toBe("newsum");
      expect(result.entryHash).toBe("hash-new");
      expect(mockUpdateSourceSlice).toHaveBeenCalledWith(
        "testowner",
        "testledger",
        { entry_hash: "hash-old", sha256sum: "oldsum", new_content: "2024-01-02 * \"new\"\n" },
      );
    });

    it("throws InternalServerError on failure", async () => {
      mockUpdateSourceSlice.mockResolvedValue({ data: { success: false } });

      await expect(
        service.updateSourceSlice({
          ledgerId: LEDGER_ID,
          identity: IDENTITY,
          entryHash: "h",
          sha256sum: "s",
          newContent: "x",
        }),
      ).rejects.toThrow(InternalServerError);
    });
  });
});
