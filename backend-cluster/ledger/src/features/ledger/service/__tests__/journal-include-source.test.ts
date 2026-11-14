import { loadCachedFileMapForRepo } from "@/foundation/clients/load-cached-ledger-file-map";
import { findEntrySlicesAsync } from "@/foundation/rustledger/source-slice-worker";
import {
  LedgerJournalService,
  MAX_SOURCE_PAGE,
} from "@/features/ledger/service/ledger-journal-service";
import type { DirectiveJson } from "@rustledger/wasm";

/**
 * w1/m44 — `includeSource` attaches each page entry's source slice, resolved
 * in one batch; without it the journal is unchanged. Scripted parse, as the
 * other journal tests: the WASM engine cannot boot under jest.
 */
jest.mock("@/foundation/clients/load-cached-ledger-file-map", () => ({
  loadCachedFileMapForRepo: jest.fn(),
}));
jest.mock("@/foundation/rustledger", () => {
  const actual = jest.requireActual("@/foundation/rustledger");
  return { ...actual, parseLedgerFiles: jest.fn() };
});
jest.mock("@/foundation/rustledger/source-slice-worker", () => ({
  findEntrySliceAsync: jest.fn(),
  findEntrySlicesAsync: jest.fn(),
}));

import {
  markGeneratedDirective,
  parseLedgerFiles,
} from "@/foundation/rustledger";

const txn = (date: string, narration: string) =>
  ({
    type: "transaction",
    date,
    flag: "*",
    narration,
    tags: [],
    links: [],
    postings: [
      { account: "Expenses:Food", units: { number: "1", currency: "USD" } },
      { account: "Assets:Cash", units: { number: "-1", currency: "USD" } },
    ],
  }) as unknown as DirectiveJson;

const DIRECTIVES = [txn("2026-01-02", "Cafe"), txn("2026-01-03", "Bakery")];

function service() {
  return new LedgerJournalService(
    { getPublicApiClient: jest.fn() } as never,
    {} as never,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  (loadCachedFileMapForRepo as jest.Mock).mockResolvedValue({
    files: { "main.bean": "", "prices/managed.bean": "" },
    entryPoint: "main.bean",
    repoPaths: ["main.bean"],
    managedPrices: [
      {
        url: "https://beancount.io/prices/BTC-USD",
        includedFrom: [{ file: "main.bean", target: "prices/managed.bean" }],
      },
    ],
    managedPricePaths: ["prices/managed.bean"],
  });
  (parseLedgerFiles as jest.Mock).mockResolvedValue({
    directives: DIRECTIVES,
    errors: [],
    options: { title: "Books", operating_currencies: ["USD"] },
  });
});

const journal = (query: Record<string, unknown>) =>
  service().getJournal({ ledgerId: "alice/books", userId: undefined, query });

describe("getJournal includeSource (w1/m44)", () => {
  it("leaves the page unchanged, and reads no slice, without it", async () => {
    const result = await journal({});
    expect(result.data.every((item) => !("source" in item))).toBe(true);
    expect(findEntrySlicesAsync).not.toHaveBeenCalled();
  });

  it("attaches every page entry's slice from one batch lookup", async () => {
    (findEntrySlicesAsync as jest.Mock).mockImplementation(
      async (_files: unknown, _entryPoint: unknown, hashes: string[]) =>
        hashes.map((hash, index) => ({
          file: "main.bean",
          slice: `slice of ${hash}`,
          sha256: `sha-${hash}`,
          startLine: index * 4,
          endLine: index * 4 + 3,
          localOccurrence: 0,
        })),
    );
    const result = await journal({ includeSource: true });
    expect(findEntrySlicesAsync).toHaveBeenCalledTimes(1);
    const hashes = (findEntrySlicesAsync as jest.Mock).mock
      .calls[0][2] as string[];
    expect(hashes).toEqual(result.data.map((item) => item.entry_hash));
    expect(result.data.map((item) => item.source)).toEqual(
      hashes.map((hash, index) => ({
        path: "main.bean",
        lineno: index * 4 + 1,
        text: `slice of ${hash}`,
        sha256sum: `sha-${hash}`,
      })),
    );
  });

  it("gives null for an entry with no editable source: a copy or a managed price line", async () => {
    (findEntrySlicesAsync as jest.Mock).mockImplementation(async () => [
      null,
      {
        file: "prices/managed.bean",
        slice: "2026-01-03 price BTC 1 USD",
        sha256: "sha-p",
        startLine: 0,
        endLine: 1,
        localOccurrence: 0,
      },
    ]);
    const result = await journal({ includeSource: true });
    expect(result.data.map((item) => item.source)).toEqual([null, null]);
  });

  it("never looks up a plugin's or a pad's copy: its source is null", async () => {
    const copy = txn("2026-01-04", "Insurance (2/12)");
    markGeneratedDirective(copy);
    (parseLedgerFiles as jest.Mock).mockResolvedValue({
      directives: [...DIRECTIVES, copy],
      errors: [],
      options: { title: "Books", operating_currencies: ["USD"] },
    });
    (findEntrySlicesAsync as jest.Mock).mockImplementation(
      async (_files: unknown, _entryPoint: unknown, hashes: string[]) =>
        hashes.map((hash) => ({
          file: "main.bean",
          slice: hash,
          sha256: `sha-${hash}`,
          startLine: 0,
          endLine: 1,
          localOccurrence: 0,
        })),
    );
    const result = await journal({ includeSource: true });
    const asked = (findEntrySlicesAsync as jest.Mock).mock
      .calls[0][2] as string[];
    expect(asked).toHaveLength(2);
    expect(result.data.map((item) => item.source === null)).toEqual([
      true,
      false,
      false,
    ]);
    // Its file map is the snapshot's own: loaded once for the whole read.
    expect(loadCachedFileMapForRepo).toHaveBeenCalledTimes(1);
  });

  it("refuses a page larger than the source cap before reading the ledger", async () => {
    await expect(
      journal({ includeSource: true, limit: MAX_SOURCE_PAGE + 1 }),
    ).rejects.toThrow(`at most ${MAX_SOURCE_PAGE} entries per page`);
    expect(parseLedgerFiles).not.toHaveBeenCalled();
    await expect(
      journal({ limit: MAX_SOURCE_PAGE + 1 }),
    ).resolves.toBeDefined();
  });

  it("reads no slice for an empty page", async () => {
    const result = await journal({ includeSource: true, offset: 10 });
    expect(result.data).toEqual([]);
    expect(findEntrySlicesAsync).not.toHaveBeenCalled();
  });
});
