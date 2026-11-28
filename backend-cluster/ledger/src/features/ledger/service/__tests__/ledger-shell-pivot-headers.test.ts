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

type ShellTable = { table: { types: { name: string }[] } };

function makeService() {
  const giteaClientFactory = { getPublicApiClient: jest.fn(async () => ({})) };
  return new LedgerShellService(giteaClientFactory as never, {} as never);
}

/** The engine's answer: its column names and one row per account. */
function engineAnswer(columns: string[]): QueryResult {
  const values = columns.slice(1).map(() => "120.40");
  return {
    columns,
    rows: [["Expenses:Food:Groceries", ...values]],
    errors: [],
  } as unknown as QueryResult;
}

async function headers(query: string, columns: string[]) {
  queryLedgerFilesResult.mockResolvedValue(engineAnswer(columns));
  const params = { ledgerId: "open_ledger/example", userId: undefined, query };
  const shell = (await makeService().queryShell(params)) as ShellTable;
  const { text } = await makeService().queryShellText(params);
  return {
    structured: shell.table.types.map((type) => type.name),
    /** The text table's header line. */
    text: (text.split("\n")[0] as string).trim(),
  };
}

/** A header line holding exactly these names, in order. */
function textHeader(names: string[]): RegExp {
  const escaped = names.map((name) => name.replace(/[()/^$.*+?]/gu, "\\$&"));
  return new RegExp(`^${escaped.join("\\s+")}$`, "u");
}

const FOOD = "WHERE account ~ '^Expenses:Food' GROUP BY 1, 2";

/**
 * w31/159: a PIVOT BY whose pivot column has one value fewer than the SELECT
 * list has items gives as many columns as there are items, so the w23/216
 * rename used to relabel the pivot values with the SELECT text. The structured
 * and text answers (which MCP, REST and GraphQL all share) keep the engine's
 * names, as stock beanquery does.
 */
describe("LedgerShellService PIVOT BY headers", () => {
  beforeEach(() => queryLedgerFilesResult.mockReset());

  it("keeps the pivot values as the headers of a two-value pivot", async () => {
    const columns = ["account/month(date)", "7", "8"];
    const query = `SELECT account, month(date), sum(number) ${FOOD} PIVOT BY 1, 2`;
    expect(await headers(query, columns)).toEqual({
      structured: columns,
      text: expect.stringMatching(textHeader(columns)),
    });
  });

  it("keeps the last value's header when the pivot column is bare", async () => {
    const columns = ["account/month", "7", "8"];
    const query = `SELECT account, month, sum(number) ${FOOD} PIVOT BY 1, 2`;
    expect(await headers(query, columns)).toEqual({
      structured: columns,
      text: expect.stringMatching(textHeader(columns)),
    });
  });

  it("keeps the pivot values when the summed column is aliased", async () => {
    const columns = ["account/month(date)", "7", "8"];
    const query = `SELECT account, month(date), sum(number) AS total ${FOOD} PIVOT BY 1, 2`;
    expect(await headers(query, columns)).toEqual({
      structured: columns,
      text: expect.stringMatching(textHeader(columns)),
    });
  });

  it("keeps the pivot values of a three-value pivot", async () => {
    const columns = ["account/month(date)", "2", "7", "8"];
    const query =
      "SELECT account, month(date), sum(number) WHERE account ~ '^Expenses' GROUP BY 1, 2 PIVOT BY 1, 2";
    expect(await headers(query, columns)).toEqual({
      structured: columns,
      text: expect.stringMatching(textHeader(columns)),
    });
  });

  it("still names an unpivoted expression with its source text", async () => {
    const query = `SELECT account, UPPER( payee ), sum(number) ${FOOD}`;
    expect(
      await headers(query, ["account", "UPPER(payee)", "sum(number)"]),
    ).toEqual({
      structured: ["account", "UPPER( payee )", "sum(number)"],
      text: expect.stringMatching(
        textHeader(["account", "UPPER( payee )", "sum(number)"]),
      ),
    });
  });
});
