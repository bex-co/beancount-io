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
  rows: [[3]],
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

// w23/115: the engine silently ignores a quoted FROM name and runs in default
// postings scope, so the shell service unquotes valid-identifier FROM names
// first — routing quoted names through the same table path as unquoted ones.
describe("LedgerShellService quoted-FROM normalization", () => {
  beforeEach(() => {
    queryLedgerFilesResult.mockReset();
    queryLedgerFilesResult.mockResolvedValue(SUCCESS);
  });

  it("unquotes the FROM name in queryShell", async () => {
    await makeService().queryShell({
      ledgerId: "open_ledger/example",
      userId: undefined,
      query: 'SELECT count(*) FROM "entries" LIMIT 1',
    });
    expect(queryLedgerFilesResult).toHaveBeenCalledWith(
      expect.anything(),
      "main.beancount",
      "SELECT count(*) FROM  entries  LIMIT 1",
    );
  });

  it("unquotes the FROM name in queryShellText", async () => {
    await makeService().queryShellText({
      ledgerId: "open_ledger/example",
      userId: undefined,
      query: 'SELECT count(*) FROM "entries" LIMIT 1',
    });
    expect(queryLedgerFilesResult).toHaveBeenCalledWith(
      expect.anything(),
      "main.beancount",
      "SELECT count(*) FROM  entries  LIMIT 1",
    );
  });

  it("unquotes and neutralizes the terminator together", async () => {
    await makeService().queryShell({
      ledgerId: "open_ledger/example",
      userId: undefined,
      query: 'SELECT count(*) FROM "entries";',
    });
    expect(queryLedgerFilesResult).toHaveBeenCalledWith(
      expect.anything(),
      "main.beancount",
      "SELECT count(*) FROM  entries  ",
    );
  });
});
