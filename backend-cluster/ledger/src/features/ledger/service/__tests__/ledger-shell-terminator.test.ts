import type { QueryResult } from "@rustledger/wasm";
import { LedgerShellService } from "../ledger-shell-service";

const queryLedgerFilesResult = jest.fn();

jest.mock("@/foundation/rustledger", () => ({
  ...jest.requireActual("@/foundation/rustledger"),
  queryLedgerFilesResult: (...args: unknown[]) =>
    queryLedgerFilesResult(...args),
}));

jest.mock("@/foundation/clients/load-cached-ledger-file-map", () => ({
  loadCachedFileMapForRepo: jest.fn(async () => ({
    files: { "main.beancount": "" },
    entryPoint: "main.beancount",
  })),
}));

const SUCCESS: QueryResult = {
  columns: ["count(*)"],
  rows: [[2]],
  errors: [],
} as unknown as QueryResult;

function makeService() {
  const giteaClientFactory = { getPublicApiClient: jest.fn(async () => ({})) };
  const cacheHelper = {} as never;
  return new LedgerShellService(
    giteaClientFactory as never,
    cacheHelper,
  ) as {
    queryShell(p: {
      ledgerId: string;
      userId: undefined;
      query: string;
    }): Promise<unknown>;
    queryShellText(p: {
      ledgerId: string;
      userId: undefined;
      query: string;
    }): Promise<unknown>;
  };
}

// w23/109: the engine mis-resolves `FROM <table>;` (no further clause,
// `;`-terminated) as a column reference, so the shell service neutralizes a
// trailing terminator before the query reaches it — in both shell modes.
describe("LedgerShellService statement-terminator normalization", () => {
  beforeEach(() => {
    queryLedgerFilesResult.mockReset();
    queryLedgerFilesResult.mockResolvedValue(SUCCESS);
  });

  it("neutralizes the terminator in queryShell", async () => {
    await makeService().queryShell({
      ledgerId: "open_ledger/example",
      userId: undefined,
      query: "SELECT count(*) FROM postings;",
    });
    expect(queryLedgerFilesResult).toHaveBeenCalledWith(
      expect.anything(),
      "main.beancount",
      "SELECT count(*) FROM postings ",
    );
  });

  it("neutralizes the terminator in queryShellText", async () => {
    await makeService().queryShellText({
      ledgerId: "open_ledger/example",
      userId: undefined,
      query: "SELECT count(*) FROM postings;",
    });
    expect(queryLedgerFilesResult).toHaveBeenCalledWith(
      expect.anything(),
      "main.beancount",
      "SELECT count(*) FROM postings ",
    );
  });

  it("passes a terminator-less query through byte-for-byte", async () => {
    await makeService().queryShell({
      ledgerId: "open_ledger/example",
      userId: undefined,
      query: "SELECT count(*) FROM postings",
    });
    expect(queryLedgerFilesResult).toHaveBeenCalledWith(
      expect.anything(),
      "main.beancount",
      "SELECT count(*) FROM postings",
    );
  });

  // w23/151: a trailing `--` comment rides along — the engine sees the
  // terminator and the comment both neutralized — in both shell modes.
  it.each(["queryShell", "queryShellText"] as const)(
    "accepts a trailing comment after the terminator in %s",
    async (mode) => {
      await makeService()[mode]({
        ledgerId: "open_ledger/example",
        userId: undefined,
        query: "SELECT count(*) FROM postings; -- total",
      });
      expect(queryLedgerFilesResult).toHaveBeenCalledWith(
        expect.anything(),
        "main.beancount",
        `SELECT count(*) FROM postings${" ".repeat(10)}`,
      );
    },
  );

  // w23/151: a second statement past the terminator is NOT neutralized —
  // the engine sees the raw text and refuses it.
  it("passes a post-terminator second statement through raw", async () => {
    await makeService().queryShell({
      ledgerId: "open_ledger/example",
      userId: undefined,
      query: "SELECT count(*) FROM postings; SELECT 1",
    });
    expect(queryLedgerFilesResult).toHaveBeenCalledWith(
      expect.anything(),
      "main.beancount",
      "SELECT count(*) FROM postings; SELECT 1",
    );
  });
});
