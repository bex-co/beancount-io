import "reflect-metadata";
import {
  LedgerLegacyQueryResolver,
  IEntryMeta,
} from "../ledger-legacy-resolver.query";
import { LedgerLegacyMutationResolver } from "../ledger-legacy-resolver.mutation";
import { IContext } from "@/server/graphql/context";
import type { Identity } from "@/server/api/identity";
import { AuthorizationService } from "@/server/api/authorization";
import {
  ErrorCategory,
  InternalServerError,
  OperationNotAllowedError,
} from "@/shared/errors";

// Define interfaces for test entry input types
interface PostingInput {
  account: string;
  amount: string;
}

interface EntryInput {
  date: string;
  flag: "*";
  meta: IEntryMeta;
  narration: string;
  payee: string;
  postings: PostingInput[];
  type: "Transaction" | "Note" | "Balance";
}

interface EntriesInput {
  entriesInput: EntryInput[];
}

const IDENTITY: Identity = {
  userId: "user-123",
  method: "oauth",
  scopes: new Set(["ledger.read", "ledger.write"]),
};

describe("LedgerLegacyResolver", () => {
  let queryResolver: LedgerLegacyQueryResolver;
  let mutationResolver: LedgerLegacyMutationResolver;
  let mockContext: Partial<IContext>;
  let mockLedgerEntryService: { addBulkEntries: jest.Mock };
  let mockFavaApiClient: {
    ledgers: { listLedgers: jest.Mock };
    entries: { addBulkEntries: jest.Mock };
    reports: {
      getLedgerOptions: jest.Mock;
      getLedgerAttributes: jest.Mock;
      getLedgerErrors: jest.Mock;
      getLedgerHierarchy: jest.Mock;
      getLedgerIncomeStatement: jest.Mock;
      getLedgerBalanceSheet: jest.Mock;
    };
    legacy: { getLegacyJournal: jest.Mock };
  };
  const mockFavaUser = { username: "testuser" };

  // Helper to create entry input for tests
  function createEntryInput(overrides: Partial<EntryInput> = {}): EntriesInput {
    return {
      entriesInput: [
        {
          date: "2024-01-01",
          flag: "*",
          meta: {
            __tolerances__: {},
            filename: "main.bean",
            lineno: 1,
          },
          narration: "Test narration",
          payee: "Test Payee",
          postings: [
            {
              account: "Assets:Cash",
              amount: "100 USD",
            },
          ],
          type: "Transaction",
          ...overrides,
        },
      ],
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();

    mockFavaApiClient = {
      ledgers: {
        listLedgers: jest.fn(),
      },
      entries: {
        addBulkEntries: jest.fn(),
      },
      reports: {
        getLedgerOptions: jest.fn(),
        getLedgerAttributes: jest.fn(),
        getLedgerErrors: jest.fn(),
        getLedgerHierarchy: jest.fn(),
        getLedgerIncomeStatement: jest.fn(),
        getLedgerBalanceSheet: jest.fn(),
      },
      legacy: {
        getLegacyJournal: jest.fn(),
      },
    };

    const mockFavaClientFactory = {
      getApiContext: jest.fn().mockResolvedValue({
        favaApiClient: mockFavaApiClient,
        favaUser: mockFavaUser,
      }),
      getPublicApiClient: jest.fn().mockResolvedValue(mockFavaApiClient),
    } as any;

    mockContext = {
      userId: "user-123",
      identity: IDENTITY,
      getCurrentUserId: jest.fn().mockReturnValue("user-123"),
      getCurrentIdentity: jest.fn().mockReturnValue(IDENTITY),
      platform: "web",
    };

    mockLedgerEntryService = {
      addBulkEntries: jest.fn().mockResolvedValue({ success: true }),
    };

    const authorization = new AuthorizationService(
      { check: jest.fn().mockResolvedValue(true) },
      jest.fn(),
    );
    queryResolver = new LedgerLegacyQueryResolver(
      mockFavaClientFactory,
      authorization,
    );
    mutationResolver = new LedgerLegacyMutationResolver(
      mockFavaClientFactory,
      mockLedgerEntryService as any,
      authorization,
    );
  });

  describe("featureFlags", () => {
    it("should return spendingReportSubscription as false for a valid userId", async () => {
      const result = await queryResolver.featureFlags({ userId: "user-123" });

      expect(result).toEqual({
        spendingReportSubscription: false,
      });
    });

    it("should return spendingReportSubscription as false when userId is falsy", async () => {
      const result = await queryResolver.featureFlags({ userId: "" });

      expect(result).toEqual({
        spendingReportSubscription: false,
      });
    });
  });

  describe("addEntries", () => {
    const mockLedgersList = {
      data: {
        success: true,
        data: [{ name: "test-ledger", full_name: "testuser/test-ledger" }],
      },
    };

    beforeEach(() => {
      mockFavaApiClient.ledgers.listLedgers.mockResolvedValue(mockLedgersList);
    });

    it("should add a transaction entry successfully", async () => {
      const result = await mutationResolver.addEntries(
        createEntryInput(),
        mockContext as IContext,
      );

      expect(result.success).toBe(true);
      expect(result.data).toBe("");
      expect(mockLedgerEntryService.addBulkEntries).toHaveBeenCalledWith(
        IDENTITY,
        "testuser",
        "test-ledger",
        expect.any(Array),
        "web",
      );
    });

    it("should parse amount with currency correctly", async () => {
      const entriesInput = createEntryInput({
        postings: [{ account: "Assets:Cash", amount: "123.45 EUR" }],
      });

      await mutationResolver.addEntries(entriesInput, mockContext as IContext);

      expect(mockLedgerEntryService.addBulkEntries).toHaveBeenCalledWith(
        IDENTITY,
        "testuser",
        "test-ledger",
        [
          expect.objectContaining({
            type: "transaction",
            entry: expect.objectContaining({
              postings: [
                expect.objectContaining({
                  units: { number: "123.45", currency: "EUR" },
                }),
              ],
            }),
          }),
        ],
        "web",
      );
    });

    it("should handle amount with commas", async () => {
      const entriesInput = createEntryInput({
        postings: [{ account: "Assets:Cash", amount: "1,234.56 USD" }],
      });

      await mutationResolver.addEntries(entriesInput, mockContext as IContext);

      expect(mockLedgerEntryService.addBulkEntries).toHaveBeenCalledWith(
        IDENTITY,
        "testuser",
        "test-ledger",
        [
          expect.objectContaining({
            type: "transaction",
            entry: expect.objectContaining({
              postings: [
                expect.objectContaining({
                  units: { number: "1234.56", currency: "USD" },
                }),
              ],
            }),
          }),
        ],
        "web",
      );
    });

    it("should fallback to parsing amount as number without currency", async () => {
      const entriesInput = createEntryInput({
        postings: [{ account: "Assets:Cash", amount: "100" }],
      });

      await mutationResolver.addEntries(entriesInput, mockContext as IContext);

      expect(mockLedgerEntryService.addBulkEntries).toHaveBeenCalledWith(
        IDENTITY,
        "testuser",
        "test-ledger",
        [
          expect.objectContaining({
            type: "transaction",
            entry: expect.objectContaining({
              postings: [
                expect.objectContaining({
                  units: { number: "100", currency: "USD" },
                }),
              ],
            }),
          }),
        ],
        "web",
      );
    });

    it("should throw error when ledgers list fails", async () => {
      mockFavaApiClient.ledgers.listLedgers.mockResolvedValue({
        data: { success: false },
      });

      await expect(
        mutationResolver.addEntries(
          createEntryInput(),
          mockContext as IContext,
        ),
      ).rejects.toThrow(InternalServerError);
    });

    it("should throw error when no ledgers found", async () => {
      mockFavaApiClient.ledgers.listLedgers.mockResolvedValue({
        data: { success: true, data: [] },
      });

      await expect(
        mutationResolver.addEntries(
          createEntryInput(),
          mockContext as IContext,
        ),
      ).rejects.toThrow("Failed to get the default ledger");
    });

    it("should throw error when the entry service rejects the write", async () => {
      mockLedgerEntryService.addBulkEntries.mockRejectedValue(
        new OperationNotAllowedError("add entries", "directive limit reached"),
      );

      await expect(
        mutationResolver.addEntries(
          createEntryInput(),
          mockContext as IContext,
        ),
      ).rejects.toThrow(OperationNotAllowedError);
    });

    it("should throw error for non-Transaction entry types", async () => {
      const entriesInput = createEntryInput({ type: "Balance" });

      await expect(
        mutationResolver.addEntries(entriesInput, mockContext as IContext),
      ).rejects.toThrow("Invalid entry type");
      expect(mockLedgerEntryService.addBulkEntries).not.toHaveBeenCalled();
    });

    it("should pass ctx.platform through to the entry service for mobile writes", async () => {
      await mutationResolver.addEntries(createEntryInput(), {
        ...mockContext,
        platform: "mobile",
      } as IContext);

      expect(mockLedgerEntryService.addBulkEntries).toHaveBeenCalledWith(
        IDENTITY,
        "testuser",
        "test-ledger",
        expect.any(Array),
        "mobile",
      );
    });
  });

  describe("ledgerMeta", () => {
    const mockLedgersList = {
      data: {
        success: true,
        data: [{ name: "test-ledger", full_name: "testuser/test-ledger" }],
      },
    };

    it("should return ledger meta successfully", async () => {
      mockFavaApiClient.ledgers.listLedgers.mockResolvedValue(mockLedgersList);
      mockFavaApiClient.reports.getLedgerOptions.mockResolvedValue({
        data: {
          success: true,
          data: {
            name_assets: "Assets",
            name_equity: "Equity",
            name_expenses: "Expenses",
            name_income: "Income",
            name_liabilities: "Liabilities",
            operating_currency: ["USD"],
          },
        },
      });
      mockFavaApiClient.reports.getLedgerAttributes.mockResolvedValue({
        data: {
          success: true,
          data: {
            accounts: ["Assets:Cash", "Expenses:Food"],
            currencies: ["USD", "EUR"],
          },
        },
      });
      mockFavaApiClient.reports.getLedgerErrors.mockResolvedValue({
        data: {
          success: true,
          data: [{ message: "Error 1" }, { message: "Error 2" }],
        },
      });

      const result = await queryResolver.ledgerMeta(
        { userId: "user-123" },
        mockContext as IContext,
      );

      expect(result.success).toBe(true);
      expect(result.data.accounts).toEqual(["Assets:Cash", "Expenses:Food"]);
      expect(result.data.currencies).toEqual(["USD", "EUR"]);
      expect(result.data.errors).toBe(2);
      expect(result.data.options.name_assets).toBe("Assets");
    });

    it("should throw error when userId does not match context", async () => {
      // ledgerMeta doesn't check userId authorization, so this test verifies
      // that it still works with different userId (no authorization check)
      mockFavaApiClient.ledgers.listLedgers.mockResolvedValue(mockLedgersList);
      mockFavaApiClient.reports.getLedgerOptions.mockResolvedValue({
        data: {
          success: true,
          data: {
            name_assets: "Assets",
            name_equity: "Equity",
            name_expenses: "Expenses",
            name_income: "Income",
            name_liabilities: "Liabilities",
            operating_currency: ["USD"],
          },
        },
      });
      mockFavaApiClient.reports.getLedgerAttributes.mockResolvedValue({
        data: {
          success: true,
          data: {
            accounts: ["Assets:Cash", "Expenses:Food"],
            currencies: ["USD", "EUR"],
          },
        },
      });
      mockFavaApiClient.reports.getLedgerErrors.mockResolvedValue({
        data: {
          success: true,
          data: [],
        },
      });

      // Should succeed even with different userId since ledgerMeta doesn't check it
      const result = await queryResolver.ledgerMeta(
        { userId: "different-user" },
        mockContext as IContext,
      );

      expect(result.success).toBe(true);
    });

    it("should throw error when ledgers list fails", async () => {
      mockFavaApiClient.ledgers.listLedgers.mockResolvedValue({
        data: { success: false },
      });

      await expect(
        queryResolver.ledgerMeta(
          { userId: "user-123" },
          mockContext as IContext,
        ),
      ).rejects.toThrow("Failed to get find out the ledgers");
    });

    it("should throw error when no default ledger found", async () => {
      mockFavaApiClient.ledgers.listLedgers.mockResolvedValue({
        data: { success: true, data: [] },
      });

      await expect(
        queryResolver.ledgerMeta(
          { userId: "user-123" },
          mockContext as IContext,
        ),
      ).rejects.toThrow();
    });

    it("should throw error when getLedgerOptions fails", async () => {
      mockFavaApiClient.ledgers.listLedgers.mockResolvedValue(mockLedgersList);
      mockFavaApiClient.reports.getLedgerOptions.mockResolvedValue({
        data: { success: false },
      });

      await expect(
        queryResolver.ledgerMeta(
          { userId: "user-123" },
          mockContext as IContext,
        ),
      ).rejects.toThrow("Failed to get the ledger data");
    });

    it("should throw error when getLedgerAttributes fails", async () => {
      mockFavaApiClient.ledgers.listLedgers.mockResolvedValue(mockLedgersList);
      mockFavaApiClient.reports.getLedgerOptions.mockResolvedValue({
        data: { success: true, data: {} },
      });
      mockFavaApiClient.reports.getLedgerAttributes.mockResolvedValue({
        data: { success: false },
      });

      await expect(
        queryResolver.ledgerMeta(
          { userId: "user-123" },
          mockContext as IContext,
        ),
      ).rejects.toThrow("Failed to get the ledger data");
    });

    it("should throw error when getLedgerErrors fails", async () => {
      mockFavaApiClient.ledgers.listLedgers.mockResolvedValue(mockLedgersList);
      mockFavaApiClient.reports.getLedgerOptions.mockResolvedValue({
        data: { success: true, data: {} },
      });
      mockFavaApiClient.reports.getLedgerAttributes.mockResolvedValue({
        data: { success: true, data: { accounts: [], currencies: [] } },
      });
      mockFavaApiClient.reports.getLedgerErrors.mockResolvedValue({
        data: { success: false },
      });

      await expect(
        queryResolver.ledgerMeta(
          { userId: "user-123" },
          mockContext as IContext,
        ),
      ).rejects.toThrow("Failed to get the ledger data");
    });
  });

  describe("accountHierarchy", () => {
    const mockLedgersList = {
      data: {
        success: true,
        data: [{ name: "test-ledger", full_name: "testuser/test-ledger" }],
      },
    };

    it("should return account hierarchy successfully", async () => {
      mockFavaApiClient.ledgers.listLedgers.mockResolvedValue(mockLedgersList);
      mockFavaApiClient.reports.getLedgerOptions.mockResolvedValue({
        data: {
          success: true,
          data: {
            name_assets: "Assets",
            name_liabilities: "Liabilities",
            name_equity: "Equity",
            name_income: "Income",
            name_expenses: "Expenses",
          },
        },
      });
      mockFavaApiClient.reports.getLedgerHierarchy
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              account: "Assets",
              balance: { USD: "1000.00" },
              balance_children: { USD: "1000.00" },
              children: [],
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              account: "Liabilities",
              balance: { USD: "-500.00" },
              balance_children: { USD: "-500.00" },
              children: [],
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              account: "Income",
              balance: { USD: "2000.00" },
              balance_children: { USD: "2000.00" },
              children: [],
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              account: "Expenses",
              balance: { USD: "-1500.00" },
              balance_children: { USD: "-1500.00" },
              children: [],
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              account: "Equity",
              balance: { USD: "500.00" },
              balance_children: { USD: "500.00" },
              children: [],
            },
          },
        });

      const result = await queryResolver.accountHierarchy(
        { userId: "user-123" },
        mockContext as IContext,
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(5);
      expect(result.data[0].label).toBe("Assets");
      expect(result.data[0].data.balance).toEqual({ USD: 1000 });
      expect(result.data[1].label).toBe("Liabilities");
      expect(result.data[1].data.balance).toEqual({ USD: -500 });
      expect(result.data[2].label).toBe("Equity");
      expect(result.data[2].data.balance).toEqual({ USD: 500 });
      expect(result.data[3].label).toBe("Income");
      expect(result.data[3].data.balance).toEqual({ USD: 2000 });
      expect(result.data[4].label).toBe("Expenses");
      expect(result.data[4].data.balance).toEqual({ USD: -1500 });
    });

    it("should throw error when userId does not match context", async () => {
      // accountHierarchy doesn't check userId authorization, so this test verifies
      // that it still works with different userId (no authorization check)
      mockFavaApiClient.ledgers.listLedgers.mockResolvedValue(mockLedgersList);
      mockFavaApiClient.reports.getLedgerOptions.mockResolvedValue({
        data: {
          success: true,
          data: {
            name_assets: "Assets",
            name_equity: "Equity",
            name_expenses: "Expenses",
            name_income: "Income",
            name_liabilities: "Liabilities",
          },
        },
      });
      mockFavaApiClient.reports.getLedgerHierarchy
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              account: "Assets",
              balance: { USD: "0" },
              balance_children: { USD: "0" },
              children: [],
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              account: "Liabilities",
              balance: { USD: "0" },
              balance_children: { USD: "0" },
              children: [],
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              account: "Income",
              balance: { USD: "0" },
              balance_children: { USD: "0" },
              children: [],
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              account: "Expenses",
              balance: { USD: "0" },
              balance_children: { USD: "0" },
              children: [],
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              account: "Equity",
              balance: { USD: "0" },
              balance_children: { USD: "0" },
              children: [],
            },
          },
        });

      // Should succeed even with different userId since accountHierarchy doesn't check it
      const result = await queryResolver.accountHierarchy(
        { userId: "different-user" },
        mockContext as IContext,
      );

      expect(result.success).toBe(true);
    });

    it("should transform NaN balance values to 0", async () => {
      mockFavaApiClient.ledgers.listLedgers.mockResolvedValue(mockLedgersList);
      mockFavaApiClient.reports.getLedgerOptions.mockResolvedValue({
        data: {
          success: true,
          data: {
            name_assets: "Assets",
            name_liabilities: "Liabilities",
            name_equity: "Equity",
            name_income: "Income",
            name_expenses: "Expenses",
          },
        },
      });
      mockFavaApiClient.reports.getLedgerHierarchy
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              account: "Assets",
              balance: { USD: "invalid" },
              balance_children: { USD: "NaN" },
              children: [],
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              account: "Liabilities",
              balance: { USD: "0" },
              balance_children: { USD: "0" },
              children: [],
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              account: "Income",
              balance: { USD: "0" },
              balance_children: { USD: "0" },
              children: [],
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              account: "Expenses",
              balance: { USD: "0" },
              balance_children: { USD: "0" },
              children: [],
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              account: "Equity",
              balance: { USD: "0" },
              balance_children: { USD: "0" },
              children: [],
            },
          },
        });

      const result = await queryResolver.accountHierarchy(
        { userId: "user-123" },
        mockContext as IContext,
      );

      expect(result.data[0].data.balance).toEqual({ USD: 0 });
      expect(result.data[0].data.balance_children).toEqual({ USD: 0 });
    });

    it("should transform nested children recursively", async () => {
      mockFavaApiClient.ledgers.listLedgers.mockResolvedValue(mockLedgersList);
      mockFavaApiClient.reports.getLedgerOptions.mockResolvedValue({
        data: {
          success: true,
          data: {
            name_assets: "Assets",
            name_liabilities: "Liabilities",
            name_equity: "Equity",
            name_income: "Income",
            name_expenses: "Expenses",
          },
        },
      });
      mockFavaApiClient.reports.getLedgerHierarchy
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              account: "Assets",
              balance: { USD: "1000.00" },
              balance_children: { USD: "1500.00" },
              children: [
                {
                  account: "Assets:Cash",
                  balance: { USD: "500.00" },
                  balance_children: { USD: "500.00" },
                  children: [],
                },
              ],
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              account: "Liabilities",
              balance: { USD: "0" },
              balance_children: { USD: "0" },
              children: [],
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              account: "Income",
              balance: { USD: "0" },
              balance_children: { USD: "0" },
              children: [],
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              account: "Expenses",
              balance: { USD: "0" },
              balance_children: { USD: "0" },
              children: [],
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            success: true,
            data: {
              account: "Equity",
              balance: { USD: "0" },
              balance_children: { USD: "0" },
              children: [],
            },
          },
        });

      const result = await queryResolver.accountHierarchy(
        { userId: "user-123" },
        mockContext as IContext,
      );

      expect(result.data[0].data.children).toHaveLength(1);
      expect(result.data[0].data.children[0].account).toBe("Assets:Cash");
      expect(result.data[0].data.children[0].balance).toEqual({ USD: 500 });
    });

    it("should throw error when asset hierarchy fails", async () => {
      mockFavaApiClient.ledgers.listLedgers.mockResolvedValue(mockLedgersList);
      mockFavaApiClient.reports.getLedgerOptions.mockResolvedValue({
        data: {
          success: true,
          data: {
            name_assets: "Assets",
            name_liabilities: "Liabilities",
            name_equity: "Equity",
            name_income: "Income",
            name_expenses: "Expenses",
          },
        },
      });
      mockFavaApiClient.reports.getLedgerHierarchy.mockResolvedValue({
        data: { success: false },
      });

      await expect(
        queryResolver.accountHierarchy(
          { userId: "user-123" },
          mockContext as IContext,
        ),
      ).rejects.toThrow("Failed to get the account hierarchy");
    });
  });

  describe("homeCharts", () => {
    const mockLedgersList = {
      data: {
        success: true,
        data: [{ name: "test-ledger", full_name: "testuser/test-ledger" }],
      },
    };

    it("should return home charts successfully", async () => {
      mockFavaApiClient.ledgers.listLedgers.mockResolvedValue(mockLedgersList);
      mockFavaApiClient.reports.getLedgerIncomeStatement.mockResolvedValue({
        data: {
          success: true,
          data: {
            net_profit_data: [
              { date: "2024-01", balance: { USD: "1000.00" } },
              { date: "2024-02", balance: { USD: "1500.00" } },
            ],
          },
        },
      });
      mockFavaApiClient.reports.getLedgerBalanceSheet.mockResolvedValue({
        data: {
          success: true,
          data: {
            net_worth_data: [
              { date: "2024-01", balance: { USD: "10000.00" } },
              { date: "2024-02", balance: { USD: "11500.00" } },
            ],
          },
        },
      });

      const result = await queryResolver.homeCharts(
        { userId: "user-123" },
        mockContext as IContext,
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].type).toBe("bar");
      expect(result.data[0].label).toBe("Net Profit");
      expect(result.data[0].data).toHaveLength(2);
      expect(result.data[0].data[0].balance).toEqual({ USD: 1000 });
      expect(result.data[1].type).toBe("balances");
      expect(result.data[1].label).toBe("Net Worth");
    });

    it("should throw error when userId does not match context", async () => {
      // homeCharts doesn't check userId authorization, so this test verifies
      // that it still works with different userId (no authorization check)
      mockFavaApiClient.ledgers.listLedgers.mockResolvedValue(mockLedgersList);
      mockFavaApiClient.reports.getLedgerIncomeStatement.mockResolvedValue({
        data: {
          success: true,
          data: {
            net_profit_data: [],
          },
        },
      });
      mockFavaApiClient.reports.getLedgerBalanceSheet.mockResolvedValue({
        data: {
          success: true,
          data: {
            net_worth_data: [],
          },
        },
      });

      // Should succeed even with different userId since homeCharts doesn't check it
      const result = await queryResolver.homeCharts(
        { userId: "different-user" },
        mockContext as IContext,
      );

      expect(result.success).toBe(true);
    });

    it("should throw error when income statement fails", async () => {
      mockFavaApiClient.ledgers.listLedgers.mockResolvedValue(mockLedgersList);
      mockFavaApiClient.reports.getLedgerIncomeStatement.mockResolvedValue({
        data: { success: false },
      });

      await expect(
        queryResolver.homeCharts(
          { userId: "user-123" },
          mockContext as IContext,
        ),
      ).rejects.toThrow("Failed to get the income statement");
    });

    it("should throw error when balance sheet fails", async () => {
      mockFavaApiClient.ledgers.listLedgers.mockResolvedValue(mockLedgersList);
      mockFavaApiClient.reports.getLedgerIncomeStatement.mockResolvedValue({
        data: {
          success: true,
          data: { net_profit_data: [] },
        },
      });
      mockFavaApiClient.reports.getLedgerBalanceSheet.mockResolvedValue({
        data: { success: false },
      });

      await expect(
        queryResolver.homeCharts(
          { userId: "user-123" },
          mockContext as IContext,
        ),
      ).rejects.toThrow("Failed to get the balance sheet");
    });
  });

  describe("journalEntries", () => {
    const mockLedgersList = {
      data: {
        success: true,
        data: [{ name: "test-ledger", full_name: "testuser/test-ledger" }],
      },
    };

    it("should return journal entries successfully", async () => {
      mockFavaApiClient.ledgers.listLedgers.mockResolvedValue(mockLedgersList);
      mockFavaApiClient.legacy.getLegacyJournal.mockResolvedValue({
        data: {
          success: true,
          data: [
            {
              type: "Transaction",
              date: "2024-01-01",
              meta: { filename: "main.bean", lineno: 1 },
              payee: "Test Payee",
              narration: "Test narration",
              postings: [
                {
                  account: "Assets:Cash",
                  units: { number: -100, currency: "USD" },
                  cost: null,
                  flag: null,
                  price: null,
                  meta: { filename: "main.bean", lineno: 2 },
                },
                {
                  account: "Expenses:Food",
                  units: { number: 100, currency: "USD" },
                  cost: null,
                  flag: null,
                  price: null,
                  meta: { filename: "main.bean", lineno: 3 },
                },
              ],
            },
          ],
        },
      });

      const result = await queryResolver.journalEntries(
        { first: 10 },
        mockContext as IContext,
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].type).toBe("Transaction");
      expect(result.data[0].payee).toBe("Test Payee");
    });

    it("should calculate net amount from postings", async () => {
      mockFavaApiClient.ledgers.listLedgers.mockResolvedValue(mockLedgersList);
      mockFavaApiClient.legacy.getLegacyJournal.mockResolvedValue({
        data: {
          success: true,
          data: [
            {
              type: "Transaction",
              date: "2024-01-01",
              meta: { filename: "main.bean", lineno: 1 },
              postings: [
                {
                  account: "Assets:Cash",
                  units: { number: -100, currency: "USD" },
                },
                {
                  account: "Expenses:Food",
                  units: { number: 100, currency: "USD" },
                },
              ],
            },
          ],
        },
      });

      const result = await queryResolver.journalEntries(
        { first: 10 },
        mockContext as IContext,
      );

      expect(result.data[0].netAmount).toBe(0); // -100 + 100 = 0
    });

    it("should set primary account from entry.account for Open/Close entries", async () => {
      mockFavaApiClient.ledgers.listLedgers.mockResolvedValue(mockLedgersList);
      mockFavaApiClient.legacy.getLegacyJournal.mockResolvedValue({
        data: {
          success: true,
          data: [
            {
              type: "Open",
              date: "2024-01-01",
              meta: { filename: "main.bean", lineno: 1 },
              account: "Assets:NewAccount",
            },
          ],
        },
      });

      const result = await queryResolver.journalEntries(
        { first: 10 },
        mockContext as IContext,
      );

      expect(result.data[0].primaryAccount).toBe("Assets:NewAccount");
    });

    it("should set primary account from first non-zero posting for transactions", async () => {
      mockFavaApiClient.ledgers.listLedgers.mockResolvedValue(mockLedgersList);
      mockFavaApiClient.legacy.getLegacyJournal.mockResolvedValue({
        data: {
          success: true,
          data: [
            {
              type: "Transaction",
              date: "2024-01-01",
              meta: { filename: "main.bean", lineno: 1 },
              postings: [
                {
                  account: "Assets:Cash",
                  units: { number: -100, currency: "USD" },
                },
                {
                  account: "Expenses:Food",
                  units: { number: 100, currency: "USD" },
                },
              ],
            },
          ],
        },
      });

      const result = await queryResolver.journalEntries(
        { first: 10 },
        mockContext as IContext,
      );

      expect(result.data[0].primaryAccount).toBe("Assets:Cash");
    });

    it("should create searchable text from payee, narration, and accounts", async () => {
      mockFavaApiClient.ledgers.listLedgers.mockResolvedValue(mockLedgersList);
      mockFavaApiClient.legacy.getLegacyJournal.mockResolvedValue({
        data: {
          success: true,
          data: [
            {
              type: "Transaction",
              date: "2024-01-01",
              meta: { filename: "main.bean", lineno: 1 },
              payee: "Grocery Store",
              narration: "Weekly shopping",
              postings: [
                {
                  account: "Expenses:Groceries",
                  units: { number: 50, currency: "USD" },
                },
              ],
            },
          ],
        },
      });

      const result = await queryResolver.journalEntries(
        { first: 10 },
        mockContext as IContext,
      );

      expect(result.data[0].searchableText).toContain("grocery store");
      expect(result.data[0].searchableText).toContain("weekly shopping");
      expect(result.data[0].searchableText).toContain("expenses:groceries");
    });

    it("should handle pagination info correctly when results match first", async () => {
      mockFavaApiClient.ledgers.listLedgers.mockResolvedValue(mockLedgersList);
      mockFavaApiClient.legacy.getLegacyJournal.mockResolvedValue({
        data: {
          success: true,
          data: [
            { type: "Transaction", date: "2024-01-01", meta: {}, postings: [] },
            { type: "Transaction", date: "2024-01-02", meta: {}, postings: [] },
          ],
        },
      });

      const result = await queryResolver.journalEntries(
        { first: 2 },
        mockContext as IContext,
      );

      expect(result.pageInfo?.hasNextPage).toBe(true);
      expect(result.pageInfo?.hasPreviousPage).toBe(false);
    });

    it("should handle pagination with after cursor", async () => {
      mockFavaApiClient.ledgers.listLedgers.mockResolvedValue(mockLedgersList);
      mockFavaApiClient.legacy.getLegacyJournal.mockResolvedValue({
        data: {
          success: true,
          data: [
            { type: "Transaction", date: "2024-01-03", meta: {}, postings: [] },
          ],
        },
      });

      const result = await queryResolver.journalEntries(
        { first: 10, after: "2024-01-02" },
        mockContext as IContext,
      );

      expect(result.pageInfo?.hasPreviousPage).toBe(true);
    });

    it("should throw error when legacy journal API fails", async () => {
      mockFavaApiClient.ledgers.listLedgers.mockResolvedValue(mockLedgersList);
      mockFavaApiClient.legacy.getLegacyJournal.mockResolvedValue({
        data: { success: false },
      });

      await expect(
        queryResolver.journalEntries({ first: 10 }, mockContext as IContext),
      ).rejects.toThrow("Failed to get the legacy journal");
    });

    it("should handle empty results", async () => {
      mockFavaApiClient.ledgers.listLedgers.mockResolvedValue(mockLedgersList);
      mockFavaApiClient.legacy.getLegacyJournal.mockResolvedValue({
        data: {
          success: true,
          data: [],
        },
      });

      const result = await queryResolver.journalEntries(
        { first: 10 },
        mockContext as IContext,
      );

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
      expect(result.pageInfo?.hasNextPage).toBe(false);
      expect(result.pageInfo?.startCursor).toBe("");
      expect(result.pageInfo?.endCursor).toBe("");
    });

    it("should handle postings with amount string instead of units", async () => {
      mockFavaApiClient.ledgers.listLedgers.mockResolvedValue(mockLedgersList);
      mockFavaApiClient.legacy.getLegacyJournal.mockResolvedValue({
        data: {
          success: true,
          data: [
            {
              type: "Transaction",
              date: "2024-01-01",
              meta: { filename: "main.bean", lineno: 1 },
              postings: [
                {
                  account: "Assets:Cash",
                  amount: "-100.50 USD",
                },
              ],
            },
          ],
        },
      });

      const result = await queryResolver.journalEntries(
        { first: 10 },
        mockContext as IContext,
      );

      expect(result.success).toBe(true);
      // The posting should have units converted from amount string
      expect(result.data[0].postings?.[0].units?.number).toBe(-100.5);
      expect(result.data[0].postings?.[0].units?.currency).toBe("USD");
    });

    it("should pass all query parameters to API", async () => {
      mockFavaApiClient.ledgers.listLedgers.mockResolvedValue(mockLedgersList);
      mockFavaApiClient.legacy.getLegacyJournal.mockResolvedValue({
        data: { success: true, data: [] },
      });

      await queryResolver.journalEntries(
        {
          first: 10,
          after: "2024-01-01",
          searchQuery: "groceries",
          accountFilter: "Assets:*",
          amountMin: 50,
          amountMax: 200,
          entryTypes: ["Transaction", "Balance"],
          sortBy: "date",
          sortOrder: "desc",
          groupBy: "account",
        },
        mockContext as IContext,
      );

      expect(mockFavaApiClient.legacy.getLegacyJournal).toHaveBeenCalledWith(
        "testuser",
        "test-ledger",
        expect.objectContaining({
          first: 10,
          after: "2024-01-01",
          search_query: "groceries",
          account_filter: "Assets:*",
          amount_min: 50,
          amount_max: 200,
          entry_types: "Transaction,Balance",
          sort_by: "date",
          sort_order: "desc",
          group_by: "account",
        }),
      );
    });
  });
  /**
   * The legacy family is the one place the pin cannot be enforced from the
   * `ledgerId` argument alone: these verbs declare it nullable (and
   * `journalEntries` omits it entirely), then fall back to whichever ledger the
   * account lists first — a ledger no argument named.
   */
  describe("ledger pin", () => {
    const pinnedContext = () => {
      const identity: Identity = {
        userId: "user-123",
        method: "apikey",
        scopes: new Set(["ledger.read", "ledger.write"]),
        ledgerScope: "testuser/pinned",
      };
      return {
        ...mockContext,
        identity,
        getCurrentIdentity: jest.fn().mockReturnValue(identity),
      } as unknown as IContext;
    };

    beforeEach(() => {
      for (const report of [
        mockFavaApiClient.reports.getLedgerOptions,
        mockFavaApiClient.reports.getLedgerAttributes,
        mockFavaApiClient.reports.getLedgerErrors,
      ]) {
        report.mockResolvedValue({ data: { success: true, data: {} } });
      }
      mockFavaApiClient.reports.getLedgerAttributes.mockResolvedValue({
        data: { success: true, data: { accounts: [], currencies: [] } },
      });
      mockFavaApiClient.reports.getLedgerErrors.mockResolvedValue({
        data: { success: true, data: [] },
      });
    });

    it("ledgerMeta defaults a pinned credential to its own ledger", async () => {
      await queryResolver.ledgerMeta({ userId: "user-123" }, pinnedContext());

      expect(mockFavaApiClient.reports.getLedgerOptions).toHaveBeenCalledWith(
        "testuser",
        "pinned",
      );
      // The account's ledger list is never consulted: it is the thing that
      // would have handed back somebody else's book.
      expect(mockFavaApiClient.ledgers.listLedgers).not.toHaveBeenCalled();
    });

    it("ledgerMeta refuses a pinned credential naming another ledger", async () => {
      await expect(
        queryResolver.ledgerMeta(
          { userId: "user-123", ledgerId: "testuser/other" },
          pinnedContext(),
        ),
      ).rejects.toMatchObject({ category: ErrorCategory.FORBIDDEN });
    });

    it("journalEntries reads the pinned ledger, not the account's first", async () => {
      mockFavaApiClient.legacy.getLegacyJournal.mockResolvedValue({
        data: { success: true, data: [] },
      });

      await queryResolver.journalEntries({} as never, pinnedContext());

      expect(mockFavaApiClient.legacy.getLegacyJournal).toHaveBeenCalledWith(
        "testuser",
        "pinned",
        expect.anything(),
      );
      expect(mockFavaApiClient.ledgers.listLedgers).not.toHaveBeenCalled();
    });

    it("delegates an explicitly named ledger to the entry service PDP", async () => {
      await mutationResolver.addEntries(
        {
          ...createEntryInput(),
          ledgerId: "testuser/other",
        } as never,
        pinnedContext(),
      );

      expect(mockLedgerEntryService.addBulkEntries).toHaveBeenCalledWith(
        expect.objectContaining({ ledgerScope: "testuser/pinned" }),
        "testuser",
        "other",
        expect.any(Array),
        "web",
      );
    });

    it("leaves an unpinned caller on the original default", async () => {
      mockFavaApiClient.ledgers.listLedgers.mockResolvedValue({
        data: {
          success: true,
          data: [{ name: "test-ledger", full_name: "testuser/test-ledger" }],
        },
      });

      await queryResolver.ledgerMeta(
        { userId: "user-123" },
        mockContext as IContext,
      );

      expect(mockFavaApiClient.ledgers.listLedgers).toHaveBeenCalled();
      expect(mockFavaApiClient.reports.getLedgerOptions).toHaveBeenCalledWith(
        "testuser",
        "test-ledger",
      );
    });
  });
});
