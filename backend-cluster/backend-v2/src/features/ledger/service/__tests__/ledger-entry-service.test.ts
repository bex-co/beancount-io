import { LedgerEntryService } from "../ledger-entry-service";
import { OperationNotAllowedError } from "@/shared/errors";
import { authorizeLedger } from "@/features/ledger/utils/authorize-ledger";
import type { Identity } from "@/server/api/identity";

// Exercises this service's own behavior; authorizeLedger has its own suite.
jest.mock("@/features/ledger/utils/authorize-ledger", () => ({
  ...jest.requireActual("@/features/ledger/utils/authorize-ledger"),
  authorizeLedger: jest.fn(),
}));

const IDENTITY: Identity = {
  userId: "user-123",
  method: "oauth",
  scopes: new Set(),
  capabilityExempt: false,
};

const mockAddBulkEntries = jest.fn();
const mockGetLedgerFile = jest.fn();
const mockCreateLedgerFile = jest.fn();
const mockGetLedgerBcioOptions = jest.fn();

const mockFavaApiClient = {
  entries: { addBulkEntries: mockAddBulkEntries },
  ledgers: {
    getLedgerFile: mockGetLedgerFile,
    createLedgerFile: mockCreateLedgerFile,
  },
  reports: { getLedgerBcioOptions: mockGetLedgerBcioOptions },
};

const mockFavaClientFactory = {
  getPublicApiClient: jest.fn().mockResolvedValue(mockFavaApiClient),
};

const mockCacheHelper = {
  get: jest.fn(),
  set: jest.fn(),
};

const okResponse = { data: { success: true, data: null } };
const failResponse = { data: { success: false } };

const mockBcioOptionsResponse = {
  data: {
    success: true,
    data: {
      default_file: "main.bean",
      transaction_file: null,
      account_file: null,
      price_file: null,
      balance_file: null,
      note_file: null,
      pad_file: null,
    },
  },
};

describe("LedgerEntryService", () => {
  let service: LedgerEntryService;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAddBulkEntries.mockResolvedValue(okResponse);
    mockGetLedgerFile.mockResolvedValue({
      data: { success: true, data: { path: "main.bean" } },
    });
    mockCreateLedgerFile.mockResolvedValue({
      data: { success: true, data: null },
    });
    mockGetLedgerBcioOptions.mockResolvedValue(mockBcioOptionsResponse);
    (authorizeLedger as jest.Mock).mockResolvedValue({
      ledgerRepoId: 1,
      ownerUserId: "user-123",
    });

    service = new LedgerEntryService(
      mockFavaClientFactory as any,
      {} as any,
      {} as any,
    );
  });

  /** Entries array passed to the mocked addBulkEntries call. */
  const committedEntries = () => mockAddBulkEntries.mock.calls[0][2].entries;
  const firstItem = () => committedEntries()[0];

  describe("transaction entries", () => {
    it("should add a transaction entry successfully", async () => {
      const result = await service.addBulkEntries(
        IDENTITY,
        "testuser",
        "test-ledger",
        [
          {
            type: "transaction",
            entry: {
              date: "2024-01-01",
              flag: "*",
              payee: "Test Payee",
              narration: "Test transaction",
              postings: [
                {
                  units: { number: "100.00", currency: "USD" },
                  account: "Assets:Checking",
                },
                {
                  units: { number: "-100.00", currency: "USD" },
                  account: "Expenses:Groceries",
                },
              ],
              tags: ["tag1", "tag2"],
              links: ["link1"],
            },
          },
        ],
        "web",
      );

      expect(mockAddBulkEntries).toHaveBeenCalledWith(
        "testuser",
        "test-ledger",
        {
          entries: [
            {
              type: "transaction",
              filename: "main.bean",
              item: expect.objectContaining({
                date: "2024-01-01",
                flag: "*",
                payee: "Test Payee",
                narration: "Test transaction",
                postings: [
                  expect.objectContaining({
                    units: { number: "100.00", currency: "USD" },
                    account: "Assets:Checking",
                    price: null,
                  }),
                  expect.objectContaining({
                    units: { number: "-100.00", currency: "USD" },
                    account: "Expenses:Groceries",
                    price: null,
                  }),
                ],
                tags: ["tag1", "tag2"],
                links: ["link1"],
              }),
            },
          ],
        },
        // Web writes carry no exemption header; mobile would pass one here.
        {},
      );

      expect(result.success).toBe(true);
    });

    it("tells ledger-v2 a mobile write is exempt from the directive limit", async () => {
      // Mobile is exempt for a commercial reason — it is free and has no Stripe
      // integration, so there is no paid plan to send anyone to (ADR 0001
      // Finding 8). This asserts the fact travels explicitly rather than through
      // the Redis ticket, which goes away once the pre-receive hook does.
      await service.addBulkEntries(
        IDENTITY,
        "testuser",
        "test-ledger",
        [
          {
            type: "transaction",
            entry: {
              date: "2024-01-01",
              flag: "*",
              payee: "P",
              narration: "N",
              postings: [
                {
                  units: { number: "1.00", currency: "USD" },
                  account: "Assets:Checking",
                },
              ],
            },
          },
        ],
        "mobile",
      );

      expect(mockAddBulkEntries).toHaveBeenLastCalledWith(
        "testuser",
        "test-ledger",
        expect.anything(),
        { headers: { "x-directive-limit-exempt": "1" } },
      );
    });

    it("sends no exemption for a web write", async () => {
      await service.addBulkEntries(
        IDENTITY,
        "testuser",
        "test-ledger",
        [
          {
            type: "transaction",
            entry: {
              date: "2024-01-01",
              flag: "*",
              payee: "P",
              narration: "N",
              postings: [
                {
                  units: { number: "1.00", currency: "USD" },
                  account: "Assets:Checking",
                },
              ],
            },
          },
        ],
        "web",
      );

      expect(mockAddBulkEntries).toHaveBeenLastCalledWith(
        "testuser",
        "test-ledger",
        expect.anything(),
        {},
      );
    });

    it("should preserve price on a posting", async () => {
      await service.addBulkEntries(
        IDENTITY,
        "testuser",
        "test-ledger",
        [
          {
            type: "transaction",
            entry: {
              date: "2024-01-01",
              flag: "*",
              payee: "Test Payee",
              narration: "With price",
              postings: [
                {
                  units: { number: "10", currency: "SHARES" },
                  account: "Assets:Stocks",
                  price: { number: "50.00", currency: "USD" },
                  flag: "*",
                },
              ],
              tags: [],
              links: [],
            },
          },
        ],
        "web",
      );

      expect(firstItem().item.postings[0].price).toEqual({
        number: "50.00",
        currency: "USD",
      });
    });

    it("should commit multiple entries in a single bulk call", async () => {
      const makeTxn = (date: string, payee: string) => ({
        type: "transaction" as const,
        entry: {
          date,
          flag: "*",
          payee,
          narration: payee,
          postings: [
            {
              units: { number: "100.00", currency: "USD" },
              account: "Assets:Checking",
            },
            {
              units: { number: "-100.00", currency: "USD" },
              account: "Expenses:Groceries",
            },
          ],
          tags: [],
          links: [],
        },
      });

      const result = await service.addBulkEntries(
        IDENTITY,
        "testuser",
        "test-ledger",
        [makeTxn("2024-01-01", "Payee 1"), makeTxn("2024-01-02", "Payee 2")],
        "web",
      );

      expect(mockAddBulkEntries).toHaveBeenCalledTimes(1);
      expect(committedEntries()).toEqual([
        expect.objectContaining({
          type: "transaction",
          item: expect.objectContaining({
            date: "2024-01-01",
            payee: "Payee 1",
          }),
        }),
        expect.objectContaining({
          type: "transaction",
          item: expect.objectContaining({
            date: "2024-01-02",
            payee: "Payee 2",
          }),
        }),
      ]);
      expect(result.success).toBe(true);
    });

    it("should throw when the bulk commit fails", async () => {
      mockAddBulkEntries.mockResolvedValue(failResponse);

      await expect(
        service.addBulkEntries(
          IDENTITY,
          "testuser",
          "test-ledger",
          [
            {
              type: "transaction",
              entry: {
                date: "2024-01-01",
                flag: "*",
                payee: "Test",
                narration: "Test",
                postings: [],
                tags: [],
                links: [],
              },
            },
          ],
          "web",
        ),
      ).rejects.toThrow(OperationNotAllowedError);
    });
  });

  describe("other directive types", () => {
    it("should add a commodity entry", async () => {
      await service.addBulkEntries(
        IDENTITY,
        "testuser",
        "test-ledger",
        [{ type: "commodity", entry: { date: "2024-01-01", currency: "USD" } }],
        "web",
      );

      expect(firstItem()).toEqual({
        type: "commodity",
        filename: "main.bean",
        item: { date: "2024-01-01", currency: "USD" },
      });
    });

    it("should add a price entry", async () => {
      await service.addBulkEntries(
        IDENTITY,
        "testuser",
        "test-ledger",
        [
          {
            type: "price",
            entry: {
              date: "2024-01-01",
              currency: "BTC",
              amount: { number: "50000.00", currency: "USD" },
            },
          },
        ],
        "web",
      );

      expect(firstItem()).toEqual({
        type: "price",
        filename: "main.bean",
        item: {
          date: "2024-01-01",
          currency: "BTC",
          amount: { number: "50000.00", currency: "USD" },
        },
      });
    });

    it("should add a note entry (content → comment)", async () => {
      await service.addBulkEntries(
        IDENTITY,
        "testuser",
        "test-ledger",
        [
          {
            type: "note",
            entry: {
              date: "2024-01-01",
              content: "This is a test note",
              account: "Assets:Checking",
            },
          },
        ],
        "web",
      );

      expect(firstItem()).toEqual({
        type: "note",
        filename: "main.bean",
        item: {
          date: "2024-01-01",
          account: "Assets:Checking",
          comment: "This is a test note",
        },
      });
    });

    it("should add a balance entry", async () => {
      await service.addBulkEntries(
        IDENTITY,
        "testuser",
        "test-ledger",
        [
          {
            type: "balance",
            entry: {
              date: "2024-01-01",
              account: "Assets:Checking",
              amount: { number: "1000.00", currency: "USD" },
            },
          },
        ],
        "web",
      );

      expect(firstItem()).toEqual({
        type: "balance",
        filename: "main.bean",
        item: {
          date: "2024-01-01",
          account: "Assets:Checking",
          amount: { number: "1000.00", currency: "USD" },
        },
      });
    });

    it("should add an open entry", async () => {
      await service.addBulkEntries(
        IDENTITY,
        "testuser",
        "test-ledger",
        [
          {
            type: "open",
            entry: {
              date: "2024-01-01",
              account: "Assets:Cash",
              currencies: ["USD", "EUR"],
            },
          },
        ],
        "web",
      );

      expect(firstItem()).toEqual({
        type: "open",
        filename: "main.bean",
        item: {
          date: "2024-01-01",
          account: "Assets:Cash",
          currencies: ["USD", "EUR"],
        },
      });
    });

    it("should add a close entry", async () => {
      await service.addBulkEntries(
        IDENTITY,
        "testuser",
        "test-ledger",
        [
          {
            type: "close",
            entry: { date: "2024-12-31", account: "Assets:OldBank" },
          },
        ],
        "web",
      );

      expect(firstItem()).toEqual({
        type: "close",
        filename: "main.bean",
        item: { date: "2024-12-31", account: "Assets:OldBank" },
      });
    });

    it("should add a budget entry as a custom directive", async () => {
      await service.addBulkEntries(
        IDENTITY,
        "testuser",
        "test-ledger",
        [
          {
            type: "budget",
            entry: {
              date: "2024-01-01",
              account: "Expenses:Food",
              interval: "monthly",
              amount: { number: "500.00", currency: "USD" },
            },
          },
        ],
        "web",
      );

      expect(firstItem()).toEqual({
        type: "custom",
        filename: "main.bean",
        item: {
          date: "2024-01-01",
          type: "budget",
          values: [
            { kind: "account", value: "Expenses:Food" },
            { kind: "text", value: "monthly" },
            { kind: "amount", number: "500.00", currency: "USD" },
          ],
        },
      });
    });

    it("should add a document entry", async () => {
      await service.addBulkEntries(
        IDENTITY,
        "testuser",
        "test-ledger",
        [
          {
            type: "document",
            entry: {
              date: "2024-01-01",
              account: "Assets:Checking",
              filename: "documents/receipt.pdf",
              links: ["rcpt_1"],
            },
          },
        ],
        "web",
      );

      expect(firstItem()).toEqual({
        type: "document",
        filename: "main.bean",
        item: {
          date: "2024-01-01",
          account: "Assets:Checking",
          filename: "documents/receipt.pdf",
          tags: undefined,
          links: ["rcpt_1"],
        },
      });
    });

    it("should add an event entry", async () => {
      await service.addBulkEntries(
        IDENTITY,
        "testuser",
        "test-ledger",
        [
          {
            type: "event",
            entry: {
              date: "2024-01-01",
              type: "location",
              description: "Berlin",
            },
          },
        ],
        "web",
      );

      expect(firstItem()).toEqual({
        type: "event",
        filename: "main.bean",
        item: { date: "2024-01-01", type: "location", description: "Berlin" },
      });
    });
  });

  describe("file routing", () => {
    it("creates a missing target file before committing", async () => {
      mockGetLedgerFile.mockResolvedValue({ data: { success: false } });

      await service.addBulkEntries(
        IDENTITY,
        "testuser",
        "test-ledger",
        [{ type: "commodity", entry: { date: "2024-01-01", currency: "USD" } }],
        "web",
      );

      expect(mockCreateLedgerFile).toHaveBeenCalledWith(
        "testuser",
        "test-ledger",
        expect.objectContaining({
          path: "main.bean",
          message: "chore: create file",
        }),
      );
    });

    it("skips file creation when the target file already exists", async () => {
      await service.addBulkEntries(
        IDENTITY,
        "testuser",
        "test-ledger",
        [{ type: "commodity", entry: { date: "2024-01-01", currency: "USD" } }],
        "web",
      );

      expect(mockCreateLedgerFile).not.toHaveBeenCalled();
    });
  });

  describe("directive-limit bypass", () => {
    const entries = [
      {
        type: "commodity" as const,
        entry: { date: "2024-01-01", currency: "USD" },
      },
    ];

    it("does not register a bypass ticket for a web write", async () => {
      await service.addBulkEntries(
        IDENTITY,
        "testuser",
        "test-ledger",
        entries,
        "web",
      );

      expect(mockCacheHelper.set).not.toHaveBeenCalled();
    });
  });
});
