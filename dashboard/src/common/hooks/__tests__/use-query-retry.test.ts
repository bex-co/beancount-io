import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useQueryRetry } from "../use-query-retry";

/**
 * Apollo clears a query's `error` while it refetches; `useQueryRetry` keeps
 * the failure being retried so its error view and busy Try Again stay
 * mounted (w4/m50), but only for the scope that was retried (w4/1045).
 */
function held() {
  let settle!: (ok: boolean) => void;
  const refetch = () =>
    new Promise<void>((resolve, reject) => {
      settle = (ok) => (ok ? resolve() : reject(new Error("offline")));
    });
  return { refetch, settle: (ok: boolean) => settle(ok) };
}

describe("useQueryRetry", () => {
  it("keeps the retried failure while the refetch runs, and drops it on success", async () => {
    const failed = new Error("offline");
    const read = held();
    const { result, rerender } = renderHook(
      ({ error }) => useQueryRetry(error, read.refetch, "account-a"),
      { initialProps: { error: failed as Error | undefined } },
    );
    act(() => result.current.retry());
    // Apollo clears `error` for the refetch.
    rerender({ error: undefined });
    expect(result.current.failure).toBe(failed);
    expect(result.current.retrying).toBe(true);

    await act(async () => read.settle(true));
    expect(result.current.failure).toBeUndefined();
    expect(result.current.retrying).toBe(false);
  });

  it("keeps no retried failure for a scope the owner moved to", async () => {
    const read = held();
    const { result, rerender } = renderHook(
      ({ error, scope }) => useQueryRetry(error, read.refetch, scope),
      {
        initialProps: {
          error: new Error("offline") as Error | undefined,
          scope: "account-a",
        },
      },
    );
    act(() => result.current.retry());
    rerender({ error: undefined, scope: "account-b" });
    expect(result.current.failure).toBeUndefined();

    // Moving back while it still runs shows it again.
    rerender({ error: undefined, scope: "account-a" });
    expect(result.current.failure).toBeInstanceOf(Error);
    await act(async () => read.settle(false));
  });
});
