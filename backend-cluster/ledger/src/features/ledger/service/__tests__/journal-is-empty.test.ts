import { loadCachedFileMapForRepo } from "@/foundation/clients/load-cached-ledger-file-map";
import { LedgerJournalService } from "@/features/ledger/service/ledger-journal-service";
import type { DirectiveJson } from "@rustledger/wasm";

// Same scripted-parse harness as the plaintext journal tests: the WASM
// engine cannot boot under jest, but the service's getJournal path runs
// for real against scripted directives.
jest.mock("@/foundation/clients/load-cached-ledger-file-map", () => ({
  loadCachedFileMapForRepo: jest.fn(),
}));
jest.mock("@/foundation/rustledger", () => {
  const actual = jest.requireActual("@/foundation/rustledger");
  return { ...actual, parseLedgerFiles: jest.fn() };
});

import { parseLedgerFiles } from "@/foundation/rustledger";

const DIRECTIVES = [
  {
    type: "transaction",
    date: "2026-01-02",
    flag: "*",
    narration: "Cafe",
    tags: [],
    links: [],
    postings: [
      { account: "Expenses:Food", units: { number: "1", currency: "USD" } },
      { account: "Assets:Cash", units: { number: "-1", currency: "USD" } },
    ],
  },
] as DirectiveJson[];

function service() {
  return new LedgerJournalService(
    { getPublicApiClient: jest.fn() } as never,
    {} as never,
  );
}

function script(directives: DirectiveJson[]) {
  (loadCachedFileMapForRepo as jest.Mock).mockResolvedValue({
    files: { "main.bean": "" },
    entryPoint: "main.bean",
    repoPaths: ["main.bean"],
    managedPrices: [],
    managedPricePaths: [],
  });
  (parseLedgerFiles as jest.Mock).mockResolvedValue({
    directives,
    errors: [],
    options: { title: "Books", operating_currencies: ["USD"] },
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  script(DIRECTIVES);
});

// w23/111: is_empty used to read the whole ledger
// (snapshot.directives.length === 0), so a filter matching nothing on a
// non-empty ledger answered total 0 with is_empty false.
describe("getJournal is_empty", () => {
  it("is true when a filter matches zero rows on a non-empty ledger", async () => {
    const result = await service().getJournal({
      ledgerId: "alice/main",
      userId: undefined,
      query: { account: "NoSuch:Account", limit: 5 },
    });
    expect(result).toMatchObject({ total: 0, data: [], is_empty: true });
  });

  it("is false on an out-of-range page over matches elsewhere", async () => {
    const result = await service().getJournal({
      ledgerId: "alice/main",
      userId: undefined,
      query: { offset: 100, limit: 5 },
    });
    expect(result.total).toBeGreaterThan(0);
    expect(result.data).toEqual([]);
    expect(result.is_empty).toBe(false);
  });

  it("is true for a genuinely empty ledger", async () => {
    script([]);
    const result = await service().getJournal({
      ledgerId: "alice/main",
      userId: undefined,
      query: { limit: 5 },
    });
    expect(result).toMatchObject({ total: 0, data: [], is_empty: true });
  });

  it("is false for an unfiltered non-empty ledger", async () => {
    const result = await service().getJournal({
      ledgerId: "alice/main",
      userId: undefined,
      query: { limit: 5 },
    });
    expect(result.total).toBeGreaterThan(0);
    expect(result.is_empty).toBe(false);
  });
});
