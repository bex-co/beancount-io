import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useQuery, useMutation, useLazyQuery } from "@apollo/client/react";
import {
  usePlaidItems,
  usePlaidAccountsForItem,
  useUnsyncedTransactions,
  useUnlinkItem,
  useSyncAllTransactions,
  useSuggestPlaidAccountMapping,
  useBatchUpdateAccountMapping,
} from "../use-plaid-accounts";

vi.mock("@apollo/client/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useLazyQuery: vi.fn(),
}));

vi.mock("@/graphql/definitions", () => ({
  GetPlaidItemsDocument: {},
  GetPlaidAccountsDocument: {},
  GetUnsyncedPlaidTransactionsDocument: {},
  UpdatePlaidAccountMappingDocument: {},
  UnlinkPlaidItemDocument: {},
  SyncPlaidTransactionsDocument: {},
  SuggestPlaidTransactionCategoriesDocument: {},
  SuggestPlaidAccountMappingDocument: {},
  SubmitPlaidTransactionsToLedgerDocument: {},
}));

const mockUseQuery = vi.mocked(useQuery);
const mockUseMutation = vi.mocked(useMutation);
const mockUseLazyQuery = vi.mocked(useLazyQuery);

beforeEach(() => {
  vi.clearAllMocks();
  mockUseQuery.mockReturnValue({
    data: undefined,
    loading: false,
    error: undefined,
    refetch: vi.fn(),
  } as never);
  mockUseMutation.mockReturnValue([
    vi.fn(),
    { loading: false, error: undefined },
  ] as never);
  mockUseLazyQuery.mockReturnValue([
    vi.fn(),
    { loading: false, error: undefined },
  ] as never);
});

describe("usePlaidItems", () => {
  it("returns empty array when no data", () => {
    const { result } = renderHook(() => usePlaidItems("owner/ledger"));
    expect(result.current.items).toEqual([]);
  });

  it("returns items from data", () => {
    const items = [{ id: "1", name: "Chase" }];
    mockUseQuery.mockReturnValue({
      data: { getPlaidItems: items },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    } as never);
    const { result } = renderHook(() => usePlaidItems("owner/ledger"));
    expect(result.current.items).toEqual(items);
  });

  it("passes ledgerId as a query variable", () => {
    renderHook(() => usePlaidItems("owner/ledger"));
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ variables: { ledgerId: "owner/ledger" } }),
    );
  });

  it("exposes loading and error states", () => {
    const error = new Error("Network error");
    mockUseQuery.mockReturnValue({
      data: undefined,
      loading: true,
      error,
      refetch: vi.fn(),
    } as never);
    const { result } = renderHook(() => usePlaidItems("owner/ledger"));
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBe(error);
  });
});

describe("usePlaidAccountsForItem", () => {
  it("skips query when itemId is null", () => {
    renderHook(() => usePlaidAccountsForItem("owner/ledger", null));
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ skip: true }),
    );
  });

  it("returns accounts when itemId is provided", () => {
    const accounts = [{ id: "acc1", name: "Checking" }];
    mockUseQuery.mockReturnValue({
      data: { getPlaidAccounts: accounts },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    } as never);
    const { result } = renderHook(() =>
      usePlaidAccountsForItem("owner/ledger", "item1"),
    );
    expect(result.current.accounts).toEqual(accounts);
  });

  it("passes ledgerId and itemId as query variables", () => {
    renderHook(() => usePlaidAccountsForItem("owner/ledger", "item1"));
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        variables: { itemId: "item1", ledgerId: "owner/ledger" },
      }),
    );
  });
});

describe("useUnsyncedTransactions", () => {
  it("passes accountId undefined (ledger-wide) when accountId is null", () => {
    renderHook(() => useUnsyncedTransactions("owner/ledger", null));
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        variables: { accountId: undefined, ledgerId: "owner/ledger" },
      }),
    );
  });

  it("passes accountId undefined (ledger-wide) when accountId is omitted", () => {
    renderHook(() => useUnsyncedTransactions("owner/ledger"));
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        variables: { accountId: undefined, ledgerId: "owner/ledger" },
      }),
    );
  });

  it("returns transactions when accountId is provided", () => {
    const transactions = [{ id: "tx1", amount: 100 }];
    mockUseQuery.mockReturnValue({
      data: { getUnsyncedPlaidTransactions: transactions },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    } as never);
    const { result } = renderHook(() =>
      useUnsyncedTransactions("owner/ledger", "acc1"),
    );
    expect(result.current.transactions).toEqual(transactions);
  });
});

describe("useUnlinkItem", () => {
  it("calls mutation with correct variables when unlinkItem is invoked", async () => {
    const mockMutate = vi.fn().mockResolvedValue({});
    mockUseMutation.mockReturnValue([
      mockMutate,
      { loading: false, error: undefined },
    ] as never);
    const { result } = renderHook(() => useUnlinkItem());
    await result.current.unlinkItem("owner/ledger", "item123");
    expect(mockMutate).toHaveBeenCalledWith({
      variables: { itemId: "item123", ledgerId: "owner/ledger" },
    });
  });
});

describe("useSyncAllTransactions", () => {
  it("syncs only active items in parallel and sums transactionsAdded", async () => {
    const mockMutate = vi
      .fn()
      .mockResolvedValueOnce({
        data: { syncPlaidTransactions: { transactionsAdded: 3 } },
      })
      .mockResolvedValueOnce({
        data: { syncPlaidTransactions: { transactionsAdded: 5 } },
      });
    mockUseMutation.mockReturnValue([
      mockMutate,
      { loading: false, error: undefined },
    ] as never);
    const { result } = renderHook(() => useSyncAllTransactions());
    const items = [
      { id: "item1", status: "active" },
      { id: "item2", status: "active" },
      { id: "item3", status: "requires_reauth" },
    ] as never;
    const returned = await result.current.syncAllTransactions(
      "owner/ledger",
      items,
    );
    expect(mockMutate).toHaveBeenCalledTimes(2);
    expect(mockMutate).toHaveBeenCalledWith({
      variables: { itemId: "item1", ledgerId: "owner/ledger" },
    });
    expect(mockMutate).toHaveBeenCalledWith({
      variables: { itemId: "item2", ledgerId: "owner/ledger" },
    });
    expect(returned).toEqual({
      transactionsAdded: 8,
      institutionsSynced: 2,
      skippedCount: 1,
    });
  });
});

describe("useSuggestPlaidAccountMapping", () => {
  it("calls the lazy query with ledgerId and itemId and returns suggestions", async () => {
    const suggestions = [
      { accountId: "acc1", suggestedAccount: "Assets:Wise:USD" },
    ];
    const mockSuggest = vi.fn().mockResolvedValue({
      data: { suggestPlaidAccountMapping: suggestions },
    });
    mockUseLazyQuery.mockReturnValue([
      mockSuggest,
      { loading: false, error: undefined },
    ] as never);
    const { result } = renderHook(() => useSuggestPlaidAccountMapping());
    const returned = await result.current.suggestAccountMapping(
      "owner/ledger",
      "item123",
    );
    expect(mockSuggest).toHaveBeenCalledWith({
      variables: { ledgerId: "owner/ledger", itemId: "item123" },
    });
    expect(returned).toEqual(suggestions);
  });

  it("returns an empty array when there is no data", async () => {
    const mockSuggest = vi.fn().mockResolvedValue({ data: undefined });
    mockUseLazyQuery.mockReturnValue([
      mockSuggest,
      { loading: false, error: undefined },
    ] as never);
    const { result } = renderHook(() => useSuggestPlaidAccountMapping());
    const returned = await result.current.suggestAccountMapping(
      "owner/ledger",
      "item123",
    );
    expect(returned).toEqual([]);
  });
});

describe("useBatchUpdateAccountMapping", () => {
  it("fires one mutation per mapping in parallel with no per-call refetchQueries", async () => {
    const mockMutate = vi.fn().mockResolvedValue({});
    mockUseMutation.mockReturnValue([
      mockMutate,
      { loading: false, error: undefined },
    ] as never);
    const { result } = renderHook(() => useBatchUpdateAccountMapping());
    await result.current.updateMappings("owner/ledger", [
      { accountId: "acc1", ledgerAccount: "Assets:Wise:USD" },
      { accountId: "acc2", ledgerAccount: "Assets:Wise:GBP" },
    ]);
    expect(mockMutate).toHaveBeenCalledTimes(2);
    expect(mockMutate).toHaveBeenCalledWith({
      variables: {
        accountId: "acc1",
        ledgerAccount: "Assets:Wise:USD",
        ledgerId: "owner/ledger",
      },
    });
    expect(mockMutate).toHaveBeenCalledWith({
      variables: {
        accountId: "acc2",
        ledgerAccount: "Assets:Wise:GBP",
        ledgerId: "owner/ledger",
      },
    });
  });
});
