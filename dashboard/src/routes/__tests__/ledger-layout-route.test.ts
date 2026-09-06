import { describe, expect, it, vi } from "vitest";
import type { RouterContext } from "@/common/types/router-context";
import { GetLedgerDocument } from "@/graphql/definitions";

vi.mock("@/common/components/ledger-layout", () => ({
  LedgerLayout: () => null,
}));
vi.mock("@/common/components/ledger-layout/ledger-route-error", () => ({
  LedgerRouteError: () => null,
}));

import { Route } from "../ledger.$ledgerOwner.$ledgerName";

type QueryOptions = { query: unknown; variables?: Record<string, unknown> };

function loaderInput(query: (options: QueryOptions) => Promise<unknown>) {
  return {
    params: { ledgerOwner: "open_ledger", ledgerName: "example" },
    context: { client: { query } } as unknown as RouterContext,
  };
}

function runLoader(query: (options: QueryOptions) => Promise<unknown>) {
  const loader = Route.options.loader as unknown as (
    input: ReturnType<typeof loaderInput>,
  ) => Promise<unknown>;
  return loader(loaderInput(query));
}

describe("ledger layout route loader", () => {
  it("awaits only the ledger itself; sidebar counts are owned by their panels", async () => {
    const query = vi.fn(() => Promise.resolve({ data: { getLedger: {} } }));

    await runLoader(query);

    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith({
      query: GetLedgerDocument,
      variables: { ledgerId: "open_ledger/example" },
    });
  });

  it("surfaces a missing or private ledger as the route error", async () => {
    const denied = new Error("Forbidden - ledger owner does not exist");
    const query = vi.fn(() => Promise.reject(denied));

    await expect(runLoader(query)).rejects.toBe(denied);
  });
});
