import {
  executeStructuredBqlQuery,
  MAX_STRUCTURED_BQL_ROWS,
} from "../bql-query-tool";
import type { ToolContext } from "../types";

/**
 * w2/m28:t001. A `SELECT` with no `LIMIT` over a real ledger is tens of
 * thousands of postings, all of which used to arrive in the model's context
 * whether it needed the tail or not — and with no way to tell whether it had
 * seen the whole result.
 */
function ctx(rows: unknown[][]) {
  const queryShell = jest.fn(async () => ({
    resultType: "table" as const,
    table: {
      types: [{ name: "account", dtype: "str" }],
      rows,
    },
  }));
  return {
    queryShell,
    context: {
      services: { ledgerShell: { queryShell } },
      identity: { userId: "usr_1" },
      ledgerId: "alice/main",
    } as unknown as Pick<ToolContext, "services" | "identity" | "ledgerId">,
  };
}

const rows = (count: number) =>
  Array.from({ length: count }, (_, i) => [`Assets:A${i}`]);

describe("runBqlQueryStructured", () => {
  it("reports how many rows came back", async () => {
    const { context } = ctx(rows(3));
    const result = await executeStructuredBqlQuery(context, { query: "x" });
    expect(result).toMatchObject({
      ok: true,
      result: { rowCount: 3, truncated: false },
    });
  });

  it("counts an empty result as zero rather than omitting the count", async () => {
    const { context } = ctx([]);
    const result = await executeStructuredBqlQuery(context, { query: "x" });
    expect(result.ok && result.result.rowCount).toBe(0);
    expect(result.ok && result.result.truncated).toBe(false);
  });

  it("caps a runaway result and says that it did", async () => {
    const { context } = ctx(rows(MAX_STRUCTURED_BQL_ROWS + 500));
    const result = await executeStructuredBqlQuery(context, { query: "x" });
    expect(result.ok && result.result.truncated).toBe(true);
    expect(result.ok && result.result.rowCount).toBe(MAX_STRUCTURED_BQL_ROWS);
    expect(result.ok && result.result.table?.rows).toHaveLength(
      MAX_STRUCTURED_BQL_ROWS,
    );
  });

  it("leaves a text result alone, with nothing to count", async () => {
    const queryShell = jest.fn(async () => ({
      resultType: "text" as const,
      text: { contents: "No matching entries\n" },
    }));
    const result = await executeStructuredBqlQuery(
      {
        services: { ledgerShell: { queryShell } },
        identity: { userId: "usr_1" },
        ledgerId: "alice/main",
      } as unknown as Pick<ToolContext, "services" | "identity" | "ledgerId">,
      { query: "x" },
    );
    expect(result).toMatchObject({
      ok: true,
      result: {
        resultType: "text",
        rowCount: 0,
        truncated: false,
        text: { contents: "No matching entries\n" },
      },
    });
  });

  it("returns the failure as a value rather than throwing", async () => {
    const queryShell = jest.fn(async () => {
      throw new Error("Fava is down");
    });
    const result = await executeStructuredBqlQuery(
      {
        services: { ledgerShell: { queryShell } },
        identity: { userId: "usr_1" },
        ledgerId: "alice/main",
      } as unknown as Pick<ToolContext, "services" | "identity" | "ledgerId">,
      { query: "x" },
    );
    expect(result).toMatchObject({ ok: false, error: "Fava is down" });
  });
});
