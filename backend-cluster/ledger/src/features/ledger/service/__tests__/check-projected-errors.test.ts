import {
  loadCachedFileMapForRepo,
  overlayProjectedManagedPrices,
} from "@/foundation/clients/load-cached-ledger-file-map";
import { hashEntry, parseLedgerFiles } from "@/foundation/rustledger";
import { discoverDocuments } from "@/foundation/rustledger/document-discovery";
import { reconcileDocumentErrors } from "@/foundation/rustledger/document-validation";
import { LedgerDataService } from "@/features/ledger/service/ledger-data-service";

jest.mock("@/foundation/clients/load-cached-ledger-file-map", () => ({
  loadCachedFileMapForRepo: jest.fn(),
  overlayProjectedManagedPrices: jest.fn(),
}));

jest.mock("@/foundation/rustledger", () => {
  const actual = jest.requireActual("@/foundation/rustledger");
  return { ...actual, parseLedgerFiles: jest.fn() };
});

const loadMock = loadCachedFileMapForRepo as jest.Mock;
const overlayMock = overlayProjectedManagedPrices as jest.Mock;
const parseMock = parseLedgerFiles as jest.Mock;

const MAIN = [
  "2020-01-01 open Expenses:Food USD",
  "2020-01-01 open Assets:Cash USD",
  "",
].join("\n");

/** Repository blobs the projection may read, served at any ref. */
const repoGetContents = jest.fn();

function service() {
  const giteaClientFactory = {
    getPublicApiClient: jest.fn(async () => ({ repos: { repoGetContents } })),
  };
  return new LedgerDataService(giteaClientFactory as never, {} as never);
}

/** A committed repository whose `.bean` files the load read, and all its blobs. */
function committed(
  files: Record<string, string>,
  blobs: Record<string, string>,
) {
  loadMock.mockResolvedValue({
    files,
    entryPoint: "main.bean",
    repoPaths: Object.keys({ ...files, ...blobs }),
    managedPrices: [],
    managedPricePaths: [],
    ref: "c0ffee",
  });
  repoGetContents.mockImplementation(
    async (_owner: string, _repo: string, path: string) => {
      const text = blobs[decodeURIComponent(path)];
      if (text === undefined) throw { status: 404 };
      return { data: { encoding: "base64", content: b64(text) } };
    },
  );
}

beforeEach(() => {
  loadMock.mockReset();
  parseMock.mockReset();
  repoGetContents.mockReset();
  loadMock.mockResolvedValue({
    files: { "main.bean": MAIN },
    entryPoint: "main.bean",
    repoPaths: ["main.bean"],
    managedPrices: [],
    managedPricePaths: [],
  });
  parseMock.mockResolvedValue({ errors: [] });
  overlayMock.mockReset();
  overlayMock.mockImplementation(async (files) => files);
});

const b64 = (text: string) => Buffer.from(text, "utf8").toString("base64");

describe("checkProjectedErrors", () => {
  it("overlays updated contents onto the repo file map", async () => {
    const extra =
      "2026-09-01 *\n  Expenses:Food 1.00 USD\n  Assets:Cash -1.00 USD\n";
    await service().checkProjectedErrors({
      ledgerId: "alice/main",
      userId: "user-1",
      overlays: [{ path: "main.bean", content: b64(`${MAIN}\n${extra}`) }],
    });
    expect(parseMock).toHaveBeenCalledTimes(1);
    expect(parseMock.mock.calls[0]?.[0]).toEqual({
      "main.bean": `${MAIN}\n${extra}`,
    });
    expect(parseMock.mock.calls[0]?.[1]).toBe("main.bean");
  });

  it("projects a deletion by dropping the path", async () => {
    loadMock.mockResolvedValue({
      files: {
        "main.bean": `${MAIN}include "extra.bean"\n`,
        "extra.bean": "2020-01-01 open Assets:Other USD\n",
      },
      entryPoint: "main.bean",
      repoPaths: ["main.bean", "extra.bean"],
      managedPrices: [],
      managedPricePaths: [],
    });
    await service().checkProjectedErrors({
      ledgerId: "alice/main",
      userId: "user-1",
      overlays: [{ path: "extra.bean", content: null }],
    });
    expect(parseMock.mock.calls[0]?.[0]).toEqual({
      "main.bean": `${MAIN}include "extra.bean"\n`,
    });
  });

  // w31/022: the load fetched only the non-`.bean` files the committed
  // includes reach, so a write that added an include of another one was
  // refused "Included file not found" although the commit loads it.
  describe("a committed file the load never reached", () => {
    const LIST = 'include "y.bean"\n';
    const Y =
      "2026-08-30 *\n  Expenses:Food 1.00 USD\n  Assets:Cash -1.00 USD\n";
    const LDG =
      "2026-08-31 *\n  Expenses:Food 2.00 USD\n  Assets:Cash -2.00 USD\n";
    const include = (target: string) =>
      service().checkProjectedErrors({
        ledgerId: "alice/main",
        userId: "user-1",
        overlays: [
          { path: "main.bean", content: b64(`${MAIN}include "${target}"\n`) },
        ],
      });
    const projected = () => parseMock.mock.calls[0]?.[0];

    beforeEach(() =>
      committed(
        { "main.bean": MAIN, "qa/y.bean": Y },
        {
          "qa/list.txt": LIST,
          "qa/extra.ldg": LDG,
          "qa/more.ldg": LDG,
          "qa/notes.md": "# not included\n",
        },
      ),
    );

    it("is read from the load's commit when a write includes it", async () => {
      await include("qa/list.txt");
      expect(projected()).toEqual({
        "main.bean": `${MAIN}include "qa/list.txt"\n`,
        "qa/y.bean": Y,
        "qa/list.txt": LIST,
      });
      expect(repoGetContents).toHaveBeenCalledTimes(1);
      expect(repoGetContents).toHaveBeenCalledWith(
        "alice",
        "main",
        "qa/list.txt",
        { ref: "c0ffee" },
      );
    });

    it("is read for every match of a glob include", async () => {
      await include("qa/*.ldg");
      expect(Object.keys(projected())).toEqual([
        "main.bean",
        "qa/y.bean",
        "qa/extra.ldg",
        "qa/more.ldg",
      ]);
    });

    it("is read through the includes of a file it reaches", async () => {
      committed(
        { "main.bean": MAIN },
        { "a.txt": 'include "sub/b.dat"\n', "sub/b.dat": LDG },
      );
      await include("a.txt");
      expect(projected()).toMatchObject({ "sub/b.dat": LDG });
    });

    it("stays missing when the repository has no such file", async () => {
      await include("qa/nope.txt");
      await include("qa/*.dat");
      expect(repoGetContents).not.toHaveBeenCalled();
      expect(Object.keys(parseMock.mock.calls[1]?.[0])).toEqual([
        "main.bean",
        "qa/y.bean",
      ]);
    });

    it("stays deleted when the write deletes it", async () => {
      await service().checkProjectedErrors({
        ledgerId: "alice/main",
        userId: "user-1",
        overlays: [
          { path: "qa/list.txt", content: null },
          { path: "main.bean", content: b64(`${MAIN}include "qa/*.txt"\n`) },
        ],
      });
      expect(repoGetContents).not.toHaveBeenCalled();
      expect(projected()).not.toHaveProperty("qa/list.txt");
    });

    it("counts toward the loaded files projectedSourceFiles lists", async () => {
      const sources = await service().projectedSourceFiles({
        ledgerId: "alice/main",
        userId: "user-1",
        overlays: [
          {
            path: "main.bean",
            content: b64(`${MAIN}include "qa/list.txt"\n`),
          },
        ],
      });
      expect(sources).toEqual(["main.bean", "qa/list.txt", "qa/y.bean"]);
    });
  });

  // w31/027: the projection checked `document` paths, documents roots and
  // discovery against the committed tree, so a write that deleted or moved a
  // document file previewed clean and its commit reported the errors.
  describe("a document file the write deletes, moves or adds", () => {
    const STATEMENT = "docs/Assets/Cash/2026-09-01.statement.txt";
    const DOCUMENTS = `${MAIN}option "documents" "docs"\n2026-10-05 document Assets:Cash "ref.txt"\n`;
    const write = (path: string, text: string) => ({
      path,
      content: b64(text),
    });
    const remove = (path: string) => ({ path, content: null });
    const preview = async (
      overlays: { path: string; content: string | null }[],
    ) =>
      (
        await service().checkProjectedErrors({
          ledgerId: "alice/main",
          userId: "user-1",
          overlays,
        })
      ).map(
        (error) =>
          `${error.source?.filename}:${error.source?.lineno} ${error.code} ${error.message}`,
      );

    beforeEach(() => {
      committed(
        { "main.bean": DOCUMENTS },
        { [STATEMENT]: "statement\n", "ref.txt": "reference\n" },
      );
      // The engine's half of the document checks, run on the paths the parse
      // is given: it reports every `document` line E8001, which the service
      // keeps only for a file missing from them, and the service's discovery
      // reports a documents root with nothing under it.
      parseMock.mockImplementation(
        async (
          files: Record<string, string>,
          entryPoint: string,
          options: { repoPaths?: string[] },
        ) => {
          const source = files[entryPoint] ?? "";
          const named = [
            ...source.matchAll(/^\S+ document \S+ "([^"]+)"$/gmu),
          ].map((match) => ({
            message: `Document file not found: ${match[1]}`,
            code: "E8001",
            phase: "validate",
            hint: null,
            file: entryPoint,
            line: source.slice(0, match.index).split("\n").length,
            column: null,
            end_line: null,
            end_column: null,
            severity: "error" as const,
          }));
          const opened = [
            {
              type: "open" as const,
              date: "2020-01-01",
              account: "Assets:Cash",
              currencies: ["USD"],
            },
          ];
          return {
            errors: [
              ...discoverDocuments(
                opened,
                source,
                entryPoint,
                options.repoPaths,
              ).errors,
              ...reconcileDocumentErrors(named, options.repoPaths),
            ],
          };
        },
      );
    });

    it("previews the committed files clean", async () => {
      expect(await preview([write("main.bean", DOCUMENTS)])).toEqual([]);
    });

    it("reports the root a deletion empties", async () => {
      expect(await preview([remove(STATEMENT)])).toEqual([
        "main.bean:3 E7006 Document root 'docs' does not exist",
      ]);
    });

    it("reports the file a deletion removes from under a `document`", async () => {
      expect(await preview([remove("ref.txt")])).toEqual([
        "main.bean:4 E8001 Document file not found: ref.txt",
      ]);
    });

    it("reports both when a rename moves each file away", async () => {
      expect(
        await preview([
          write("moved/2026-09-01.statement.txt", "statement\n"),
          remove(STATEMENT),
          write("elsewhere/ref.txt", "reference\n"),
          remove("ref.txt"),
        ]),
      ).toEqual([
        "main.bean:3 E7006 Document root 'docs' does not exist",
        "main.bean:4 E8001 Document file not found: ref.txt",
      ]);
      expect(parseMock.mock.calls[0]?.[2].repoPaths).toEqual([
        "main.bean",
        "moved/2026-09-01.statement.txt",
        "elsewhere/ref.txt",
      ]);
    });

    it("lets the last change to a path in the write decide whether it exists", async () => {
      expect(
        await preview([remove("ref.txt"), write("ref.txt", "reference\n")]),
      ).toEqual([]);
      expect(
        await preview([write("ref.txt", "reference\n"), remove("ref.txt")]),
      ).toEqual(["main.bean:4 E8001 Document file not found: ref.txt"]);
    });

    it("finds the files a write adds with the root and the `document`", async () => {
      committed({ "main.bean": MAIN }, {});
      expect(
        await preview([
          write("main.bean", DOCUMENTS),
          write(STATEMENT, "statement\n"),
          write("ref.txt", "reference\n"),
        ]),
      ).toEqual([]);
      expect(await preview([write("main.bean", DOCUMENTS)])).toEqual([
        "main.bean:3 E7006 Document root 'docs' does not exist",
        "main.bean:4 E8001 Document file not found: ref.txt",
      ]);
    });
  });

  // w1/221: the load overlaid feeds for committed includes only, so a write
  // that added one previewed it as "managed price source is unavailable".
  it("resolves the managed includes of the projection, not of the commit", async () => {
    const VIRTUAL = "https:/beancount.io/prices/BTC-USD";
    loadMock.mockResolvedValue({
      files: {
        "main.bean": `${MAIN}include "https://beancount.io/prices/BTC-USD"\n`,
        [VIRTUAL]: "2026-09-15 price BTC 76000 USD\n",
      },
      entryPoint: "main.bean",
      repoPaths: ["main.bean"],
      managedPrices: [],
      managedPricePaths: [VIRTUAL],
    });
    const added = `${MAIN}include "https://beancount.io/prices/ETH-USD"\n`;
    const feeds = { [VIRTUAL.replace("BTC", "ETH")]: "eth feed\n" };
    overlayMock.mockImplementation(async (files) => ({ ...files, ...feeds }));
    await service().checkProjectedErrors({
      ledgerId: "alice/main",
      userId: "user-1",
      overlays: [{ path: "main.bean", content: b64(added) }],
    });
    // The committed feed is dropped before the overlay resolves the new one.
    expect(overlayMock).toHaveBeenCalledWith(
      { "main.bean": added },
      "main.bean",
      expect.anything(),
    );
    expect(parseMock.mock.calls[0]?.[0]).toEqual({
      "main.bean": added,
      ...feeds,
    });
  });

  it("resolves no feeds for a projection without the entry point", async () => {
    await service().checkProjectedErrors({
      ledgerId: "alice/main",
      userId: "user-1",
      overlays: [{ path: "main.bean", content: null }],
    });
    expect(overlayMock).not.toHaveBeenCalled();
  });

  // w23/031: the engine threw on the missing entry point, so a preview of
  // deleting main.bean answered SERVICE_UNAVAILABLE.
  it("reports a projection without the entry point as an error, not a throw", async () => {
    const errors = await service().checkProjectedErrors({
      ledgerId: "alice/main",
      userId: "user-1",
      overlays: [{ path: "main.bean", content: null }],
    });
    expect(errors).toEqual([
      expect.objectContaining({
        message: expect.stringContaining(
          "Entry point main.bean does not exist",
        ),
        severity: "error",
      }),
    ]);
    expect(parseMock).not.toHaveBeenCalled();
  });

  it("returns the mapped errors, code and engine hint included", async () => {
    // The code is what a consumer classifies on (w2/013) — dropping it here
    // is what forced backend-v2 to regex "does not balance" out of the prose.
    parseMock.mockResolvedValue({
      errors: [
        {
          message: "Transaction does not balance: residual 1.50 USD",
          code: "E3001",
          hint: "add the missing posting",
          file: "main.bean",
          line: 5,
        },
      ],
    });
    const errors = await service().checkProjectedErrors({
      ledgerId: "alice/main",
      userId: "user-1",
      overlays: [{ path: "main.bean", content: b64(MAIN) }],
    });
    expect(errors).toEqual([
      {
        message: "Transaction does not balance: residual 1.50 USD",
        code: "E3001",
        hint: "add the missing posting",
        severity: "error",
        source: { filename: "main.bean", lineno: 5 },
      },
    ]);
  });

  it("reports a null code for an error the engine did not code", async () => {
    parseMock.mockResolvedValue({
      errors: [{ message: "something else", file: "main.bean", line: 1 }],
    });
    const [error] = await service().checkProjectedErrors({
      ledgerId: "alice/main",
      userId: "user-1",
      overlays: [{ path: "main.bean", content: b64(MAIN) }],
    });
    expect(error.code).toBeNull();
    expect(error.hint).toBeNull();
  });

  it("refuses unsafe paths and oversized projections", async () => {
    await expect(
      service().checkProjectedErrors({
        ledgerId: "alice/main",
        userId: "user-1",
        overlays: [{ path: "../escape.bean", content: b64("x") }],
      }),
    ).rejects.toThrow();
    expect(parseMock).not.toHaveBeenCalled();
    // The byte cap bounds the parse; the file count is not capped (w23/206).
    await expect(
      service().checkProjectedErrors({
        ledgerId: "alice/main",
        userId: "user-1",
        overlays: [{ path: "big.bean", content: b64("x".repeat(5_000_001)) }],
      }),
    ).rejects.toThrow(/exceed/);
  });

  it("previews more than 50 files, as the commit accepts them", async () => {
    await expect(
      service().checkProjectedErrors({
        ledgerId: "alice/main",
        userId: "user-1",
        overlays: Array.from({ length: 120 }, (_, i) => ({
          path: `many/f${i}.bean`,
          content: b64("; x\n"),
        })),
      }),
    ).resolves.toEqual([]);
    expect(Object.keys(parseMock.mock.calls[0][0])).toHaveLength(121);
  });

  it("refuses to project onto a managed price feed's virtual file", async () => {
    const virtual = "https:/beancount.io/prices/BTC-USD";
    loadMock.mockResolvedValue({
      files: { "main.bean": MAIN, [virtual]: "2026-09-15 price BTC 1 USD\n" },
      entryPoint: "main.bean",
      repoPaths: ["main.bean"],
      managedPrices: [],
      managedPricePaths: [virtual],
    });
    await expect(
      service().checkProjectedErrors({
        ledgerId: "alice/main",
        userId: "user-1",
        overlays: [
          { path: virtual, content: b64("2026-09-15 price BTC 2 USD\n") },
        ],
      }),
    ).rejects.toThrow(
      `Operation 'edit managed price source' not allowed: ${virtual} is a managed price feed resolved from a URL include and is read-only`,
    );
    expect(parseMock).not.toHaveBeenCalled();
  });
});

// w23/048: a guided setup's files have no repository to project onto yet.
describe("checkLedgerFiles", () => {
  it("parses exactly the given files from main.bean", async () => {
    parseMock.mockResolvedValue({
      errors: [{ message: "Duplicate open", file: "main.bean", line: 4 }],
    });
    const errors = await service().checkLedgerFiles({
      files: [{ path: "main.bean", content: b64(MAIN) }],
    });
    expect(parseMock.mock.calls[0]?.[0]).toEqual({ "main.bean": MAIN });
    expect(parseMock.mock.calls[0]?.[1]).toBe("main.bean");
    expect(loadMock).not.toHaveBeenCalled();
    expect(errors).toEqual([
      expect.objectContaining({
        message: "Duplicate open",
        source: { filename: "main.bean", lineno: 4 },
      }),
    ]);
  });

  it.each([
    [[{ path: "other.bean", content: b64(MAIN) }], "entry point main.bean"],
    [[{ path: "../x.bean", content: b64(MAIN) }], "Invalid file path"],
    [[{ path: "main.bean", content: null }], "must carry text content"],
  ])("refuses %j", async (files, message) => {
    await expect(
      service().checkLedgerFiles({ files: files as never }),
    ).rejects.toMatchObject({
      category: "BAD_USER_INPUT",
      message: expect.stringContaining(message),
    });
    expect(parseMock).not.toHaveBeenCalled();
  });
});

// w23/060: a write locates the entries it committed in the projected ledger.
describe("projectedEntryIds", () => {
  const extra =
    '2026-09-01 * "lunch"\n  Expenses:Food 1.00 USD\n  Assets:Cash -1.00 USD\n';
  const lunch = {
    type: "transaction",
    date: "2026-09-01",
    flag: "*",
    narration: "lunch",
    tags: [],
    links: [],
    postings: [],
  };

  it("parses the projection with source details and resolves each range", async () => {
    parseMock.mockResolvedValue({
      errors: [],
      directives: [lunch],
      sourceDetails: {
        [hashEntry(lunch as never)]: { filename: "main.bean", lineno: 4 },
      },
    });
    const ids = await service().projectedEntryIds({
      ledgerId: "alice/main",
      userId: "user-1",
      overlays: [{ path: "main.bean", content: b64(`${MAIN}\n${extra}`) }],
      ranges: [
        { file: "main.bean", startLine: 3, lineCount: 3 },
        { file: "main.bean", startLine: 0, lineCount: 1 },
      ],
    });
    expect(parseMock.mock.calls[0]?.[0]).toEqual({
      "main.bean": `${MAIN}\n${extra}`,
    });
    expect(parseMock.mock.calls[0]?.[2]).toMatchObject({
      includeSourceDetails: true,
    });
    expect(ids).toEqual([hashEntry(lunch as never), null]);
  });

  it("answers nothing for a projection without its entry point", async () => {
    const ids = await service().projectedEntryIds({
      ledgerId: "alice/main",
      userId: "user-1",
      overlays: [{ path: "main.bean", content: null }],
      ranges: [{ file: "main.bean", startLine: 0, lineCount: 1 }],
    });
    expect(ids).toEqual([null]);
    expect(parseMock).not.toHaveBeenCalled();
  });
});

// w23/062: whether a file a write routes to would be loaded at all.
describe("projectedSourceFiles", () => {
  const withMain = (main: string) =>
    loadMock.mockResolvedValue({
      files: { "main.bean": main, "txns/2026.bean": "" },
      entryPoint: "main.bean",
      repoPaths: ["main.bean", "txns/2026.bean"],
      managedPrices: [],
      managedPricePaths: [],
    });
  const project = () =>
    service().projectedSourceFiles({
      ledgerId: "alice/main",
      userId: "user-1",
      overlays: [{ path: "txns/2027.bean", content: b64("") }],
    });

  it("leaves a new file out under per-year includes", async () => {
    withMain('include "txns/2026.bean"\n');
    expect(await project()).toEqual(["main.bean", "txns/2026.bean"]);
  });

  it("loads a new file a glob include covers", async () => {
    withMain('include "txns/*.bean"\n');
    expect(await project()).toEqual([
      "main.bean",
      "txns/2026.bean",
      "txns/2027.bean",
    ]);
  });

  it("loads a new file an include already names", async () => {
    withMain('include "txns/2026.bean"\ninclude "txns/2027.bean"\n');
    expect(await project()).toContain("txns/2027.bean");
  });
});
