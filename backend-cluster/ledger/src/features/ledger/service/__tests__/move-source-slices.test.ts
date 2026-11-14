import { loadCachedFileMapForRepo } from "@/foundation/clients/load-cached-ledger-file-map";
import { commitLedgerFiles } from "@/features/ledger/operations/commit-ledger-files";
import { findEntrySliceAsync } from "@/foundation/rustledger/source-slice-worker";
import { buildEntryIdMap, sliceSha256 } from "@/foundation/rustledger";
import { LedgerJournalService } from "@/features/ledger/service/ledger-journal-service";
import { NewLedgerErrorsError } from "@/shared/errors";
import type { DirectiveJson } from "@rustledger/wasm";

/**
 * w1/m45/t002 — moving entries into another file: the real service logic
 * (slice location, the batch delete's re-locating transform, the append, the
 * include line, the projection gate) over a stubbed parse, as the other
 * source-slice tests run it; the WASM engine cannot boot under jest.
 */
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
  return { ...actual, parseLedgerFiles: jest.fn() };
});
jest.mock("@/foundation/rustledger/source-slice-worker", () => {
  const findEntrySliceAsync = jest.fn();
  return {
    findEntrySliceAsync,
    findEntrySlicesAsync: (
      files: unknown,
      entryPoint: unknown,
      hashes: string[],
    ) =>
      Promise.all(
        hashes.map((hash) => findEntrySliceAsync(files, entryPoint, hash)),
      ),
  };
});

import { parseLedgerFiles } from "@/foundation/rustledger";

const loadMock = loadCachedFileMapForRepo as jest.Mock;
const commitMock = commitLedgerFiles as jest.Mock;
const parseMock = parseLedgerFiles as jest.Mock;
const findMock = findEntrySliceAsync as jest.Mock;

const txn = (day: string, narration: string) =>
  [
    `2026-08-${day} * "${narration}"`,
    "  Expenses:Food  4.00 USD",
    "  Assets:Cash",
  ].join("\n");
const TEA = txn("04", "Tea");
const CAKE = txn("09", "Cake");
const directive = (day: string, narration: string) =>
  ({
    type: "transaction",
    date: `2026-08-${day}`,
    flag: "*",
    narration,
    tags: [],
    links: [],
    postings: [
      { account: "Expenses:Food", units: { number: "4.00", currency: "USD" } },
      { account: "Assets:Cash" },
    ],
  }) as DirectiveJson;
const TEA_D = directive("04", "Tea");
const CAKE_D = directive("09", "Cake");
const IDS = buildEntryIdMap([TEA_D, CAKE_D]);
const TEA_ID = IDS.get(TEA_D)!;
const CAKE_ID = IDS.get(CAKE_D)!;

const MAIN = [
  "2026-01-01 open Expenses:Food USD",
  "2026-01-01 open Assets:Cash USD",
  'include "2026.bean"',
  "",
  CAKE,
  "",
  TEA,
  "",
].join("\n");

let files: Record<string, string>;
let sourceFiles: string[];
let breaking = false;

function service() {
  return new LedgerJournalService(
    { getPublicApiClient: jest.fn() } as never,
    {} as never,
    undefined,
  );
}

beforeEach(() => {
  files = { "main.bean": MAIN, "2026.bean": "; this year\n" };
  sourceFiles = ["main.bean", "2026.bean"];
  breaking = false;
  [loadMock, commitMock, parseMock, findMock].forEach((mock) =>
    mock.mockReset(),
  );
  loadMock.mockImplementation(async () => ({
    files,
    entryPoint: "main.bean",
    repoPaths: Object.keys(files),
    sourceFiles,
    managedPrices: [],
    managedPricePaths: [],
  }));
  commitMock.mockImplementation(
    async (
      _c: unknown,
      _o: string,
      _r: string,
      transforms: Map<string, (current: string | null) => string>,
    ) => {
      for (const [path, apply] of transforms)
        files[path] = await apply(files[path] ?? null);
      return { commit: "c0ffee" };
    },
  );
  findMock.mockImplementation(
    async (_f: unknown, _e: unknown, hash: string) => {
      const text = hash === TEA_ID ? TEA : hash === CAKE_ID ? CAKE : null;
      if (text === null) return null;
      const startLine = MAIN.split("\n").indexOf(text.split("\n")[0]);
      return {
        file: "main.bean",
        slice: text,
        sha256: sliceSha256(text),
        startLine,
        endLine: startLine + 3,
        localOccurrence: 0,
      };
    },
  );
  // The projection reports a new error only when `breaking` and the entries left main.bean.
  parseMock.mockImplementation(async (fileMap: Record<string, string>) => ({
    directives: [TEA_D, CAKE_D],
    errors:
      breaking && !String(fileMap["main.bean"]).includes("Tea")
        ? [
            {
              message: "Balance failed for 'Assets:Cash'",
              source: { filename: "main.bean", lineno: 1 },
            },
          ]
        : [],
    sourceDetails: {},
  }));
});

const move = (
  input: Partial<Parameters<LedgerJournalService["moveSourceSlices"]>[0]> = {},
) =>
  service().moveSourceSlices({
    ledgerId: "alice/main",
    userId: "user-1",
    entries: [
      { entryHash: TEA_ID, sha256sum: sliceSha256(TEA) },
      { entryHash: CAKE_ID, sha256sum: sliceSha256(CAKE) },
    ],
    toPath: "2026.bean",
    ...input,
  });

describe("moveSourceSlices (w1/m45)", () => {
  it("moves entries into an included file in one commit, in ledger order, byte for byte", async () => {
    const result = await move();
    expect(commitMock).toHaveBeenCalledTimes(1);
    expect(files["main.bean"]).not.toContain("Tea");
    expect(files["main.bean"]).not.toContain("Cake");
    expect(files["main.bean"]).toContain('include "2026.bean"');
    // Cake comes first in main.bean, so it comes first in the target.
    expect(files["2026.bean"]).toBe(`; this year\n\n${CAKE}\n\n${TEA}\n`);
    expect(result).toMatchObject({
      message: "Moved 2 entries to 2026.bean",
      movedHashes: [CAKE_ID, TEA_ID],
      includeAdded: false,
      commit: "c0ffee",
    });
    expect(result.files.sort()).toEqual(["2026.bean", "main.bean"]);
  });

  it("creates a new target and adds its include in the same commit", async () => {
    const result = await move({
      toPath: "2026/08.bean",
      includeFrom: "main.bean",
    });
    expect(commitMock).toHaveBeenCalledTimes(1);
    expect(files["2026/08.bean"]).toBe(`${CAKE}\n\n${TEA}\n`);
    expect(
      files["main.bean"].trimEnd().endsWith('include "2026/08.bean"'),
    ).toBe(true);
    expect(files["main.bean"]).not.toContain("Tea");
    expect(result.includeAdded).toBe(true);
    expect(result.message).toBe(
      "Moved 2 entries to 2026/08.bean; main.bean now includes it",
    );
  });

  it("writes the include relative to includeFrom's folder", async () => {
    files["2026.bean"] = "; this year\n";
    await move({ toPath: "2026/08.bean", includeFrom: "2026.bean" });
    expect(
      files["2026.bean"].trimEnd().endsWith('include "2026/08.bean"'),
    ).toBe(true);
    files = { "main.bean": MAIN, "years/2026.bean": "" };
    sourceFiles = ["main.bean", "years/2026.bean"];
    await move({ toPath: "years/08.bean", includeFrom: "years/2026.bean" });
    expect(files["years/2026.bean"].trimEnd()).toBe('include "08.bean"');
  });

  it("previews without committing", async () => {
    const result = await move({
      dryRun: true,
      toPath: "2026/08.bean",
      includeFrom: "main.bean",
    });
    expect(commitMock).not.toHaveBeenCalled();
    expect(files["main.bean"]).toBe(MAIN);
    expect(result.message).toBe(
      "Would move 2 entries to 2026/08.bean; main.bean would include it",
    );
    expect(result.preview).toEqual([
      { path: "main.bean", text: CAKE },
      { path: "main.bean", text: TEA },
    ]);
  });

  it("refuses an unreached target without includeFrom, naming the fix", async () => {
    await expect(move({ toPath: "2026/08.bean" })).rejects.toThrow(
      /pass includeFrom/,
    );
    await expect(
      move({ toPath: "2026/08.bean", includeFrom: "nowhere.bean" }),
    ).rejects.toThrow(/not a file the ledger loads/);
    expect(commitMock).not.toHaveBeenCalled();
  });

  it.each([
    [{ entries: [] }, /at least one entry/],
    [{ toPath: "notes.txt" }, /not a ledger file/],
    [{ toPath: "main.bean" }, /already lives in main.bean/],
  ])("refuses %j", async (input, message) => {
    await expect(move(input as never)).rejects.toThrow(message);
    expect(commitMock).not.toHaveBeenCalled();
  });

  it("refuses a stale checksum as a conflict", async () => {
    await expect(
      move({ entries: [{ entryHash: TEA_ID, sha256sum: "0".repeat(64) }] }),
    ).rejects.toMatchObject({ category: "CONFLICT" });
    expect(commitMock).not.toHaveBeenCalled();
  });

  it("refuses a move that adds a bean-check error unless allowInvalid", async () => {
    breaking = true;
    // The ledger's refusal; backend-v2 answers it as VALIDATION_FAILED.
    await expect(move()).rejects.toBeInstanceOf(NewLedgerErrorsError);
    await expect(move()).rejects.toThrow(/moving these entries/);
    expect(commitMock).not.toHaveBeenCalled();
    const forced = await move({ allowInvalid: true });
    expect(commitMock).toHaveBeenCalledTimes(1);
    expect(forced.validation.newErrors).toHaveLength(1);
  });
});
