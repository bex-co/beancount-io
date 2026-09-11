import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { describe, expect, it, vi } from "vitest";
import { isNotFound, isRedirect } from "@tanstack/react-router";
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

function loaderInput(
  query: (options: QueryOptions) => Promise<unknown>,
  location?: {
    pathname: string;
    searchStr?: string;
    hash?: string;
  },
) {
  return {
    params: { ledgerOwner: "open_ledger", ledgerName: "example" },
    context: { client: { query } } as unknown as RouterContext,
    location: {
      pathname: location?.pathname ?? "/ledger/open_ledger/example/journal",
      searchStr: location?.searchStr ?? "?lang=en&account=Assets",
      hash: location?.hash ?? "",
    },
  };
}

function runLoader(
  query: (options: QueryOptions) => Promise<unknown>,
  location?: {
    pathname: string;
    searchStr?: string;
    hash?: string;
  },
) {
  const loader = Route.options.loader as unknown as (
    input: ReturnType<typeof loaderInput>,
  ) => Promise<unknown>;
  return loader(loaderInput(query, location));
}

function graphqlDenied(code: string, message: string) {
  return new CombinedGraphQLErrors({
    errors: [{ message, extensions: { code } }],
  });
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

  it("redirects guests to login with the full relative destination before SSR strips Apollo codes", async () => {
    const query = vi.fn(() =>
      Promise.reject(
        graphqlDenied("UNAUTHENTICATED", "Authentication required"),
      ),
    );

    let thrown: unknown;
    try {
      await runLoader(query);
    } catch (error) {
      thrown = error;
    }

    expect(isRedirect(thrown)).toBe(true);
    expect(thrown).toMatchObject({
      options: {
        to: "/auth/login",
        search: {
          next: "/ledger/open_ledger/example/journal?lang=en&account=Assets",
        },
      },
    });
  });

  it("maps authorized denials to not-found so SSR never hydrates a plain Error", async () => {
    const query = vi.fn(() =>
      Promise.reject(graphqlDenied("FORBIDDEN", "Authorization denied")),
    );

    let thrown: unknown;
    try {
      await runLoader(query);
    } catch (error) {
      thrown = error;
    }

    expect(isNotFound(thrown)).toBe(true);
  });

  it("maps missing ledgers to not-found without guessing from message text", async () => {
    const query = vi.fn(() =>
      Promise.reject(graphqlDenied("NOT_FOUND", "Ledger not found")),
    );

    await expect(runLoader(query)).rejects.toSatisfy(isNotFound);
  });

  it("rethrows unexpected failures so the route errorComponent can classify them", async () => {
    const denied = new Error("upstream unavailable");
    const query = vi.fn(() => Promise.reject(denied));

    await expect(runLoader(query)).rejects.toBe(denied);
  });
});
