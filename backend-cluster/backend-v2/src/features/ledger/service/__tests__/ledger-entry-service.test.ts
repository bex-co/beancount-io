import {
  createLedgerEntryWriter,
  LedgerEntryService,
} from "../ledger-entry-service";
import { OperationNotAllowedError, ValidationError } from "@/shared/errors";
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
};

const mockAddBulkEntries = jest.fn();
const mockGetLedgerFile = jest.fn();
const mockCreateLedgerFile = jest.fn();
const mockGetLedgerBcioOptions = jest.fn();
const mockGetLedgerAccounts = jest.fn();

const mockFavaApiClient = {
  entries: { addBulkEntries: mockAddBulkEntries },
  ledgers: {
    getLedgerFile: mockGetLedgerFile,
    createLedgerFile: mockCreateLedgerFile,
  },
  reports: {
    getLedgerBcioOptions: mockGetLedgerBcioOptions,
    getLedgerAccounts: mockGetLedgerAccounts,
  },
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
    mockGetLedgerAccounts.mockResolvedValue({
      data: {
        success: true,
        data: {
          "Assets:Cash": {},
          "Expenses:Food": {},
          "Expenses:Food:Groceries": {},
          "Expenses:Food:Restaurant": {},
        },
      },
    });
    (authorizeLedger as jest.Mock).mockResolvedValue({
      ledgerRepoId: 1,
      ownerUserId: "user-123",
    });

    service = new LedgerEntryService(
      createLedgerEntryWriter(mockFavaClientFactory as any),
      {} as any,
      // Appending text is DirectiveAppendWorkflow's job now (w2/012) and has
      // its own suite; this one covers structured entries.
      {
        appendDirectiveText: jest.fn(),
      } as any,
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
          allowInvalid: false,
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

    // w23/071: a budget's account is a `custom` argument bean-check never
    // reads, so a misspelt one was committed and never applied.
    describe("a budget's account", () => {
      const budget = (account: string) => ({
        type: "budget" as const,
        entry: {
          date: "2024-01-01",
          account,
          interval: "monthly",
          amount: { number: "500.00", currency: "USD" },
        },
      });
      const add = (
        entries: Parameters<typeof service.addBulkEntries>[3],
        allowInvalid = false,
      ) =>
        service.addBulkEntries(
          IDENTITY,
          "testuser",
          "test-ledger",
          entries,
          "web",
          allowInvalid,
        );

      it("is refused when the ledger opens neither it nor an account under it", async () => {
        const refusal = add([budget("Expenses:Food:Grocery")]);
        await expect(refusal).rejects.toThrow(ValidationError);
        await expect(refusal).rejects.toMatchObject({
          category: "VALIDATION_FAILED",
          message: expect.stringContaining(
            "entry 0: budget account Expenses:Food:Grocery is not opened in this ledger, nor is any account under it; nearest: Expenses:Food, Expenses:Food:Groceries, Expenses:Food:Restaurant",
          ),
          metadata: expect.objectContaining({
            hint: expect.stringContaining("allowInvalid: true"),
          }),
        });
        expect(mockAddBulkEntries).not.toHaveBeenCalled();
      });

      it.each([
        ["an opened account", [budget("Expenses:Food:Groceries")]],
        ["a parent of opened accounts", [budget("Expenses")]],
        [
          "an account the same call opens",
          [
            {
              type: "open" as const,
              entry: {
                date: "2024-01-01",
                account: "Expenses:Travel",
                currencies: [],
              },
            },
            budget("Expenses:Travel"),
          ],
        ],
      ])("accepts %s", async (_case, entries) => {
        await add(entries);
        expect(mockAddBulkEntries).toHaveBeenCalledTimes(1);
      });

      it("is recorded anyway with allowInvalid, without reading the accounts", async () => {
        await add([budget("Expenses:NopeQa")], true);
        expect(mockAddBulkEntries).toHaveBeenCalledTimes(1);
        expect(mockGetLedgerAccounts).not.toHaveBeenCalled();
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

    it.each(["2026-13-45", "2026-02-30", "not-a-date"])(
      "refuses the date %s as bad input, naming the entry, before any ledger work",
      async (date) => {
        await expect(
          service.addBulkEntries(
            IDENTITY,
            "testuser",
            "test-ledger",
            [
              {
                type: "commodity",
                entry: { date: "2024-01-01", currency: "USD" },
              },
              { type: "commodity", entry: { date, currency: "EUR" } },
            ],
            "web",
          ),
        ).rejects.toMatchObject({
          category: "BAD_USER_INPUT",
          message: expect.stringContaining(`entry 1: date "${date}"`),
        });
        expect(mockGetLedgerFile).not.toHaveBeenCalled();
        expect(mockCreateLedgerFile).not.toHaveBeenCalled();
      },
    );

    // w23/m6/t007: pad routes through pad_file like open routes through
    // account_file.
    it("routes a pad entry to pad_file", async () => {
      mockGetLedgerBcioOptions.mockResolvedValue({
        data: {
          success: true,
          data: {
            ...mockBcioOptionsResponse.data.data,
            pad_file: "pads/{year}.bean",
          },
        },
      });

      await service.addBulkEntries(
        IDENTITY,
        "testuser",
        "test-ledger",
        [
          {
            type: "pad",
            entry: {
              date: "2026-03-04",
              account: "Assets:Cash",
              sourceAccount: "Equity:Opening-Balances",
            },
          },
        ],
        "web",
      );

      expect(firstItem()).toEqual(
        expect.objectContaining({
          type: "pad",
          filename: "pads/2026.bean",
        }),
      );
      expect(mockAddBulkEntries).toHaveBeenCalledTimes(1);
    });

    describe("nested key twins (w23/140)", () => {
      it("accepts a pad carrying source_account only", async () => {
        await service.addBulkEntries(
          IDENTITY,
          "testuser",
          "test-ledger",
          [
            {
              type: "pad",
              entry: {
                date: "2026-03-04",
                account: "Assets:Cash",
                source_account: "Equity:Opening-Balances",
              },
            },
          ],
          "web",
        );

        const item = firstItem().item;
        expect(item.sourceAccount).toBe("Equity:Opening-Balances");
        expect("source_account" in item).toBe(false);
      });

      it("refuses a pad with two different sources instead of guessing", async () => {
        await expect(
          service.addBulkEntries(
            IDENTITY,
            "testuser",
            "test-ledger",
            [
              {
                type: "pad",
                entry: {
                  date: "2026-03-04",
                  account: "Assets:Cash",
                  sourceAccount: "Equity:A",
                  source_account: "Equity:B",
                },
              },
            ],
            "web",
          ),
        ).rejects.toThrow(
          "entry 0: pass one source account, not sourceAccount and source_account with different values.",
        );
        expect(mockAddBulkEntries).not.toHaveBeenCalled();
      });

      it("refuses a pad carrying neither spelling", async () => {
        await expect(
          service.addBulkEntries(
            IDENTITY,
            "testuser",
            "test-ledger",
            [
              {
                type: "pad",
                entry: { date: "2026-03-04", account: "Assets:Cash" },
              },
            ],
            "web",
          ),
        ).rejects.toThrow(
          "entry 0: sourceAccount is required — source_account works too.",
        );
        expect(mockAddBulkEntries).not.toHaveBeenCalled();
      });

      it("accepts identical pad twins and an explicit null as missing", async () => {
        await service.addBulkEntries(
          IDENTITY,
          "testuser",
          "test-ledger",
          [
            {
              type: "pad",
              entry: {
                date: "2026-03-04",
                account: "Assets:Cash",
                sourceAccount: "Equity:Opening-Balances",
                source_account: "Equity:Opening-Balances",
              },
            },
            {
              type: "pad",
              entry: {
                date: "2026-03-05",
                account: "Assets:Bank",
                // GraphQL nullable fields arrive as explicit null when set
                // to null; that means missing, like the top-level twins.
                sourceAccount: null as unknown as string,
                source_account: "Equity:Opening-Balances",
              },
            },
          ],
          "web",
        );

        const items = committedEntries().map(
          (entry: { item: { sourceAccount: string } }) => entry.item,
        );
        expect(
          items.map(
            (item: { sourceAccount: string }) => item.sourceAccount,
          ),
        ).toEqual([
          "Equity:Opening-Balances",
          "Equity:Opening-Balances",
        ]);
      });

      const pricedPostings = (posting: Record<string, unknown>) => [
        {
          units: { number: "10", currency: "USD" },
          account: "Assets:Cash",
          ...posting,
        },
        { units: { number: "-10", currency: "USD" }, account: "Expenses:Food" },
      ];

      it("accepts a posting carrying total_price only", async () => {
        await service.addBulkEntries(
          IDENTITY,
          "testuser",
          "test-ledger",
          [
            {
              type: "transaction",
              entry: {
                date: "2026-03-04",
                flag: "*",
                postings: pricedPostings({
                  total_price: { number: "10", currency: "USD" },
                }),
              },
            },
          ],
          "web",
        );

        const posting = firstItem().item.postings[0];
        expect(posting.totalPrice).toEqual({ number: "10", currency: "USD" });
        expect("total_price" in posting).toBe(false);
      });

      it("refuses a posting with two different total prices", async () => {
        await expect(
          service.addBulkEntries(
            IDENTITY,
            "testuser",
            "test-ledger",
            [
              {
                type: "transaction",
                entry: {
                  date: "2026-03-04",
                  flag: "*",
                  postings: pricedPostings({
                    totalPrice: { number: "10", currency: "USD" },
                    total_price: { number: "11", currency: "USD" },
                  }),
                },
              },
            ],
            "web",
          ),
        ).rejects.toThrow(
          "entry 0: pass one postings[0] total price, not totalPrice and total_price with different values.",
        );
        expect(mockAddBulkEntries).not.toHaveBeenCalled();
      });

      it("refuses total-price twins that differ as text even when equal as numbers", async () => {
        // `10` and `10.0` render different directive text, so they are
        // different values — accepting either silently would guess the file.
        await expect(
          service.addBulkEntries(
            IDENTITY,
            "testuser",
            "test-ledger",
            [
              {
                type: "transaction",
                entry: {
                  date: "2026-03-04",
                  flag: "*",
                  postings: pricedPostings({
                    totalPrice: { number: "10", currency: "USD" },
                    total_price: { number: "10.0", currency: "USD" },
                  }),
                },
              },
            ],
            "web",
          ),
        ).rejects.toThrow(
          "entry 0: pass one postings[0] total price, not totalPrice and total_price with different values.",
        );
        expect(mockAddBulkEntries).not.toHaveBeenCalled();
      });

      it("accepts identical total-price twins", async () => {
        await service.addBulkEntries(
          IDENTITY,
          "testuser",
          "test-ledger",
          [
            {
              type: "transaction",
              entry: {
                date: "2026-03-04",
                flag: "*",
                postings: pricedPostings({
                  totalPrice: { number: "10", currency: "USD" },
                  total_price: { number: "10", currency: "USD" },
                }),
              },
            },
          ],
          "web",
        );

        expect(firstItem().item.postings[0].totalPrice).toEqual({
          number: "10",
          currency: "USD",
        });
      });
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

    /**
     * w21/683 (replacing w1/m10/t016's boundary, which kept the created file).
     *
     * A missing routed file is created only after the ledger has accepted the
     * entries in a dry run, so a refused write leaves no empty file and no
     * "chore: create file" commit. A retry then finds nothing to clean up.
     */
    it("creates nothing when the ledger refuses the entries, and creates the file once they are accepted", async () => {
      mockGetLedgerFile.mockResolvedValue({ data: { success: false } });
      mockAddBulkEntries.mockResolvedValueOnce(failResponse);

      const entries = [
        {
          type: "commodity" as const,
          entry: { date: "2024-01-01", currency: "USD" },
        },
      ];
      await expect(
        service.addBulkEntries(
          IDENTITY,
          "testuser",
          "test-ledger",
          entries,
          "web",
        ),
      ).rejects.toThrow();

      expect(mockCreateLedgerFile).not.toHaveBeenCalled();
      expect(mockAddBulkEntries).toHaveBeenCalledTimes(1);
      expect(mockAddBulkEntries.mock.calls[0][2]).toMatchObject({
        dryRun: true,
      });

      // Retry: accepted by the dry run, so the file is created and written.
      const retried = await service.addBulkEntries(
        IDENTITY,
        "testuser",
        "test-ledger",
        entries,
        "web",
      );
      expect(retried.success).toBe(true);
      expect(mockCreateLedgerFile).toHaveBeenCalledTimes(1);
      expect(mockAddBulkEntries).toHaveBeenCalledTimes(3);
      expect(mockAddBulkEntries.mock.calls[1][2]).toMatchObject({
        dryRun: true,
      });
      expect(mockAddBulkEntries.mock.calls[2][2].dryRun).toBeFalsy();
    });

    it("asks the ledger once when every target file exists", async () => {
      await service.addBulkEntries(
        IDENTITY,
        "testuser",
        "test-ledger",
        [{ type: "commodity", entry: { date: "2024-01-01", currency: "USD" } }],
        "web",
      );
      expect(mockAddBulkEntries).toHaveBeenCalledTimes(1);
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

  /** w4/m38: early-year dates keep their year in source and routing. */
  describe("cost date (w23/174)", () => {
    const withCostDate = (date: string) =>
      service.addBulkEntries(
        IDENTITY,
        "testuser",
        "test-ledger",
        [
          {
            type: "transaction",
            entry: {
              date: "2026-01-02",
              flag: "*",
              narration: "Buy",
              postings: [
                {
                  account: "Assets:Cash",
                  units: { number: "10", currency: "AAPL" },
                  cost: { number: "1.00", currency: "USD", date },
                },
                { account: "Expenses:Food" },
              ],
            },
          },
        ],
        "web",
        true,
      );

    it("refuses a non-date before anything is written, even with allowInvalid", async () => {
      await expect(withCostDate("yesterday")).rejects.toThrow(
        /entry 0: postings\[0\]\.cost\.date "yesterday" is not a calendar date/,
      );
      expect(mockAddBulkEntries).not.toHaveBeenCalled();
    });

    it("refuses an off-calendar date", async () => {
      await expect(withCostDate("2026-02-30")).rejects.toThrow(
        /not a calendar date/,
      );
    });

    it("accepts a real calendar date", async () => {
      await withCostDate("2026-01-01");
      expect(mockAddBulkEntries).toHaveBeenCalledTimes(1);
    });
  });

  describe("early-year dates", () => {
    const routedOpen = async (date: string) => {
      mockGetLedgerBcioOptions.mockResolvedValue({
        data: {
          success: true,
          data: {
            ...mockBcioOptionsResponse.data.data,
            account_file: "accounts/{year}/{month}.bean",
          },
        },
      });
      await service.addBulkEntries(
        IDENTITY,
        "testuser",
        "test-ledger",
        [
          {
            type: "open",
            entry: {
              date,
              account: "Assets:Qa-20261020:Date",
              currencies: ["USD"],
            },
          },
        ],
        "web",
      );
      return firstItem();
    };

    it.each([
      ["0001-01-01", "accounts/0001/01.bean"],
      ["0099-12-31", "accounts/0099/12.bean"],
      ["0100-01-01", "accounts/0100/01.bean"],
      ["2026-01-01", "accounts/2026/01.bean"],
    ])("writes %s exactly, routed to %s", async (date, filename) => {
      const entry = await routedOpen(date);
      expect(entry).toEqual(
        expect.objectContaining({
          filename,
          item: expect.objectContaining({ date }),
        }),
      );
      expect(mockAddBulkEntries).toHaveBeenCalledTimes(1);
    });

    it("routes by the UTC calendar day on a server west of UTC", async () => {
      const originalTz = process.env.TZ;
      process.env.TZ = "America/Los_Angeles";
      try {
        expect((await routedOpen("2026-01-01")).filename).toBe(
          "accounts/2026/01.bean",
        );
      } finally {
        process.env.TZ = originalTz;
      }
    });

    it("still refuses year 0000 before any write", async () => {
      await expect(routedOpen("0000-01-01")).rejects.toThrow(
        /not a calendar date/,
      );
      expect(mockAddBulkEntries).not.toHaveBeenCalled();
    });
  });
});
