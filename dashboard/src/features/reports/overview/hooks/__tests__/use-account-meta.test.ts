import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { GetLedgerAccountMetaDocument } from "@/graphql/definitions";

const mockUseQuery = vi.fn();

vi.mock("@apollo/client/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

import { useAccountMeta } from "../use-account-meta";

const directives = [
  { account: "Assets:US:Bank:CD", meta: { "cash-flow-role": "investing" } },
  { account: "Assets:US:Bank:Checking", meta: null },
];

describe("useAccountMeta", () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
  });

  it("queries the ledger's open-directive metadata from the cache first", () => {
    mockUseQuery.mockReturnValue({ data: undefined, loading: true });

    renderHook(() => useAccountMeta("owner/ledger"));

    expect(mockUseQuery).toHaveBeenCalledWith(GetLedgerAccountMetaDocument, {
      variables: { ledgerId: "owner/ledger" },
      fetchPolicy: "cache-first",
    });
  });

  it("is pending, with no map to fall back on, while the directives load", () => {
    mockUseQuery.mockReturnValue({ data: undefined, loading: true });

    const { result } = renderHook(() => useAccountMeta("owner/ledger"));

    expect(result.current).toEqual({ accountMeta: undefined, pending: true });
  });

  it("exposes declared roles as the authoritative map once loaded", () => {
    mockUseQuery.mockReturnValue({
      data: { getLedgerAccountDirectives: directives },
      loading: false,
    });

    const { result } = renderHook(() => useAccountMeta("owner/ledger"));

    expect(result.current.pending).toBe(false);
    expect(result.current.accountMeta?.get("Assets:US:Bank:CD")).toEqual({
      "cash-flow-role": "investing",
    });
    expect(result.current.accountMeta?.get("Assets:US:Bank:Checking")).toBe(
      null,
    );
  });

  it("keeps the same map instance across renders with unchanged data", () => {
    mockUseQuery.mockReturnValue({
      data: { getLedgerAccountDirectives: directives },
      loading: false,
    });

    const { result, rerender } = renderHook(() =>
      useAccountMeta("owner/ledger"),
    );
    const first = result.current.accountMeta;
    rerender();

    expect(result.current.accountMeta).toBe(first);
  });

  it("degrades to heuristics (no map, not pending) when the query fails", () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      loading: false,
      error: new Error("Cannot query field meta"),
    });

    const { result } = renderHook(() => useAccountMeta("owner/ledger"));

    expect(result.current).toEqual({ accountMeta: undefined, pending: false });
  });

  it("returns to pending for a different ledger instead of reusing the previous map", () => {
    mockUseQuery.mockReturnValue({
      data: { getLedgerAccountDirectives: directives },
      loading: false,
    });
    const { result, rerender } = renderHook(
      ({ ledgerId }: { ledgerId: string }) => useAccountMeta(ledgerId),
      { initialProps: { ledgerId: "owner/first" } },
    );
    expect(result.current.pending).toBe(false);

    mockUseQuery.mockReturnValue({ data: undefined, loading: true });
    rerender({ ledgerId: "owner/second" });

    expect(result.current).toEqual({ accountMeta: undefined, pending: true });
  });
});
