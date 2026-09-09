import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useUserFollowers } from "../use-user-followers";

const mockUseQuery = vi.fn();
const mockFetchPage = vi.fn();

vi.mock("@apollo/client/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useLazyQuery: () => [mockFetchPage],
}));

vi.mock("@/graphql/definitions", () => ({
  GetUserFollowersDocument: "GET_USER_FOLLOWERS",
}));

function user(username: string) {
  return {
    username,
    fullName: username,
    avatarUrl: null,
    bio: null,
  };
}

describe("useUserFollowers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue({
      data: null,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockFetchPage.mockResolvedValue({ data: null, error: null });
  });

  it("skips the query when the tab is inactive", () => {
    renderHook(() => useUserFollowers("testuser", false));
    expect(mockUseQuery).toHaveBeenCalledWith(
      "GET_USER_FOLLOWERS",
      expect.objectContaining({
        skip: true,
        variables: { username: "testuser", page: 1, limit: 20 },
      }),
    );
  });

  it("returns the first page and offers continuation for a full page", () => {
    const pageOne = Array.from({ length: 20 }, (_, i) => user(`u${i}`));
    mockUseQuery.mockReturnValue({
      data: { getUserFollowers: { users: pageOne, total: 20 } },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useUserFollowers("open_ledger", true));

    expect(result.current.followers).toHaveLength(20);
    expect(result.current.hasMore).toBe(true);
    expect(result.current.loadingMore).toBe(false);
  });

  it("appends page two and stops after a short page", async () => {
    const pageOne = Array.from({ length: 20 }, (_, i) => user(`u${i}`));
    const pageTwo = Array.from({ length: 18 }, (_, i) => user(`u${20 + i}`));
    mockUseQuery.mockReturnValue({
      data: { getUserFollowers: { users: pageOne, total: 20 } },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockFetchPage.mockResolvedValue({
      data: { getUserFollowers: { users: pageTwo, total: 18 } },
      error: null,
    });

    const { result } = renderHook(() => useUserFollowers("open_ledger", true));

    await act(async () => {
      await result.current.loadMore();
    });

    await waitFor(() => {
      expect(result.current.followers).toHaveLength(38);
      expect(result.current.hasMore).toBe(false);
    });
    expect(mockFetchPage).toHaveBeenCalledWith({
      variables: { username: "open_ledger", page: 2, limit: 20 },
    });
  });

  it("ignores a stale page after the username changes", async () => {
    const pageOne = Array.from({ length: 20 }, (_, i) => user(`a${i}`));
    mockUseQuery.mockReturnValue({
      data: { getUserFollowers: { users: pageOne, total: 20 } },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    let resolveFetch: (value: unknown) => void = () => undefined;
    mockFetchPage.mockReturnValue(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );

    const { result, rerender } = renderHook(
      ({ username }) => useUserFollowers(username, true),
      { initialProps: { username: "old_user" } },
    );

    let pending: Promise<void>;
    act(() => {
      pending = result.current.loadMore();
    });

    rerender({ username: "new_user" });
    mockUseQuery.mockReturnValue({
      data: {
        getUserFollowers: {
          users: [user("only-new")],
          total: 1,
        },
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
    rerender({ username: "new_user" });

    await act(async () => {
      resolveFetch({
        data: {
          getUserFollowers: {
            users: Array.from({ length: 20 }, (_, i) => user(`stale${i}`)),
            total: 20,
          },
        },
        error: null,
      });
      await pending!;
    });

    expect(result.current.followers.map((item) => item.username)).toEqual([
      "only-new",
    ]);
    expect(result.current.hasMore).toBe(false);
  });
});
