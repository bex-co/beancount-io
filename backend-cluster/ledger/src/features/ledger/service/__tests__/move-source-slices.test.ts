import { loadCachedFileMapForRepo } from "@/foundation/clients/load-cached-ledger-file-map";
import { commitLedgerFiles } from "@/features/ledger/operations/commit-ledger-files";
import { findEntrySliceAsync } from "@/foundation/rustledger/source-slice-worker";
import {
  buildEntryIdMap,
  sliceSha256,
  splitIntoBlocks,
} from "@/foundation/rustledger";
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

  it("appends in the target's own line ending, and places the include after the last one (w1/m45/t007)", async () => {
    files["2026.bean"] = "; this year\r\n; second line\r\n";
    await move();
    expect(files["2026.bean"]).toBe(
      `; this year\r\n; second line\r\n\r\n${CAKE.replace(/\n/g, "\r\n")}\r\n\r\n${TEA.replace(/\n/g, "\r\n")}\r\n`,
    );
    files = { "main.bean": `${MAIN}; footer\n`, "2026.bean": "" };
    await move({ toPath: "2026/09.bean", includeFrom: "main.bean" });
    const lines = files["main.bean"].split("\n");
    // Beside main.bean's other include, not after its footer.
    expect(lines[lines.indexOf('include "2026.bean"') + 1]).toBe(
      'include "2026/09.bean"',
    );
    expect(lines.at(-2)).toBe("; footer");
  });

  it("refuses a new target name that is not portable, as file creation does", async () => {
    await expect(
      move({ toPath: 'a "b".bean', includeFrom: "main.bean" }),
    ).rejects.toThrow(/Windows cannot store/);
    expect(commitMock).not.toHaveBeenCalled();
  });

  // w31/093: a bracketed path is portable on disk, but writing `include` for
  // it expands as a glob on load.
  it.each([false, true])(
    "refuses adding an include for a bracketed toPath (dryRun=%s)",
    async (dryRun) => {
      await expect(
        move({ toPath: "books/q[1].bean", includeFrom: "main.bean", dryRun }),
      ).rejects.toMatchObject({
        category: "BAD_USER_INPUT",
        message: expect.stringMatching(/toPath.*glob metacharacter/),
      });
      // Even when the relative target omits the bracketed folder, the resolved
      // path still contains `[` and is treated as a glob by the loader.
      files["dir[1]/index.bean"] = "";
      sourceFiles = ["main.bean", "2026.bean", "dir[1]/index.bean"];
      await expect(
        move({
          toPath: "dir[1]/target.bean",
          includeFrom: "dir[1]/index.bean",
          dryRun,
        }),
      ).rejects.toMatchObject({
        category: "BAD_USER_INPUT",
        message: expect.stringMatching(/toPath.*glob metacharacter/),
      });
      expect(commitMock).not.toHaveBeenCalled();
    },
  );

  it("still allows moving into a bracketed file already loaded by the ledger", async () => {
    files["books/q[1].bean"] = "; loaded by glob\n";
    sourceFiles = ["main.bean", "2026.bean", "books/q[1].bean"];
    const result = await move({ toPath: "books/q[1].bean" });
    expect(result.includeAdded).toBe(false);
    expect(commitMock).toHaveBeenCalledTimes(1);
    expect(files["books/q[1].bean"]).toContain("Tea");
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

  // w31/097: adding an include for a new move target must not splice inside a multiline string.
  it("inserts includeFrom outside a multiline narration containing an include line", async () => {
    const multilineEntry = [
      '2026-08-30 * "Landlord" "Monthly rent',
      "include qa-sub.bean",
      'end of memo"',
      "  Expenses:Food  1.00 USD",
      "  Assets:Cash",
    ].join("\n");
    const mainWithMultiline = [
      "2026-01-01 open Expenses:Food USD",
      "2026-01-01 open Assets:Cash USD",
      "",
      TEA,
      "",
      multilineEntry,
      "",
    ].join("\n");
    files = { "main.bean": mainWithMultiline };
    sourceFiles = ["main.bean"];
    findMock.mockImplementation(async () => {
      const startLine = mainWithMultiline
        .split("\n")
        .indexOf(TEA.split("\n")[0]);
      return {
        file: "main.bean",
        slice: TEA,
        sha256: sliceSha256(TEA),
        startLine,
        endLine: startLine + 3,
        localOccurrence: 0,
      };
    });

    const result = await move({
      entries: [{ entryHash: TEA_ID, sha256sum: sliceSha256(TEA) }],
      toPath: "qa-moved.bean",
      includeFrom: "main.bean",
    });
    expect(result.includeAdded).toBe(true);
    expect(files["main.bean"]).toContain(multilineEntry);
    expect(
      files["main.bean"].trimEnd().endsWith('include "qa-moved.bean"'),
    ).toBe(true);
  });
});

// w31/016: Beancount applies pushtag/pushmeta by position within their own
// file, so an entry moved out of a scope as bare text lost the scope's tag or
// metadata, and the hash reported for a tagged one no longer existed.
describe("moveSourceSlices out of a pushtag/pushmeta scope (w31/016)", () => {
  const PAYEE_A = [
    '2026-09-02 * "PAYEE-A" "tagged by the scope"',
    "  Expenses:Food:Coffee   3.00 USD",
    "  Assets:Cash",
  ].join("\n");
  const PAYEE_B = [
    '2026-09-03 * "PAYEE-B" "inline tag" #qa-r7-inline',
    "  Expenses:Food:Coffee   4.00 USD",
    "  Assets:Cash",
  ].join("\n");
  const PAYEE_C = [
    '2026-09-04 * "PAYEE-C" "meta from the scope"',
    "  Expenses:Food:Coffee   5.00 USD",
    "  Assets:Cash",
  ].join("\n");
  const FIXTURE = [
    "2026-01-01 open Expenses:Food:Coffee USD",
    "2026-01-01 open Assets:Cash USD",
    "",
    "pushtag #qa-r7-trip",
    PAYEE_A,
    "poptag #qa-r7-trip",
    "",
    PAYEE_B,
    "",
    'pushmeta qa-r7-meta: "pm"',
    PAYEE_C,
    "popmeta qa-r7-meta:",
    "",
  ].join("\n");
  const scoped = (day: string, payee: string, tags: string[], units: string) =>
    ({
      type: "transaction",
      date: `2026-09-${day}`,
      flag: "*",
      payee,
      narration: "n",
      tags,
      links: [],
      postings: [
        {
          account: "Expenses:Food:Coffee",
          units: { number: units, currency: "USD" },
        },
        { account: "Assets:Cash" },
      ],
    }) as DirectiveJson;
  const A_D = scoped("02", "PAYEE-A", ["qa-r7-trip"], "3.00");
  const B_D = scoped("03", "PAYEE-B", ["qa-r7-inline"], "4.00");
  const C_D = scoped("04", "PAYEE-C", [], "5.00");
  const ids = buildEntryIdMap([A_D, B_D, C_D]);
  const TEXT = new Map([
    [ids.get(A_D)!, PAYEE_A],
    [ids.get(B_D)!, PAYEE_B],
    [ids.get(C_D)!, PAYEE_C],
  ]);
  const entry = (directive: DirectiveJson, text: string) => ({
    entryHash: ids.get(directive)!,
    sha256sum: sliceSha256(text),
  });

  beforeEach(() => {
    files = { "main.bean": FIXTURE };
    sourceFiles = ["main.bean"];
    findMock.mockImplementation(
      async (fileMap: Record<string, string>, _e: unknown, hash: string) => {
        const text = TEXT.get(hash);
        const block = splitIntoBlocks(fileMap["main.bean"]).find(
          (candidate) => candidate.text === text,
        );
        if (!block) return null;
        return {
          file: "main.bean",
          slice: block.text,
          sha256: sliceSha256(block.text),
          startLine: block.startLine,
          endLine: block.endLine,
          localOccurrence: 0,
        };
      },
    );
    parseMock.mockImplementation(async () => ({
      directives: [A_D, B_D, C_D],
      errors: [],
      sourceDetails: {},
    }));
  });

  const moveScoped = (dryRun: boolean) =>
    service().moveSourceSlices({
      ledgerId: "alice/main",
      userId: "user-1",
      entries: [entry(A_D, PAYEE_A), entry(C_D, PAYEE_C), entry(B_D, PAYEE_B)],
      toPath: "qa-moved.bean",
      includeFrom: "main.bean",
      dryRun,
    });

  const TAGGED_A = [
    '2026-09-02 * "PAYEE-A" "tagged by the scope" #qa-r7-trip',
    "  Expenses:Food:Coffee   3.00 USD",
    "  Assets:Cash",
  ].join("\n");
  const META_C = [
    '2026-09-04 * "PAYEE-C" "meta from the scope"',
    '  qa-r7-meta: "pm"',
    "  Expenses:Food:Coffee   5.00 USD",
    "  Assets:Cash",
  ].join("\n");

  it("previews each scoped entry with its scope's tag or metadata written on, and an unscoped one byte for byte", async () => {
    const result = await moveScoped(true);
    expect(commitMock).not.toHaveBeenCalled();
    expect(result.preview).toEqual([
      { path: "main.bean", text: TAGGED_A },
      { path: "main.bean", text: PAYEE_B },
      { path: "main.bean", text: META_C },
    ]);
  });

  it("commits the text the preview showed, and reports the hashes the moved entries keep", async () => {
    const result = await moveScoped(false);
    expect(commitMock).toHaveBeenCalledTimes(1);
    expect(files["qa-moved.bean"]).toBe(
      `${TAGGED_A}\n\n${PAYEE_B}\n\n${META_C}\n`,
    );
    // The scopes stay behind, now around nothing.
    expect(files["main.bean"]).not.toContain("PAYEE-");
    expect(files["main.bean"]).toContain("pushtag #qa-r7-trip");
    expect(
      files["main.bean"].trimEnd().endsWith('include "qa-moved.bean"'),
    ).toBe(true);
    // A pushed tag is part of an entry's hash and pushed metadata is not, so
    // with both written on, each moved entry keeps the hash it had.
    expect(result.movedHashes).toEqual([
      ids.get(A_D),
      ids.get(B_D),
      ids.get(C_D),
    ]);
  });
});

// w31/116: a move cuts entries out of their file and can add an include line
// to `includeFrom`; both move every line below them. A preview and a refusal
// name the new error where the reader finds it in the file as it stands, and
// a forced move names the line it has afterwards.
describe("where a move's new errors are reported (w31/116)", () => {
  const BALANCE = "2026-09-01 balance Assets:Cash -8.00 USD";

  beforeEach(() => {
    // Located in the file as it stands, wherever the fixture put them.
    findMock.mockImplementation(
      async (fileMap: Record<string, string>, _e: unknown, hash: string) => {
        const text = hash === TEA_ID ? TEA : hash === CAKE_ID ? CAKE : null;
        if (text === null) return null;
        const startLine = fileMap["main.bean"]
          .split("\n")
          .indexOf(text.split("\n")[0]);
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
    // Moving Tea out of main.bean breaks the assertion, wherever it sits.
    parseMock.mockImplementation(async (fileMap: Record<string, string>) => {
      const main = String(fileMap["main.bean"]);
      return {
        directives: [TEA_D, CAKE_D],
        errors: main.includes("Tea")
          ? []
          : [
              {
                message: "Balance failed for Assets:Cash",
                file: "main.bean",
                line: main.split("\n").indexOf(BALANCE) + 1,
              },
            ],
        sourceDetails: {},
      };
    });
  });

  const opens = MAIN.split("\n").slice(0, 3);
  const at = (content: string) =>
    `main.bean:${content.split("\n").indexOf(BALANCE) + 1}`;
  const refusedAt = async (refused: Promise<unknown>) => {
    const error = await refused.then(
      () => undefined,
      (reason: unknown) => reason,
    );
    expect(error).toBeInstanceOf(NewLedgerErrorsError);
    return (error as Error).message.match(/main\.bean:\d+/g);
  };
  const reportedAt = (result: Awaited<ReturnType<typeof move>>) =>
    result.validation.newErrors.map(
      ({ source }) => source && `${source.filename}:${source.lineno}`,
    );

  it.each([
    [
      "an include line goes in above it",
      [...opens, "", BALANCE, "", CAKE, "", TEA, ""],
      [{ entryHash: TEA_ID, sha256sum: sliceSha256(TEA) }],
    ],
    [
      "entries leave above it and an include line goes in",
      [...opens, "", CAKE, "", TEA, "", BALANCE, ""],
      [
        { entryHash: TEA_ID, sha256sum: sliceSha256(TEA) },
        { entryHash: CAKE_ID, sha256sum: sliceSha256(CAKE) },
      ],
    ],
  ])("names the current line when %s", async (_name, lines, entries) => {
    files["main.bean"] = lines.join("\n");
    const before = files["main.bean"];
    const input = { entries, toPath: "2026/08.bean", includeFrom: "main.bean" };

    expect(await refusedAt(move(input))).toEqual([at(before)]);
    // backend-v2 sends every preview with allowInvalid (w23/m7/t008).
    const preview = await move({ ...input, allowInvalid: true, dryRun: true });
    expect(reportedAt(preview)).toEqual([at(before)]);
    expect(commitMock).not.toHaveBeenCalled();

    const forced = await move({ ...input, allowInvalid: true });
    expect(at(files["main.bean"])).not.toBe(at(before));
    expect(reportedAt(forced)).toEqual([at(files["main.bean"])]);
  });
});
