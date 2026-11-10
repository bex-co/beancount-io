import { loadCachedFileMapForRepo } from "@/foundation/clients/load-cached-ledger-file-map";
import { LedgerJournalService } from "@/features/ledger/service/ledger-journal-service";
import type { DirectiveJson } from "@rustledger/wasm";

// The WASM engine cannot boot under jest: the parse is scripted, and what is
// under test is the export's paging over the parsed directives.
jest.mock("@/foundation/clients/load-cached-ledger-file-map", () => ({
  loadCachedFileMapForRepo: jest.fn(),
}));
jest.mock("@/foundation/rustledger", () => {
  const actual = jest.requireActual("@/foundation/rustledger");
  return { ...actual, parseLedgerFiles: jest.fn() };
});

import { parseLedgerFiles } from "@/foundation/rustledger";

const txn = (day: number) =>
  ({
    type: "transaction",
    date: `2026-01-${String(day).padStart(2, "0")}`,
    flag: "*",
    narration: `Cafe ${day}`,
    tags: [],
    links: [],
    postings: [
      { account: "Expenses:Food", units: { number: "1", currency: "USD" } },
      { account: "Assets:Cash" },
    ],
  }) as DirectiveJson;
const DIRECTIVES = [1, 2, 3, 4, 5].map(txn);

beforeEach(() => {
  (loadCachedFileMapForRepo as jest.Mock).mockResolvedValue({
    files: { "main.bean": "" },
    entryPoint: "main.bean",
    repoPaths: ["main.bean"],
    managedPrices: [],
    managedPricePaths: [],
  });
  (parseLedgerFiles as jest.Mock).mockResolvedValue({
    directives: DIRECTIVES,
    errors: [],
    options: { title: "Books", operating_currencies: ["USD"] },
  });
});

const read = (query?: { limit?: number; offset?: number }) =>
  new LedgerJournalService(
    { getPublicApiClient: jest.fn() } as never,
    {} as never,
  ).plaintextJournal({ ledgerId: "alice/main", userId: undefined, query });
const narrations = (content: string) =>
  [...content.matchAll(/"(Cafe \d)"/g)].map((match) => match[1]);

// w23/044: one read returned the whole ledger's text, unbounded.
describe("plaintextJournal paging", () => {
  it("returns every entry when no page is asked for", async () => {
    const result = await read();
    expect(narrations(result.content)).toHaveLength(5);
    expect(result).toMatchObject({ total: 5, truncated: false });
  });

  it("walks the export in pages without gaps or overlaps", async () => {
    const pages = await Promise.all(
      [0, 2, 4].map((offset) => read({ limit: 2, offset })),
    );
    expect(pages.map((page) => narrations(page.content))).toEqual([
      ["Cafe 1", "Cafe 2"],
      ["Cafe 3", "Cafe 4"],
      ["Cafe 5"],
    ]);
    expect(pages.map(({ total, truncated }) => ({ total, truncated }))).toEqual(
      [
        { total: 5, truncated: true },
        { total: 5, truncated: true },
        { total: 5, truncated: false },
      ],
    );
    // Each page keeps the option header, so it parses on its own (its
    // assertions and lot reductions need the pages before it, w1/232).
    for (const page of pages)
      expect(page.content).toContain('option "operating_currency" "USD"');
  });

  it.each([
    [{ limit: 0 }, "limit must be a positive integer"],
    [{ offset: -1 }, "offset must be a non-negative integer"],
  ])("refuses %p", async (query, message) => {
    await expect(read(query)).rejects.toMatchObject({
      category: "BAD_USER_INPUT",
      message,
    });
  });
});
