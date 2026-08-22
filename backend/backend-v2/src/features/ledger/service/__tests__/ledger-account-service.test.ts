import { LedgerAccountService } from "../ledger-account-service";
import { authorizeLedger } from "@/features/ledger/utils/authorize-ledger";
import type { Identity } from "@/server/api/identity";

// Exercises this service's own behavior; authorizeLedger has its own suite.
jest.mock("@/features/ledger/utils/authorize-ledger", () => ({
  ...jest.requireActual("@/features/ledger/utils/authorize-ledger"),
  authorizeLedger: jest.fn(),
}));

const mockGetLedgerAccounts = jest.fn();
const mockGetLedgerAccountLastEntries = jest.fn();
const mockGetJournal = jest.fn();
const mockQueryShell = jest.fn();

const mockFavaApiClient = {
  reports: {
    getLedgerAccounts: mockGetLedgerAccounts,
    getLedgerAccountLastEntries: mockGetLedgerAccountLastEntries,
  },
  journal: {
    getJournal: mockGetJournal,
  },
  shell: {
    queryShell: mockQueryShell,
  },
};

const mockFavaClientFactory = {
  getPublicApiClient: jest.fn().mockResolvedValue(mockFavaApiClient),
};

const OWNER = "testowner";
const LEDGER = "testledger";

function identityFor(userId: string): Identity {
  return {
    userId,
    method: "oauth",
    scopes: new Set(),
    capabilityExempt: false,
  };
}

const accountsResponse = {
  data: {
    success: true,
    data: {
      "Assets:Cash": {
        close_date: null,
        meta: { lineno: 1 },
        uptodate_status: "green",
        balance_string: "100 USD",
        last_entry: { date: "2024-01-15", entry_hash: "hash1" },
      },
      "Assets:OldBank": {
        close_date: "2023-12-31",
        meta: null,
        uptodate_status: null,
        balance_string: null,
        last_entry: null,
      },
    },
  },
};

describe("LedgerAccountService", () => {
  let service: LedgerAccountService;

  beforeEach(() => {
    jest.clearAllMocks();

    mockGetLedgerAccounts.mockResolvedValue(accountsResponse);
    mockGetLedgerAccountLastEntries.mockResolvedValue({
      data: { success: true, data: [] },
    });
    mockQueryShell.mockResolvedValue({
      data: { success: true, data: { result: { rows: [] } } },
    });

    (authorizeLedger as jest.Mock).mockResolvedValue({
      ledgerRepoId: 1,
      ownerUserId: "user-99",
    });
    service = new LedgerAccountService(
      mockFavaClientFactory as any,
      {} as any,
      {} as any,
    );
  });

  describe("getAccountsDetail", () => {
    it("maps fava accounts to LedgerAccountDetail shape", async () => {
      const result = await service.getAccountsDetail(OWNER, LEDGER);

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            account: "Assets:Cash",
            closeDate: null,
            balanceString: "100 USD",
            lastEntry: { date: "2024-01-15", entryHash: "hash1" },
          }),
          expect.objectContaining({
            account: "Assets:OldBank",
            closeDate: "2023-12-31",
            lastEntry: null,
          }),
        ]),
      );
    });

    it("passes the identity's userId to the fava client factory", async () => {
      await service.getAccountsDetail(OWNER, LEDGER, identityFor("user-99"));

      expect(mockFavaClientFactory.getPublicApiClient).toHaveBeenCalledWith(
        `${OWNER}/${LEDGER}`,
        "user-99",
      );
    });
  });

  describe("getAccounts", () => {
    it("returns all accounts when no status filter", async () => {
      const result = await service.getAccounts(OWNER, LEDGER);

      expect(result).toEqual(expect.arrayContaining(["Assets:Cash", "Assets:OldBank"]));
    });

    it("returns only open accounts when status=open", async () => {
      const result = await service.getAccounts(OWNER, LEDGER, "open");

      expect(result).toEqual(["Assets:Cash"]);
    });

    it("returns only closed accounts when status=closed", async () => {
      const result = await service.getAccounts(OWNER, LEDGER, "closed");

      expect(result).toEqual(["Assets:OldBank"]);
    });
  });

  describe("getAccountDirectives", () => {
    beforeEach(() => {
      // getAllOpenEntries calls getJournal once (open entries)
      // getAllCloseEntries calls getJournal once (close entries)
      mockGetJournal
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              total: 1,
              is_empty: false,
              items: [{ account: "Assets:Cash", date: "2020-01-01", entry_hash: "open1" }],
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: { total: 0, is_empty: true, items: [] },
          },
        });

      mockGetLedgerAccountLastEntries.mockResolvedValue({
        data: {
          success: true,
          data: [{ account: "Assets:Cash", balance: { USD: "100" } }],
        },
      });

      mockQueryShell.mockResolvedValue({
        data: { success: true, data: { result: { rows: [["Assets:Cash", 5]] } } },
      });
    });

    it("combines open entries with balance and entry count", async () => {
      const result = await service.getAccountDirectives(OWNER, LEDGER);

      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            account: "Assets:Cash",
            openedAt: "2020-01-01",
            entryHash: "open1",
            entryCount: 5,
          }),
        ]),
      );
    });
  });
});
