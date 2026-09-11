import { describe, expect, it } from "vitest";
import type { RouterContext } from "@/common/types/router-context";
import {
  GetLedgerBalanceSheetDocument,
  GetLedgerDocument,
} from "@/graphql/definitions";
import { balanceSheetLoader } from "../loader";

type QueryOptions = { query: unknown; variables?: Record<string, unknown> };

function loaderInput(
  query: (options: QueryOptions) => Promise<unknown>,
  conversion = "",
) {
  return {
    params: { ledgerOwner: "open_ledger", ledgerName: "example" },
    context: { client: { query } } as unknown as RouterContext,
    deps: {
      account: "",
      filter: "",
      time: "",
      conversion,
    },
    abortController: new AbortController(),
    preload: false,
    cause: "enter" as const,
    location: {} as never,
  };
}

function resolvesLedger(operatingCurrency: string[]) {
  return (options: QueryOptions) =>
    options.query === GetLedgerDocument
      ? Promise.resolve({
          data: { getLedger: { options: { operatingCurrency } } },
        })
      : Promise.resolve({ data: {} });
}

describe("balanceSheetLoader", () => {
  it("defaults conversion to at_cost when the URL carries no selection", async () => {
    const query = resolvesLedger(["USD"]);
    let captured: Record<string, unknown> | undefined;
    await balanceSheetLoader(
      loaderInput((options) => {
        if (options.query === GetLedgerBalanceSheetDocument) {
          captured = options.variables;
        }
        return query(options);
      }),
    );

    expect(captured).toMatchObject({ conversion: "at_cost" });
  });

  it("resolves the same conversion the page's useQuery call resolves for the same URL", async () => {
    const query = resolvesLedger(["USD", "IRT"]);
    let captured: Record<string, unknown> | undefined;
    await balanceSheetLoader(
      loaderInput((options) => {
        if (options.query === GetLedgerBalanceSheetDocument) {
          captured = options.variables;
        }
        return query(options);
      }, "IRT"),
    );

    expect(captured).toMatchObject({ conversion: "IRT" });
  });
});
