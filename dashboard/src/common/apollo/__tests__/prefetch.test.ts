import { afterEach, describe, expect, it, vi } from "vitest";
import type { ApolloClient } from "@apollo/client";
import { GetLedgerFileDocument } from "@/graphql/definitions";
import { prefetchOptionalQuery } from "../prefetch";

const options = {
  query: GetLedgerFileDocument,
  variables: { ledgerId: "owner/ledger", path: "README.md" },
};

function fakeClient(query: ReturnType<typeof vi.fn>) {
  return { query } as unknown as ApolloClient;
}

describe("prefetchOptionalQuery", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("starts the query in the browser and returns without awaiting it", () => {
    vi.stubEnv("SSR", false);
    let settle: (value: unknown) => void = () => {};
    const query = vi.fn(
      () =>
        new Promise((resolve) => {
          settle = resolve;
        }),
    );

    const result = prefetchOptionalQuery(fakeClient(query), options);

    expect(result).toBeUndefined();
    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(options);
    settle({ data: {} });
  });

  it("swallows a failed optional request instead of surfacing it", async () => {
    vi.stubEnv("SSR", false);
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);
    const query = vi.fn(() => Promise.reject(new Error("README missing")));

    prefetchOptionalQuery(fakeClient(query), options);
    await new Promise((resolve) => setTimeout(resolve, 0));

    process.off("unhandledRejection", unhandled);
    expect(unhandled).not.toHaveBeenCalled();
  });

  it("starts nothing during SSR so the server never waits on optional data", () => {
    vi.stubEnv("SSR", true);
    const query = vi.fn();

    prefetchOptionalQuery(fakeClient(query), options);

    expect(query).not.toHaveBeenCalled();
  });
});
