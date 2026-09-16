import type { DirectiveJson } from "@rustledger/wasm";
import { loadCachedFileMapForRepo } from "@/foundation/clients/load-cached-ledger-file-map";
import { parseLedgerFiles } from "@/foundation/rustledger";
import { LedgerDataService } from "@/features/ledger/service/ledger-data-service";

/**
 * The dashboard's directive-usage counter sums `entries_count_per_type`, so
 * a managed price feed must not appear in it (ADR 015 section 9) while the
 * customer's own prices, including ones that shadowed a managed point, do.
 */
jest.mock("@/foundation/clients/load-cached-ledger-file-map", () => ({
  loadCachedFileMapForRepo: jest.fn(),
}));

jest.mock("@/foundation/rustledger", () => {
  const actual = jest.requireActual("@/foundation/rustledger");
  return { ...actual, parseLedgerFiles: jest.fn() };
});

const loadMock = loadCachedFileMapForRepo as jest.Mock;
const parseMock = parseLedgerFiles as jest.Mock;

const price = (date: string, base: string, quote: string): DirectiveJson =>
  ({
    type: "price",
    date,
    currency: base,
    amount: { number: "1", currency: quote },
  }) as DirectiveJson;

function service() {
  const giteaClientFactory = { getPublicApiClient: jest.fn() };
  return new LedgerDataService(giteaClientFactory as never, {} as never);
}

beforeEach(() => {
  loadMock.mockReset();
  parseMock.mockReset();
  loadMock.mockResolvedValue({
    files: { "main.bean": "" },
    entryPoint: "main.bean",
    repoPaths: ["main.bean"],
    managedPricePaths: ["https:/beancount.io/prices/BTC-USD"],
    managedPrices: [
      {
        url: "https://beancount.io/prices/BTC-USD",
        alias: "BTC-USD",
        commodity: "BTC",
        quote: "USD",
        effectiveDates: ["2026-09-13", "2026-09-15"],
        shadowedCount: 1,
      },
    ],
  });
  parseMock.mockResolvedValue({
    valid: true,
    errors: [],
    options: { operating_currencies: ["USD"] },
    directiveCount: 7,
    directives: [
      { type: "open", date: "2020-01-01", account: "Assets:Cash", currencies: [] },
      { type: "open", date: "2020-01-01", account: "Assets:BTC", currencies: [] },
      price("2026-09-13", "BTC", "USD"), // managed
      price("2026-09-15", "BTC", "USD"), // managed
      price("2026-09-14", "BTC", "USD"), // the customer's, shadowed the feed
      price("2026-09-12", "USD", "BTC"), // the customer's, reciprocal pair
      {
        type: "transaction",
        date: "2026-09-15",
        flag: "*",
        tags: [],
        links: [],
        postings: [],
      },
    ] as DirectiveJson[],
  });
});

it("counts the customer's directives and none of the feed's", async () => {
  const counts = await service().getEntriesCountPerType({
    ledgerId: "alice/main",
    userId: "user-1",
  });
  expect(
    Object.fromEntries(
      counts.filter((c) => c.number > 0).map((c) => [c.type, c.number]),
    ),
  ).toEqual({ Open: 2, Price: 2, Transaction: 1 });
});
