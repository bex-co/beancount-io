import type { CellValue, QueryResult } from "@rustledger/wasm";
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

type ShellTable = {
  table: { types: { name: string; dtype: string }[]; rows: unknown[][] };
};

function makeService() {
  const giteaClientFactory = { getPublicApiClient: jest.fn(async () => ({})) };
  return new LedgerShellService(giteaClientFactory as never, {} as never);
}

async function answer(query: string, columns: string[], rows: CellValue[][]) {
  queryLedgerFilesResult.mockResolvedValue({
    columns,
    rows,
    errors: [],
  } as unknown as QueryResult);
  const params = { ledgerId: "open_ledger/example", userId: undefined, query };
  const shell = (await makeService().queryShell(params)) as ShellTable;
  const { text } = await makeService().queryShellText(params);
  return {
    types: shell.table.types,
    structured: shell.table.rows,
    /** The text table's body rows, trailing padding removed. */
    text: text
      .split("\n")
      .slice(2, -1)
      .map((line) => line.trimEnd()),
  };
}

/**
 * The note's repro, as the engine answers `SELECT date, description WHERE
 * account = 'Assets:Cash'`: `* "" "empty payee"`, `* "Shop" ""`, `* "" ""`,
 * then `* "only narration"` (no payee), `* "Both" "parts"` and a bare `*`.
 */
const ENGINE_ROWS: CellValue[][] = [
  ["2026-02-01", " | empty payee"],
  ["2026-02-02", "Shop | "],
  ["2026-02-03", " | "],
  ["2026-02-04", "only narration"],
  ["2026-02-05", "Both | parts"],
  ["2026-02-06", ""],
];

/** What stock beanquery 0.2.0 answers for the same six transactions. */
const STOCK = ["empty payee", "Shop", "", "only narration", "Both | parts", ""];

/**
 * w31/161: the engine joins an empty payee or narration into `description`
 * with ` | `, where stock drops the empty part. MCP, REST and GraphQL all
 * read these two renderers, so both answer stock's text.
 */
describe("LedgerShellService description column", () => {
  beforeEach(() => queryLedgerFilesResult.mockReset());

  it("drops the separator an empty payee or narration leaves", async () => {
    const result = await answer(
      "SELECT date, description WHERE account = 'Assets:Cash'",
      ["date", "description"],
      ENGINE_ROWS,
    );
    expect(result.structured.map((row) => row[1])).toEqual(STOCK);
    expect(result.text).toEqual([
      "2026-02-01  empty payee",
      "2026-02-02  Shop",
      "2026-02-03",
      "2026-02-04  only narration",
      "2026-02-05  Both | parts",
      "2026-02-06",
    ]);
  });

  it("sizes the text column to the stripped values", async () => {
    queryLedgerFilesResult.mockResolvedValue({
      columns: ["date", "description"],
      rows: [["2026-02-02", "Groceries | "]],
      errors: [],
    } as unknown as QueryResult);
    const { text } = await makeService().queryShellText({
      ledgerId: "open_ledger/example",
      userId: undefined,
      query: "SELECT date, description",
    });
    expect(text).toBe(
      "   date     description\n----------  -----------\n2026-02-02  Groceries  \n",
    );
  });

  it("strips an aliased description, and a DISTINCT one", async () => {
    const aliased = await answer(
      "SELECT description AS d",
      ["d"],
      ENGINE_ROWS.map((row) => [row[1] as CellValue]),
    );
    expect(aliased.structured.map((row) => row[0])).toEqual(STOCK);
    const distinct = await answer(
      "SELECT DISTINCT Description",
      ["description"],
      [["Shop | "], [" | Rent"]],
    );
    expect(distinct.structured).toEqual([["Shop"], ["Rent"]]);
    expect(distinct.text).toEqual(["Shop", "Rent"]);
  });

  it("leaves another column named description as the engine wrote it", async () => {
    const result = await answer(
      "SELECT description AS d, payee AS description",
      ["d", "description"],
      [["Shop | ", "Shop | "]],
    );
    expect(result.structured).toEqual([["Shop", "Shop | "]]);
  });

  it("keeps a NULL description, as FROM entries answers for an open", async () => {
    const result = await answer(
      "SELECT description FROM entries",
      ["description"],
      [[null], ["Shop | "]],
    );
    expect(result.structured).toEqual([[null], ["Shop"]]);
    expect(result.types).toEqual([{ name: "description", dtype: "str" }]);
  });

  it("types a numeric description as str, as stock does", async () => {
    const result = await answer(
      "SELECT description",
      ["description"],
      [[" | 1042"], ["2077 | "]],
    );
    expect(result.structured).toEqual([["1042"], ["2077"]]);
    expect(result.types).toEqual([{ name: "description", dtype: "str" }]);
  });
});
