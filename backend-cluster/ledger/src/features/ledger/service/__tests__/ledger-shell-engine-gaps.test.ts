import type { QueryResult } from "@rustledger/wasm";
import { loadCachedFileMapForRepo } from "@/foundation/clients/load-cached-ledger-file-map";
import { BadUserInputError } from "@/shared/errors";
import { LedgerShellService } from "../ledger-shell-service";

/**
 * w23/016. Documented beanquery forms the pinned engine refuses came back as
 * its bare type error, which names no way forward. The engine is stubbed with
 * the messages rustledger 0.24.0 actually returns; `verify:rustledger` checks
 * the real engine still does, and that the named alternatives run.
 */
const queryLedgerFilesResultMock = jest.fn();
jest.mock("@/foundation/rustledger", () => ({
  ...jest.requireActual("@/foundation/rustledger"),
  queryLedgerFilesResult: (...args: unknown[]) =>
    queryLedgerFilesResultMock(...args),
}));
jest.mock("@/foundation/clients/load-cached-ledger-file-map", () => ({
  loadCachedFileMapForRepo: jest.fn(),
}));

const failure = (message: string): QueryResult =>
  ({
    columns: [],
    rows: [],
    errors: [
      {
        message,
        code: null,
        phase: "query",
        hint: null,
        file: null,
        line: null,
        column: null,
        end_line: null,
        end_column: null,
        severity: "error",
      },
    ],
  }) as QueryResult;

async function refusal(engineMessage: string): Promise<string> {
  queryLedgerFilesResultMock.mockResolvedValue(failure(engineMessage));
  const error = await new LedgerShellService(
    { getPublicApiClient: jest.fn().mockResolvedValue({}) } as never,
    {} as never,
  )
    .queryShellText({
      ledgerId: "open_ledger/example",
      userId: undefined,
      query: "SELECT 1",
    })
    .catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(BadUserInputError);
  return (error as Error).message;
}

beforeEach(() => {
  queryLedgerFilesResultMock.mockReset();
  jest.mocked(loadCachedFileMapForRepo).mockResolvedValue({
    files: { "main.bean": "" },
    entryPoint: "main.bean",
    sourceFiles: ["main.bean"],
    repoPaths: ["main.bean"],
    managedPrices: [],
    managedPricePaths: [],
  } as never);
});

describe("refusals for BQL forms this engine does not accept", () => {
  it.each([
    "Query execution error: type error: NEG expects a number or amount",
    "Query execution error: type error: negation requires numeric value",
  ])("names a working negation after %p", async (engineMessage) => {
    const message = await refusal(engineMessage);
    expect(message).toContain(engineMessage);
    expect(message).toContain("sum(neg(units(position)))");
  });

  it("names a working currency filter", async () => {
    const message = await refusal(
      "Query execution error: type error: FILTER_CURRENCY expects (inventory, string)",
    );
    expect(message).toContain("filter_currency(sum(position), 'USD')");
  });

  it("names the windowed sum after a FROM window's lot error (w23/020)", async () => {
    const message = await refusal(
      "Query execution error: evaluation error: No matching lot for VHT in Assets:Broker",
    );
    expect(message).toContain("No matching lot for VHT in Assets:Broker");
    expect(message).toContain("SELECT account, sum(position) FROM");
  });

  it.each([
    "Query execution error: type error: DATE: argument must be a string or date",
    "Query execution error: type error: WEEKDAY expects a date",
    "Query execution error: type error: SUBSTR expects (string, int, [int])",
    "Query execution error: type error: SUBST expects (pattern, replacement, string)",
    "Query execution error: type error: STARTSWITH expects two strings",
    "Query execution error: type error: MAXWIDTH: first argument must be a string",
  ])(
    "names the NULL-filter workaround after the strict-camp refusal %p (w23/m14/t004)",
    async (engineMessage) => {
      const message = await refusal(engineMessage);
      expect(message).toContain(engineMessage);
      expect(message).toContain("WHERE payee IS NOT NULL");
    },
  );

  it("leaves any other refusal as the engine wrote it", async () => {
    expect(await refusal("syntax error at SELEKT")).toBe(
      "Invalid BQL query: syntax error at SELEKT",
    );
  });
});
