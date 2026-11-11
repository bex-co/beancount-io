import { loadCachedFileMapForRepo } from "@/foundation/clients/load-cached-ledger-file-map";
import { commitLedgerFiles } from "@/features/ledger/operations/commit-ledger-files";
import {
  findEntrySliceAsync,
  findEntrySlicesAsync,
} from "@/foundation/rustledger/source-slice-worker";
import { indexDatedBlocks, sliceSha256 } from "@/foundation/rustledger";
import { LedgerJournalService } from "@/features/ledger/service/ledger-journal-service";

/**
 * w1/237. A 1,000-entry `deleteEntrySources` batch took 90 s, overran the
 * write deadline, committed, and told its caller to retry. Each entry was
 * located with its own full-ledger parse, and then the whole file was split
 * and hashed twice more per entry. Measured here by work, not by time: one
 * lookup for the batch, and file hashing that grows with the file, not with
 * the file times the batch.
 */
// Every SHA-256 the batch computes; node:crypto's own exports cannot be spied.
const mockHashes = { count: 0 };
jest.mock("node:crypto", () => {
  const actual = jest.requireActual("node:crypto");
  return {
    ...actual,
    createHash: (...args: Parameters<typeof actual.createHash>) => {
      mockHashes.count += 1;
      return actual.createHash(...args);
    },
  };
});
jest.mock("@/foundation/clients/load-cached-ledger-file-map", () => ({
  loadCachedFileMapForRepo: jest.fn(),
}));
jest.mock("@/features/ledger/operations/commit-ledger-files", () => {
  const actual = jest.requireActual(
    "@/features/ledger/operations/commit-ledger-files",
  );
  return { ...actual, commitLedgerFiles: jest.fn() };
});
jest.mock("@/foundation/rustledger", () => {
  const actual = jest.requireActual("@/foundation/rustledger");
  return {
    ...actual,
    parseLedgerFiles: jest.fn(async () => ({
      directives: [],
      errors: [],
      sourceDetails: {},
    })),
  };
});
jest.mock("@/foundation/rustledger/source-slice-worker", () => ({
  findEntrySliceAsync: jest.fn(),
  findEntrySlicesAsync: jest.fn(),
}));

const loadMock = loadCachedFileMapForRepo as jest.Mock;
const commitMock = commitLedgerFiles as jest.Mock;
const findMock = findEntrySlicesAsync as jest.Mock;

const N = 300;
const block = (i: number) =>
  [`2026-03-04 * "QA ${i}"`, "  Expenses:Food  1.00 USD", "  Assets:Cash"].join(
    "\n",
  );
const MAIN = [
  "2026-01-01 open Expenses:Food USD",
  "2026-01-01 open Assets:Cash USD",
  "",
  ...Array.from({ length: N }, (_, i) => `${block(i)}\n`),
].join("\n");
const SLICES = [...indexDatedBlocks("main.bean", MAIN).byStartLine.values()]
  // The two opens are dated blocks too; the batch targets the transactions.
  .filter((slice) => slice.slice.includes(" * "));

let files: Record<string, string>;
beforeEach(() => {
  jest.clearAllMocks();
  files = { "main.bean": MAIN };
  loadMock.mockImplementation(async () => ({
    files,
    entryPoint: "main.bean",
    repoPaths: ["main.bean"],
    managedPrices: [],
    managedPricePaths: [],
  }));
  // The single lookup answers too, so per-entry location still resolves and
  // only the work done is measured.
  (findEntrySliceAsync as jest.Mock).mockImplementation(
    async (_f: unknown, _e: unknown, hash: string) =>
      SLICES[Number(hash.slice(1))] ?? null,
  );
  findMock.mockImplementation(
    async (_f: unknown, _e: unknown, hashes: string[]) =>
      hashes.map((hash) => SLICES[Number(hash.slice(1))] ?? null),
  );
  commitMock.mockImplementation(
    async (
      _client: unknown,
      _owner: string,
      _repo: string,
      transforms: Map<string, (current: string | null) => Promise<string>>,
    ) => {
      for (const [path, apply] of transforms) {
        files[path] = await apply(files[path] ?? null);
      }
    },
  );
});

const service = () =>
  new LedgerJournalService(
    { getPublicApiClient: jest.fn() } as never,
    {} as never,
    undefined,
  );

const entries = SLICES.map((slice, i) => ({
  entryHash: `h${i}`,
  sha256sum: sliceSha256(slice.slice),
}));

it.each([true, false])(
  "locates a whole batch with one lookup and hashes the file a bounded number of times (dryRun %p)",
  async (dryRun) => {
    expect(SLICES).toHaveLength(N);
    mockHashes.count = 0;
    const result = await service().deleteMultiSourceSlices({
      ledgerId: "alice/main",
      userId: "user-1",
      entries,
      dryRun,
    });
    expect(result.deletedHashes).toHaveLength(N);
    expect(findMock).toHaveBeenCalledTimes(1);
    expect(findMock.mock.calls[0][2]).toHaveLength(N);
    // Per-entry scans hashed about 3·N·blocks times (270,000 here); one index
    // per file revision keeps it to a few passes over the file.
    expect(mockHashes.count).toBeLessThan(10 * (N + 2));
    if (!dryRun) expect(files["main.bean"]).not.toContain('"QA 0"');
    else expect(files["main.bean"]).toBe(MAIN);
  },
);

it("still refuses the whole batch when one entry's source changed", async () => {
  const stale = entries.map((entry, i) =>
    i === N - 1 ? { ...entry, sha256sum: "0".repeat(64) } : entry,
  );
  await expect(
    service().deleteMultiSourceSlices({
      ledgerId: "alice/main",
      userId: "user-1",
      entries: stale,
    }),
  ).rejects.toMatchObject({ category: "CONFLICT" });
  expect(files["main.bean"]).toBe(MAIN);
});

it("still refuses the whole batch when one entry is unknown", async () => {
  await expect(
    service().deleteMultiSourceSlices({
      ledgerId: "alice/main",
      userId: "user-1",
      entries: [...entries, { entryHash: "h-missing", sha256sum: "x" }],
    }),
  ).rejects.toMatchObject({ category: "NOT_FOUND" });
  expect(commitMock).not.toHaveBeenCalled();
});
