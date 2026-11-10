import type { DirectiveJson } from "@rustledger/wasm";
import { loadCachedFileMapForRepo } from "@/foundation/clients/load-cached-ledger-file-map";
import { parseLedgerFiles } from "@/foundation/rustledger";
import { BadUserInputError } from "@/shared/errors";
import { LedgerJournalService } from "../ledger-journal-service";

/**
 * w1/204: the account journal passed an explicit `conversion` through
 * unchecked, so `bogus`, a currency the ledger never names, `usd` and the
 * case variants `AT_COST` / `Units` all answered the units view as if they
 * had been honoured. It now holds them to the statements' rule (w23/156).
 * The register reads this journal, so it inherits the refusal.
 */
jest.mock("@/foundation/clients/load-cached-ledger-file-map", () => ({
  loadCachedFileMapForRepo: jest.fn(),
}));
jest.mock("@/foundation/rustledger", () => ({
  ...jest.requireActual("@/foundation/rustledger"),
  parseLedgerFiles: jest.fn(),
}));

const params = { ledgerId: "synthetic/qa", userId: "synthetic-user" };
const factory = { getPublicApiClient: jest.fn().mockResolvedValue({}) };

const directives: DirectiveJson[] = [
  {
    type: "open",
    date: "2026-01-01",
    account: "Assets:Broker",
    currencies: [],
  },
  { type: "open", date: "2026-01-01", account: "Assets:Cash", currencies: [] },
  {
    type: "transaction",
    date: "2026-02-01",
    flag: "*",
    narration: "QA Buy",
    tags: [],
    links: [],
    postings: [
      {
        account: "Assets:Broker",
        units: { number: "4", currency: "ITOT" },
        cost: {
          number: { kind: "per_unit", value: "100.00" },
          currency: "USD",
          date: "2026-02-01",
        },
      },
      { account: "Assets:Cash", units: { number: "-400.00", currency: "USD" } },
    ],
  },
  {
    type: "price",
    date: "2026-03-01",
    currency: "ITOT",
    amount: { number: "120.00", currency: "USD" },
  },
] as unknown as DirectiveJson[];

beforeEach(() => {
  jest.mocked(loadCachedFileMapForRepo).mockResolvedValue({
    files: { "main.bean": 'option "operating_currency" "USD"\n' },
    entryPoint: "main.bean",
    repoPaths: ["main.bean"],
    sourceFiles: ["main.bean"],
    managedPrices: [],
    managedPricePaths: [],
  });
  jest.mocked(parseLedgerFiles).mockResolvedValue({
    valid: true,
    errors: [],
    options: { operating_currencies: ["USD"], title: null },
    directives,
    directiveCount: directives.length,
  });
});

const read = (conversion?: string) =>
  new LedgerJournalService(factory as never, {} as never).getAccountJournal({
    ...params,
    query: {
      account: "Assets:Broker",
      ...(conversion === undefined ? {} : { conversion }),
    },
  });

describe("the account journal's conversion", () => {
  it.each(["bogus", "EUR", "usd", "AT_COST", "Units"])(
    "refuses %p instead of answering the units view",
    async (conversion) => {
      const refusal = await read(conversion).catch((error: unknown) => error);
      expect(refusal).toBeInstanceOf(BadUserInputError);
      expect((refusal as Error).message).toContain(
        `Unsupported conversion "${conversion}"`,
      );
    },
  );

  it("answers units in the held commodity", async () => {
    const result = await read("units");
    expect(result.items[0]?.balance).toEqual({ ITOT: "4" });
  });

  it("answers at_cost, and defaults to it, in the cost currency", async () => {
    expect((await read("at_cost")).items[0]?.balance).toEqual({
      USD: "400.00",
    });
    expect((await read()).items[0]?.balance).toEqual({ USD: "400.00" });
  });

  it("accepts a currency the ledger names", async () => {
    const result = await read("USD");
    expect(result.items.length).toBeGreaterThan(0);
  });
});
