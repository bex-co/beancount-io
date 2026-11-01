import type { QueryResult } from "@rustledger/wasm";
import { loadCachedFileMapForRepo } from "@/foundation/clients/load-cached-ledger-file-map";
import { BadUserInputError } from "@/shared/errors";
import { LedgerShellService } from "../ledger-shell-service";

/**
 * w23/196. The engine leaves `balances.discrepancy` NULL, so the shell adds the
 * assertion's key columns to a plain projection, fills the cell from the
 * validator's difference and drops the keys again. The engine and the parse
 * are stubbed with the shapes rustledger 0.24.0 returns; the validator
 * message format is the one `failedBalanceDiffs` reads.
 */
const queryMock = jest.fn();
const parseMock = jest.fn();
jest.mock("@/foundation/rustledger", () => ({
  ...jest.requireActual("@/foundation/rustledger"),
  queryLedgerFilesResult: (...args: unknown[]) => queryMock(...args),
  parseLedgerFiles: (...args: unknown[]) => parseMock(...args),
}));
jest.mock("@/foundation/clients/load-cached-ledger-file-map", () => ({
  loadCachedFileMapForRepo: jest.fn(),
}));

const failedAssertion = {
  type: "balance",
  date: "2024-01-05",
  account: "Assets:Bank",
  amount: { number: "999.00", currency: "USD" },
};
const passingAssertion = {
  type: "balance",
  date: "2024-01-06",
  account: "Assets:Bank",
  amount: { number: "10", currency: "USD" },
};

const service = () =>
  new LedgerShellService(
    { getPublicApiClient: jest.fn().mockResolvedValue({}) } as never,
    {} as never,
  );
const params = (query: string) => ({
  ledgerId: "alice/main",
  userId: "u",
  query,
});

beforeEach(() => {
  queryMock.mockReset();
  parseMock.mockReset();
  jest.mocked(loadCachedFileMapForRepo).mockResolvedValue({
    files: { "main.bean": "" },
    entryPoint: "main.bean",
    sourceFiles: ["main.bean"],
    repoPaths: ["main.bean"],
    managedPrices: [],
    managedPricePaths: [],
  } as never);
  parseMock.mockResolvedValue({
    directives: [failedAssertion, passingAssertion],
    errors: [
      {
        code: "E2001",
        date: "2024-01-05",
        message:
          "Balance failed for Assets:Bank: expected 999.00 USD, got 10 USD",
      },
    ],
  });
});

describe("balances.discrepancy through the shell", () => {
  const engineRows = (): QueryResult => ({
    columns: ["account", "discrepancy", "date", "account", "amount"],
    rows: [
      [
        "Assets:Bank",
        null,
        "2024-01-05",
        "Assets:Bank",
        { number: "999.00", currency: "USD" },
      ],
      [
        "Assets:Bank",
        null,
        "2024-01-06",
        "Assets:Bank",
        { number: "10", currency: "USD" },
      ],
    ],
    errors: [],
  });

  it("returns the difference of a failed assertion as an Amount, and NULL for a passing one", async () => {
    queryMock.mockResolvedValue(engineRows());

    const result = await service().queryShell(
      params("SELECT account, discrepancy FROM balances"),
    );

    expect(queryMock.mock.calls[0]?.[2]).toBe(
      "SELECT account, discrepancy, date, account, amount FROM balances",
    );
    const table = result.table!;
    expect(table.types).toEqual([
      { name: "account", dtype: "str" },
      { name: "discrepancy", dtype: "Amount" },
    ]);
    expect(table.rows).toEqual([
      ["Assets:Bank", { USD: "-989.00" }],
      ["Assets:Bank", null],
    ]);
  });

  it("shows the difference in the text result too", async () => {
    queryMock.mockResolvedValue(engineRows());
    const { text, rowCount } = await service().queryShellText(
      params("SELECT account, discrepancy FROM balances"),
    );
    expect(rowCount).toBe(2);
    expect(text).toContain("-989.00 USD");
  });

  it("does not validate the ledger or touch the query when discrepancy is not asked for", async () => {
    queryMock.mockResolvedValue({
      columns: ["account"],
      rows: [["Assets:Bank"]],
      errors: [],
    });
    await service().queryShell(params("SELECT account FROM balances"));
    expect(queryMock.mock.calls[0]?.[2]).toBe("SELECT account FROM balances");
    expect(parseMock).not.toHaveBeenCalled();
  });

  it("refuses discrepancy as a filter instead of answering over NULL", async () => {
    const error = await service()
      .queryShell(params("SELECT account FROM balances WHERE discrepancy"))
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(BadUserInputError);
    expect((error as Error).message).toContain(
      "SELECT date, account, amount, discrepancy FROM balances",
    );
    expect(queryMock).not.toHaveBeenCalled();
  });
});
