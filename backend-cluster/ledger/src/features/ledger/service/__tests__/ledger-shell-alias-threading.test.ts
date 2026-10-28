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

const NULL_NUMBER: QueryResult = {
  columns: ["number"],
  rows: [[null], [null]],
  errors: [],
} as unknown as QueryResult;

function makeService() {
  const giteaClientFactory = { getPublicApiClient: jest.fn(async () => ({})) };
  const cacheHelper = {} as never;
  return new LedgerShellService(
    giteaClientFactory as never,
    cacheHelper,
  );
}

// w23/134: queryShell/queryShellText attribute dtypes with the query's own
// SELECT aliases, so an all-NULL alias reports `unknown` on both arms.
describe("LedgerShellService alias dtype attribution", () => {
  beforeEach(() => {
    queryLedgerFilesResult.mockReset();
    queryLedgerFilesResult.mockResolvedValue(NULL_NUMBER);
  });

  it("reports unknown for an aliased all-NULL column in queryShell", async () => {
    const response = await makeService().queryShell({
      ledgerId: "open_ledger/example",
      userId: undefined,
      query: "SELECT payee AS number FROM postings",
    });
    expect(response.table!.types).toEqual([
      { name: "number", dtype: "unknown" },
    ]);
  });

  it("drops the Decimal alignment for an aliased all-NULL column in queryShellText", async () => {
    const response = await makeService().queryShellText({
      ledgerId: "open_ledger/example",
      userId: undefined,
      query: "SELECT payee AS number FROM postings",
    });
    expect(response.text).toBe("n\n-\n \n \n");
  });

  it("keeps the name fallback for a bare column in queryShell", async () => {
    const response = await makeService().queryShell({
      ledgerId: "open_ledger/example",
      userId: undefined,
      query: "SELECT number FROM postings",
    });
    expect(response.table!.types).toEqual([
      { name: "number", dtype: "Decimal" },
    ]);
  });
});
