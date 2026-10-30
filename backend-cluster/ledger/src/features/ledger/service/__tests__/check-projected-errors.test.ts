import { loadCachedFileMapForRepo } from "@/foundation/clients/load-cached-ledger-file-map";
import { hashEntry, parseLedgerFiles } from "@/foundation/rustledger";
import { LedgerDataService } from "@/features/ledger/service/ledger-data-service";

jest.mock("@/foundation/clients/load-cached-ledger-file-map", () => ({
  loadCachedFileMapForRepo: jest.fn(),
}));

jest.mock("@/foundation/rustledger", () => {
  const actual = jest.requireActual("@/foundation/rustledger");
  return { ...actual, parseLedgerFiles: jest.fn() };
});

const loadMock = loadCachedFileMapForRepo as jest.Mock;
const parseMock = parseLedgerFiles as jest.Mock;

const MAIN = [
  "2020-01-01 open Expenses:Food USD",
  "2020-01-01 open Assets:Cash USD",
  "",
].join("\n");

function service() {
  const giteaClientFactory = { getPublicApiClient: jest.fn() };
  return new LedgerDataService(giteaClientFactory as never, {} as never);
}

beforeEach(() => {
  loadMock.mockReset();
  parseMock.mockReset();
  loadMock.mockResolvedValue({
    files: { "main.bean": MAIN },
    entryPoint: "main.bean",
    repoPaths: ["main.bean"],
    managedPrices: [],
    managedPricePaths: [],
  });
  parseMock.mockResolvedValue({ errors: [] });
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
