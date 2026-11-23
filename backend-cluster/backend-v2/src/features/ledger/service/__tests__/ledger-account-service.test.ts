import { LedgerAccountService } from "../ledger-account-service";
import { authorizeLedger } from "@/features/ledger/utils/authorize-ledger";
import type { Identity } from "@/server/api/identity";
import { FavaApiError } from "@/foundation/fava";

// Exercises this service's own behavior; authorizeLedger has its own suite.
jest.mock("@/features/ledger/utils/authorize-ledger", () => ({
  ...jest.requireActual("@/features/ledger/utils/authorize-ledger"),
  authorizeLedger: jest.fn(),
}));

const mockGetLedgerAccounts = jest.fn();
const mockGetLedgerAccountLastEntries = jest.fn();
const mockGetLedgerBalanceSheet = jest.fn();
const mockGetLedgerAccountReferenceCounts = jest.fn();
const mockGetJournal = jest.fn();
const mockQueryShell = jest.fn();

const mockFavaApiClient = {
  reports: {
    getLedgerAccounts: mockGetLedgerAccounts,
    getLedgerAccountLastEntries: mockGetLedgerAccountLastEntries,
    getLedgerBalanceSheet: mockGetLedgerBalanceSheet,
    getLedgerAccountReferenceCounts: mockGetLedgerAccountReferenceCounts,
  },
  journal: {
    getJournal: mockGetJournal,
  },
  shell: {
    queryShellPost: mockQueryShell,
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
    mockGetLedgerAccountReferenceCounts.mockResolvedValue({
      data: { success: true, data: { "Assets:Cash": 7 } },
    });
    mockQueryShell.mockResolvedValue({
      data: { success: true, data: { result: { rows: [] } } },
    });

    (authorizeLedger as jest.Mock).mockResolvedValue({
      ledgerRepoId: 1,
      ownerUserId: "user-99",
    });
    service = new LedgerAccountService(mockFavaClientFactory as any, {} as any);
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

      expect(result).toEqual(
        expect.arrayContaining(["Assets:Cash", "Assets:OldBank"]),
      );
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
              items: [
                {
                  account: "Assets:Cash",
                  date: "2020-01-01",
                  entry_hash: "open1",
                },
              ],
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
        data: {
          success: true,
          data: { result: { rows: [["Assets:Cash", 5]] } },
        },
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
            referenceCount: 7,
          }),
        ]),
      );
      expect(mockGetLedgerAccountReferenceCounts).toHaveBeenCalledWith(
        OWNER,
        LEDGER,
      );
      // No metadata on the open directive -> no `meta` on the item.
      expect(result[0].meta).toBeUndefined();
      expect(mockGetLedgerBalanceSheet).not.toHaveBeenCalled();
    });

    it("keeps reference counts unknown with an older ledger service", async () => {
      mockGetLedgerAccountReferenceCounts.mockRejectedValueOnce(
        new FavaApiError("Not Found", 404),
      );
      const result = await service.getAccountDirectives(OWNER, LEDGER);
      expect(result[0]).toMatchObject({ entryCount: 5, referenceCount: null });
    });

    it("uses direct units balances for closed accounts under the configured balance roots", async () => {
      const accounts = [
        "Assets:Cash",
        "Assets:Frozen",
        "Assets:Retired",
        "Debts:Card",
        "Expenses:Retired",
      ];
      const journalResponse = (names: string[], date: string) => ({
        data: {
          success: true,
          data: {
            total: names.length,
            items: names.map((account) => ({
              account,
              date,
              entry_hash: `${account}-${date}`,
            })),
          },
        },
      });
      mockGetJournal
        .mockReset()
        .mockResolvedValueOnce(journalResponse(accounts, "2020-01-01"))
        .mockResolvedValueOnce(
          journalResponse(accounts.slice(1), "2024-05-01"),
        );
      mockGetLedgerBalanceSheet.mockResolvedValue({
        data: {
          success: true,
          data: {
            assets_hierarchy_data: {
              account: "Assets",
              balance: {},
              children: [
                {
                  account: "Assets:Cash",
                  balance: { USD: "90" },
                  children: [],
                },
                {
                  account: "Assets:Frozen",
                  balance: { USD: "10.00" },
                  balance_children: { USD: "25.00" },
                  children: [],
                },
                { account: "Assets:Retired", balance: {}, children: [] },
              ],
            },
            liabilities_hierarchy_data: {
              account: "Debts",
              balance: {},
              children: [
                {
                  account: "Debts:Card",
                  balance: { USD: "-44.00" },
                  children: [],
                },
              ],
            },
          },
        },
      });

      const result = await service.getAccountDirectives(OWNER, LEDGER);

      expect(result.map(({ account, balance }) => [account, balance])).toEqual([
        ["Assets:Cash", { USD: "100" }],
        ["Assets:Frozen", { USD: "10.00" }],
        ["Assets:Retired", {}],
        ["Debts:Card", { USD: "-44.00" }],
        ["Expenses:Retired", undefined],
      ]);
      expect(result[1]).toMatchObject({
        closedAt: "2024-05-01",
        closeEntryHash: "Assets:Frozen-2024-05-01",
      });
      expect(mockGetLedgerBalanceSheet).toHaveBeenCalledTimes(1);
      expect(mockGetLedgerBalanceSheet).toHaveBeenCalledWith(OWNER, LEDGER, {
        conversion: "units",
      });
    });

    it("passes the open directive's metadata through", async () => {
      mockGetJournal.mockReset();
      mockGetJournal
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              total: 1,
              is_empty: false,
              items: [
                {
                  account: "Assets:Cash",
                  date: "2020-01-01",
                  entry_hash: "open1",
                  meta: { "cash-flow-role": "cash", filename: "main.bean" },
                },
              ],
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: { total: 0, is_empty: true, items: [] },
          },
        });

      const result = await service.getAccountDirectives(OWNER, LEDGER);

      expect(result[0].meta).toEqual({
        "cash-flow-role": "cash",
        filename: "main.bean",
      });
    });
  });
});
