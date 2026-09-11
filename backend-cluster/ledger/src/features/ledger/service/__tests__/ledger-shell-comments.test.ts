import type { QueryResult } from "@rustledger/wasm";
import { LedgerShellService } from "../ledger-shell-service";

const queryLedgerFilesResult = jest.fn();

jest.mock("@/foundation/rustledger", () => ({
  // Only the engine call is stubbed; the mappers' real helpers must stay real
  // so this exercises the actual queryShell/queryShellText response paths.
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
  columns: ["account"],
  rows: [["Assets:US:BofA"]],
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

const COMMENTED = "/* qa comment */ SELECT account FROM accounts";
const PLAIN = "                 SELECT account FROM accounts";

describe("LedgerShellService block-comment normalization", () => {
  beforeEach(() => {
    queryLedgerFilesResult.mockReset();
    queryLedgerFilesResult.mockResolvedValue(SUCCESS);
  });

  // Both shell modes reach the same engine, so both must normalize — the
  // dashboard uses the structured mode and REST `text/plain` uses the text one.
  it("normalizes the query in queryShell", async () => {
    await makeService().queryShell({
      ledgerId: "open_ledger/example",
      userId: undefined,
      query: COMMENTED,
    });
    expect(queryLedgerFilesResult).toHaveBeenCalledWith(
      expect.anything(),
      "main.beancount",
      PLAIN,
    );
  });

  it("normalizes the query in queryShellText", async () => {
    await makeService().queryShellText({
      ledgerId: "open_ledger/example",
      userId: undefined,
      query: COMMENTED,
    });
    expect(queryLedgerFilesResult).toHaveBeenCalledWith(
      expect.anything(),
      "main.beancount",
      PLAIN,
    );
  });

  it("passes an uncommented query through untouched", async () => {
    const query = "SELECT account FROM accounts";
    await makeService().queryShell({
      ledgerId: "open_ledger/example",
      userId: undefined,
      query,
    });
    expect(queryLedgerFilesResult).toHaveBeenCalledWith(
      expect.anything(),
      "main.beancount",
      query,
    );
  });

  it("still rejects a query the engine reports as invalid", async () => {
    queryLedgerFilesResult.mockResolvedValue({
      columns: [],
      rows: [],
      errors: [{ severity: "error", message: "syntax error" }],
    } as unknown as QueryResult);

    await expect(
      makeService().queryShell({
        ledgerId: "open_ledger/example",
        userId: undefined,
        query: "/* c */ SELEKT account",
      }),
    ).rejects.toThrow();
  });
});
