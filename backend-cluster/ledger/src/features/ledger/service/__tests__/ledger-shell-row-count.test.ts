import type { QueryResult } from "@rustledger/wasm";
import { loadCachedFileMapForRepo } from "@/foundation/clients/load-cached-ledger-file-map";
import { BadUserInputError } from "@/shared/errors";
import { LedgerShellService } from "../ledger-shell-service";

const queryLedgerFilesResultMock = jest.fn();

jest.mock("@/foundation/rustledger", () => ({
  ...jest.requireActual("@/foundation/rustledger"),
  queryLedgerFilesResult: (...args: unknown[]) =>
    queryLedgerFilesResultMock(...args),
}));
jest.mock("@/foundation/clients/load-cached-ledger-file-map", () => ({
  loadCachedFileMapForRepo: jest.fn(),
}));

const loadFiles = jest.mocked(loadCachedFileMapForRepo);
const files = {
  "main.beancount": "2016-01-01 open Assets:Cash USD\n",
};
const loaded = {
  files,
  entryPoint: "main.beancount",
  sourceFiles: ["main.beancount"],
  repoPaths: ["main.beancount"],
  managedPrices: [],
  managedPricePaths: [],
};
const params = {
  ledgerId: "open_ledger/example",
  userId: undefined,
};

function makeService() {
  return new LedgerShellService(
    { getPublicApiClient: jest.fn().mockResolvedValue({}) } as never,
    {} as never,
  );
}

const printOpen = "2016-01-01 open Assets:Cash USD";
const printTransaction =
  '2016-01-02 * "Pay"\n  Assets:Cash  10 USD\n  Income:Work  -10 USD';

const fixtures: {
  name: string;
  query: string;
  result: QueryResult;
  text: string;
}[] = [
  {
    name: "one multiline literal is one canonical row",
    query: "SELECT 'qa\nline' AS qa_text LIMIT 1",
    result: { columns: ["qa_text"], rows: [["qa\nline"]], errors: [] },
    text: "qa_text\n-------\nqa\nline\n",
  },
  {
    name: "literal backslash-n stays on one rendered line",
    query: "SELECT 'qa\\nline' AS qa_text LIMIT 1",
    result: { columns: ["qa_text"], rows: [["qa\\nline"]], errors: [] },
    text: "qa_text \n--------\nqa\\nline\n",
  },
  {
    name: "an empty result has no text and zero rows",
    query: "SELECT account WHERE FALSE",
    result: { columns: ["account"], rows: [], errors: [] },
    text: "",
  },
  {
    name: "a one-character separator does not add header rows",
    query: "SELECT 1 AS qa_count LIMIT 1",
    result: { columns: ["qa_count"], rows: [[1]], errors: [] },
    text: "q\n-\n1\n",
  },
  {
    name: "a count aggregate with a two-character separator is one row",
    query: "SELECT COUNT(*) AS qa_count",
    result: { columns: ["qa_count"], rows: [[34]], errors: [] },
    text: "qa\n--\n34\n",
  },
  {
    name: "an empty-string cell remains a row with its blank rendering",
    query: "SELECT '' AS qa_text LIMIT 1",
    result: { columns: ["qa_text"], rows: [[""]], errors: [] },
    text: "q\n-\n \n",
  },
  {
    name: "ordinary decimal tables preserve alignment, signs and precision",
    query: "SELECT account, number LIMIT 2",
    result: {
      columns: ["account", "number"],
      rows: [
        ["Assets:Cash", "12.50"],
        ["Expenses:Food", "-2.5"],
      ],
      errors: [],
    },
    text:
      "   account     numbe\n" +
      "-------------  -----\n" +
      "Assets:Cash    12.50\n" +
      "Expenses:Food  -2.5 \n",
  },
  {
    name: "PRINT counts directives rather than their multiline posting text",
    query: "PRINT",
    result: {
      columns: ["entry"],
      rows: [[printOpen], [printTransaction]],
      errors: [],
    },
    // Fixed golden output: the transaction cell occupies 63 characters,
    // including its two embedded newlines; the opening directive occupies 31.
    text:
      " ".repeat(29) +
      "entry" +
      " ".repeat(29) +
      "\n" +
      "-".repeat(63) +
      "\n" +
      printOpen +
      " ".repeat(32) +
      "\n" +
      printTransaction +
      "\n",
  },
];

describe("LedgerShellService same-query text row metadata (w6/m1/t002)", () => {
  beforeEach(() => {
    queryLedgerFilesResultMock.mockReset();
    loadFiles.mockReset();
    loadFiles.mockResolvedValue(loaded);
  });

  it.each(fixtures)("$name", async ({ query, result, text }) => {
    queryLedgerFilesResultMock.mockResolvedValue(result);
    const response = await makeService().queryShellText({ ...params, query });

    expect(response).toEqual({ text, rowCount: result.rows.length });
    expect(queryLedgerFilesResultMock).toHaveBeenCalledTimes(1);
    expect(queryLedgerFilesResultMock).toHaveBeenCalledWith(
      files,
      "main.beancount",
      query,
    );
    expect(loadFiles).toHaveBeenCalledTimes(1);
  });

  it("text and row metadata retain all 1005 canonical rows without a typed-query cap", async () => {
    const result: QueryResult = {
      columns: ["value"],
      rows: Array.from({ length: 1005 }, () => ["X"]),
      errors: [],
    };
    queryLedgerFilesResultMock.mockResolvedValue(result);
    const response = await makeService().queryShellText({
      ...params,
      query: "SELECT 'X' AS value",
    });

    expect(response).toHaveProperty("rowCount", result.rows.length);
    expect(response).toHaveProperty("rowCount", 1005);
    expect(response.text).toBe("v\n-\n" + "X\n".repeat(1005));
    expect(queryLedgerFilesResultMock).toHaveBeenCalledTimes(1);
    expect(loadFiles).toHaveBeenCalledTimes(1);
  });

  const diagnostic = {
    message: "syntax error",
    code: null,
    phase: null,
    hint: null,
    file: null,
    line: null,
    column: null,
    end_line: null,
    end_column: null,
  };

  it("engine errors still reject instead of returning an apparently empty counted result", async () => {
    queryLedgerFilesResultMock.mockResolvedValue({
      columns: [],
      rows: [],
      errors: [{ ...diagnostic, severity: "error" }],
    } satisfies QueryResult);

    await expect(
      makeService().queryShellText({
        ...params,
        query: "SELEKT account",
      }),
    ).rejects.toBeInstanceOf(BadUserInputError);
    expect(queryLedgerFilesResultMock).toHaveBeenCalledTimes(1);
  });

  it("warnings preserve successful text and canonical count", async () => {
    queryLedgerFilesResultMock.mockResolvedValue({
      columns: ["value"],
      rows: [[1]],
      errors: [{ ...diagnostic, severity: "warning" }],
    } satisfies QueryResult);

    await expect(
      makeService().queryShellText({
        ...params,
        query: "SELECT 1 AS value LIMIT 1",
      }),
    ).resolves.toEqual({ text: "v\n-\n1\n", rowCount: 1 });
    expect(queryLedgerFilesResultMock).toHaveBeenCalledTimes(1);
  });

  it("a thrown engine failure stays the same failure with one attempted execution", async () => {
    const failure = new Error("engine unavailable");
    queryLedgerFilesResultMock.mockRejectedValue(failure);

    await expect(
      makeService().queryShellText({
        ...params,
        query: "SELECT account",
      }),
    ).rejects.toBe(failure);
    expect(queryLedgerFilesResultMock).toHaveBeenCalledTimes(1);
  });

  it("a file-loading failure remains a failure and never executes the query", async () => {
    const failure = new Error("source unavailable");
    loadFiles.mockRejectedValue(failure);

    await expect(
      makeService().queryShellText({
        ...params,
        query: "SELECT account",
      }),
    ).rejects.toBe(failure);
    expect(queryLedgerFilesResultMock).not.toHaveBeenCalled();
  });
});
