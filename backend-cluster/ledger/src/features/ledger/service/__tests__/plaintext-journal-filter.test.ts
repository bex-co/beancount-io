import { loadCachedFileMapForRepo } from "@/foundation/clients/load-cached-ledger-file-map";
import { LedgerJournalService } from "@/features/ledger/service/ledger-journal-service";
import { BadUserInputError } from "@/shared/errors";
import type { DirectiveJson } from "@rustledger/wasm";

// Same scripted-parse harness as the paging tests: the WASM engine cannot
// boot under jest, but the service's filter path — including the worker pool
// the async evaluator dispatches to — runs for real.
jest.mock("@/foundation/clients/load-cached-ledger-file-map", () => ({
  loadCachedFileMapForRepo: jest.fn(),
}));
jest.mock("@/foundation/rustledger", () => {
  const actual = jest.requireActual("@/foundation/rustledger");
  return { ...actual, parseLedgerFiles: jest.fn() };
});

import { parseLedgerFiles } from "@/foundation/rustledger";

const tagged = {
  type: "transaction",
  date: "2026-01-02",
  flag: "*",
  narration: "Cafe 1",
  tags: ["trip"],
  links: ["receipt"],
  postings: [
    { account: "Expenses:Food", units: { number: "1", currency: "USD" } },
    { account: "Assets:Cash", units: { number: "-1", currency: "USD" } },
  ],
} as DirectiveJson;
const plain = {
  ...tagged,
  narration: "Cafe 2",
  tags: [],
  links: [],
  postings: [
    { account: "Expenses:Books", units: { number: "2", currency: "USD" } },
    { account: "Assets:Cash", units: { number: "-2", currency: "USD" } },
  ],
} as DirectiveJson;
const DIRECTIVES = [tagged, plain];

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

const read = (filter?: string) =>
  new LedgerJournalService(
    { getPublicApiClient: jest.fn() } as never,
    {} as never,
  ).plaintextJournal({
    ledgerId: "alice/main",
    userId: undefined,
    query: { filter } as never,
  });

// w23/m2/t007: the milestone's filter forms end to end through the journal
// service every surface shares — matching, not just parsing.
describe("plaintextJournal filter", () => {
  it.each([
    ["tag:trip", 1],
    ["link:receipt", 1],
    ["tag:missing", 0],
    // account: scans posting accounts, not just directive accounts.
    ["account:Cash", 2],
    ["account:Food", 1],
    ['account:"Assets:Cash"', 2],
    // Bare words still match narration.
    ["Cafe", 2],
  ])("filter %p selects %i entries", async (filter, total) => {
    const result = await read(filter as string);
    expect(result.total).toBe(total);
  });

  // The documented refusals surface as BadUserInputError (a 400 on every
  // surface), carrying the hint — never a silent empty page.
  it.each([
    ["account:Assets:Bank:Checking", /quote/],
    ["tag:#trip", /tag:trip/],
    ["date:2026", /date:"2026"/],
  ])("filter %p refuses with a hint", async (filter, hint) => {
    await expect(read(filter as string)).rejects.toThrow(BadUserInputError);
    await expect(read(filter as string)).rejects.toThrow(hint as RegExp);
  });
});
