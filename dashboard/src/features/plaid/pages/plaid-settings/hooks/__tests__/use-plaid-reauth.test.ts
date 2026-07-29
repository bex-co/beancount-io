import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMutation } from "@apollo/client/react";
import { usePlaidReauth } from "../use-plaid-reauth";
import { usePlaidUpdateModeLinkToken } from "../use-plaid-update-mode-link-token";
import { usePlaidLinkLauncher } from "../use-plaid-link-launcher";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("@apollo/client/react", () => ({
  useMutation: vi.fn(),
}));

vi.mock("@/graphql/definitions", () => ({
  RefreshPlaidItemStatusDocument: { __doc: "refresh" },
  ReconcilePlaidAccountsDocument: { __doc: "reconcile" },
  GetPlaidAccountsDocument: { __doc: "getAccounts" },
}));

vi.mock("../use-plaid-update-mode-link-token", () => ({
  usePlaidUpdateModeLinkToken: vi.fn(),
}));

vi.mock("../use-plaid-link-launcher", () => ({
  usePlaidLinkLauncher: vi.fn(),
}));

const mockUseMutation = vi.mocked(useMutation);
const mockUsePlaidUpdateModeLinkToken = vi.mocked(usePlaidUpdateModeLinkToken);
const mockUsePlaidLinkLauncher = vi.mocked(usePlaidLinkLauncher);

function setupDefaultMocks() {
  mockUseMutation.mockReturnValue([
    vi.fn().mockResolvedValue({}),
    { loading: false, error: undefined },
  ] as never);

  mockUsePlaidUpdateModeLinkToken.mockReturnValue({
    linkToken: null,
    createUpdateModeLinkToken: vi.fn().mockResolvedValue(undefined),
    loading: false,
    error: null,
    reset: vi.fn(),
  });

  mockUsePlaidLinkLauncher.mockReturnValue({
    openPlaidLink: vi.fn(),
    ready: false,
    error: null,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  setupDefaultMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("usePlaidReauth", () => {
  it("returns idle state initially", () => {
    const { result } = renderHook(() =>
      usePlaidReauth({ itemId: "item-123", ledgerId: "owner/ledger" }),
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.loadingMessage).toBe("Reconnecting...");
  });

  it("calls createUpdateModeLinkToken with itemId when reconnect() is invoked", async () => {
    const mockCreateUpdateModeLinkToken = vi.fn().mockResolvedValue(undefined);
    mockUsePlaidUpdateModeLinkToken.mockReturnValue({
      linkToken: null,
      createUpdateModeLinkToken: mockCreateUpdateModeLinkToken,
      loading: false,
      error: null,
      reset: vi.fn(),
    });

    const { result } = renderHook(() =>
      usePlaidReauth({ itemId: "item-456", ledgerId: "owner/ledger" }),
    );

    await act(async () => {
      await result.current.reconnect();
    });

    expect(mockCreateUpdateModeLinkToken).toHaveBeenCalledWith(
      "owner/ledger",
      "item-456",
    );
  });

  it("sets isLoading to true after reconnect() is called", async () => {
    const mockCreateUpdateModeLinkToken = vi
      .fn()
      .mockImplementation(() => new Promise(() => {})); // never resolves

    mockUsePlaidUpdateModeLinkToken.mockReturnValue({
      linkToken: null,
      createUpdateModeLinkToken: mockCreateUpdateModeLinkToken,
      loading: true,
      error: null,
      reset: vi.fn(),
    });

    const { result } = renderHook(() =>
      usePlaidReauth({ itemId: "item-123", ledgerId: "owner/ledger" }),
    );

    act(() => {
      void result.current.reconnect();
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.loadingMessage).toBe("Preparing...");
  });

  it("auto-launches Plaid Link when token and plaid are ready", async () => {
    const mockOpenPlaidLink = vi.fn();
    const mockCreateUpdateModeLinkToken = vi.fn().mockResolvedValue(undefined);

    mockUsePlaidUpdateModeLinkToken.mockReturnValue({
      linkToken: "update-link-token",
      createUpdateModeLinkToken: mockCreateUpdateModeLinkToken,
      loading: false,
      error: null,
      reset: vi.fn(),
    });

    mockUsePlaidLinkLauncher.mockReturnValue({
      openPlaidLink: mockOpenPlaidLink,
      ready: true,
      error: null,
    });

    const { result } = renderHook(() =>
      usePlaidReauth({ itemId: "item-123", ledgerId: "owner/ledger" }),
    );

    await act(async () => {
      await result.current.reconnect();
    });

    expect(mockOpenPlaidLink).toHaveBeenCalledTimes(1);
  });

  it("calls refreshItemStatus mutation on Plaid success", async () => {
    const mockRefreshItemStatus = vi.fn().mockResolvedValue({});
    mockUseMutation.mockReturnValue([
      mockRefreshItemStatus,
      { loading: false, error: undefined },
    ] as never);

    mockUsePlaidUpdateModeLinkToken.mockReturnValue({
      linkToken: "update-link-token",
      createUpdateModeLinkToken: vi.fn().mockResolvedValue(undefined),
      loading: false,
      error: null,
      reset: vi.fn(),
    });

    mockUsePlaidLinkLauncher.mockReturnValue({
      openPlaidLink: vi.fn(),
      ready: true,
      error: null,
    });

    const { result } = renderHook(() =>
      usePlaidReauth({ itemId: "item-123", ledgerId: "owner/ledger" }),
    );

    await act(async () => {
      await result.current.reconnect();
    });

    // Simulate Plaid Link success
    const launcherCallArgs = mockUsePlaidLinkLauncher.mock.calls[0];
    const onSuccessCallback = launcherCallArgs[1] as () => Promise<void>;

    await act(async () => {
      await onSuccessCallback();
    });

    expect(mockRefreshItemStatus).toHaveBeenCalledWith({
      variables: { itemId: "item-123", ledgerId: "owner/ledger" },
    });
  });

  it("calls onSuccess callback after successful reauthentication", async () => {
    const mockOnSuccess = vi.fn();
    mockUseMutation.mockReturnValue([
      vi.fn().mockResolvedValue({}),
      { loading: false, error: undefined },
    ] as never);

    mockUsePlaidUpdateModeLinkToken.mockReturnValue({
      linkToken: "update-link-token",
      createUpdateModeLinkToken: vi.fn().mockResolvedValue(undefined),
      loading: false,
      error: null,
      reset: vi.fn(),
    });

    mockUsePlaidLinkLauncher.mockReturnValue({
      openPlaidLink: vi.fn(),
      ready: true,
      error: null,
    });

    const { result } = renderHook(() =>
      usePlaidReauth({
        itemId: "item-123",
        ledgerId: "owner/ledger",
        onSuccess: mockOnSuccess,
      }),
    );

    await act(async () => {
      await result.current.reconnect();
    });

    const launcherCallArgs = mockUsePlaidLinkLauncher.mock.calls[0];
    const onSuccessCallback = launcherCallArgs[1] as () => Promise<void>;

    await act(async () => {
      await onSuccessCallback();
    });

    expect(mockOnSuccess).toHaveBeenCalledTimes(1);
  });

  it("shows success toast after successful reauthentication", async () => {
    const { toast } = await import("sonner");
    mockUseMutation.mockReturnValue([
      vi.fn().mockResolvedValue({}),
      { loading: false, error: undefined },
    ] as never);

    mockUsePlaidUpdateModeLinkToken.mockReturnValue({
      linkToken: "update-link-token",
      createUpdateModeLinkToken: vi.fn().mockResolvedValue(undefined),
      loading: false,
      error: null,
      reset: vi.fn(),
    });

    mockUsePlaidLinkLauncher.mockReturnValue({
      openPlaidLink: vi.fn(),
      ready: true,
      error: null,
    });

    const { result } = renderHook(() =>
      usePlaidReauth({ itemId: "item-123", ledgerId: "owner/ledger" }),
    );

    await act(async () => {
      await result.current.reconnect();
    });

    const launcherCallArgs = mockUsePlaidLinkLauncher.mock.calls[0];
    const onSuccessCallback = launcherCallArgs[1] as () => Promise<void>;

    await act(async () => {
      await onSuccessCallback();
    });

    expect(toast.success).toHaveBeenCalledWith(
      "Bank Reconnected",
      expect.objectContaining({
        description: expect.stringContaining("reconnected"),
      }),
    );
  });

  it("sets isSuccess=true after successful reauthentication and resets after timeout", async () => {
    const mockReset = vi.fn();
    mockUseMutation.mockReturnValue([
      vi.fn().mockResolvedValue({}),
      { loading: false, error: undefined },
    ] as never);

    mockUsePlaidUpdateModeLinkToken.mockReturnValue({
      linkToken: "update-link-token",
      createUpdateModeLinkToken: vi.fn().mockResolvedValue(undefined),
      loading: false,
      error: null,
      reset: mockReset,
    });

    mockUsePlaidLinkLauncher.mockReturnValue({
      openPlaidLink: vi.fn(),
      ready: true,
      error: null,
    });

    const { result } = renderHook(() =>
      usePlaidReauth({ itemId: "item-123", ledgerId: "owner/ledger" }),
    );

    await act(async () => {
      await result.current.reconnect();
    });

    const launcherCallArgs = mockUsePlaidLinkLauncher.mock.calls[0];
    const onSuccessCallback = launcherCallArgs[1] as () => Promise<void>;

    await act(async () => {
      await onSuccessCallback();
    });

    // isSuccess should be true before the 100ms reset timeout fires
    expect(result.current.isSuccess).toBe(true);

    // Advance timers past the 100ms reset timeout
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    expect(mockReset).toHaveBeenCalled();
  });

  it("shows toast error by default when token error occurs", async () => {
    const { toast } = await import("sonner");
    const testError = new Error("Failed to create update mode token");

    mockUsePlaidUpdateModeLinkToken.mockReturnValue({
      linkToken: null,
      createUpdateModeLinkToken: vi.fn().mockResolvedValue(undefined),
      loading: false,
      error: testError,
      reset: vi.fn(),
    });

    renderHook(() =>
      usePlaidReauth({ itemId: "item-123", ledgerId: "owner/ledger" }),
    );

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(toast.error).toHaveBeenCalledWith("Reconnection Failed", {
      description: "Something went wrong. Please try again.",
      duration: 6000,
    });
  });

  it("calls custom onError handler instead of toast when provided", async () => {
    const { toast } = await import("sonner");
    const testError = new Error("Custom error");
    const customOnError = vi.fn();

    mockUsePlaidUpdateModeLinkToken.mockReturnValue({
      linkToken: null,
      createUpdateModeLinkToken: vi.fn(),
      loading: false,
      error: testError,
      reset: vi.fn(),
    });

    renderHook(() =>
      usePlaidReauth({
        itemId: "item-123",
        ledgerId: "owner/ledger",
        onError: customOnError,
      }),
    );

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(customOnError).toHaveBeenCalledWith(testError);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("does not call reconnect again if already in CREATING_TOKEN state", async () => {
    const mockCreateUpdateModeLinkToken = vi
      .fn()
      .mockImplementation(() => new Promise(() => {})); // never resolves

    mockUsePlaidUpdateModeLinkToken.mockReturnValue({
      linkToken: null,
      createUpdateModeLinkToken: mockCreateUpdateModeLinkToken,
      loading: true,
      error: null,
      reset: vi.fn(),
    });

    const { result } = renderHook(() =>
      usePlaidReauth({ itemId: "item-123", ledgerId: "owner/ledger" }),
    );

    act(() => {
      void result.current.reconnect();
    });

    // Try reconnecting again while still in CREATING_TOKEN state
    act(() => {
      void result.current.reconnect();
    });

    expect(mockCreateUpdateModeLinkToken).toHaveBeenCalledTimes(1);
  });

  it("resets flow when user exits Plaid Link without error", () => {
    const mockReset = vi.fn();

    mockUsePlaidUpdateModeLinkToken.mockReturnValue({
      linkToken: "update-link-token",
      createUpdateModeLinkToken: vi.fn(),
      loading: false,
      error: null,
      reset: mockReset,
    });

    mockUsePlaidLinkLauncher.mockReturnValue({
      openPlaidLink: vi.fn(),
      ready: true,
      error: null,
    });

    renderHook(() =>
      usePlaidReauth({ itemId: "item-123", ledgerId: "owner/ledger" }),
    );

    // Simulate user exiting without completing
    const launcherCallArgs = mockUsePlaidLinkLauncher.mock.calls[0];
    const onExitCallback = launcherCallArgs[2] as (error: null) => void;

    act(() => {
      onExitCallback(null);
    });

    expect(mockReset).toHaveBeenCalled();
  });

  describe("account reconcile after reauth", () => {
    // At most OAuth institutions update mode always shows Account Select, so a
    // plain reconnect can change which accounts are shared. These pin down that
    // we notice, and that noticing can never break the reconnect itself.
    function setupSplitMutations(overrides?: {
      refresh?: ReturnType<typeof vi.fn>;
      reconcile?: ReturnType<typeof vi.fn>;
    }) {
      const refresh = overrides?.refresh ?? vi.fn().mockResolvedValue({});
      const reconcile = overrides?.reconcile ?? vi.fn().mockResolvedValue({});

      mockUseMutation.mockImplementation(
        (document: unknown) =>
          [
            (document as { __doc?: string })?.__doc === "reconcile"
              ? reconcile
              : refresh,
            { loading: false, error: undefined },
          ] as never,
      );

      mockUsePlaidUpdateModeLinkToken.mockReturnValue({
        linkToken: "update-link-token",
        createUpdateModeLinkToken: vi.fn().mockResolvedValue(undefined),
        loading: false,
        error: null,
        reset: vi.fn(),
      });

      mockUsePlaidLinkLauncher.mockReturnValue({
        openPlaidLink: vi.fn(),
        ready: true,
        error: null,
      });

      return { refresh, reconcile };
    }

    async function completePlaidFlow(onSuccess?: () => void) {
      const { result } = renderHook(() =>
        usePlaidReauth({
          itemId: "item-123",
          ledgerId: "owner/ledger",
          onSuccess,
        }),
      );

      await act(async () => {
        await result.current.reconnect();
      });

      const launcherCallArgs = mockUsePlaidLinkLauncher.mock.calls[0];
      const onSuccessCallback = launcherCallArgs[1] as () => Promise<void>;

      await act(async () => {
        await onSuccessCallback();
      });

      return result;
    }

    it("reconciles accounts after refreshing item status", async () => {
      const { refresh, reconcile } = setupSplitMutations();

      await completePlaidFlow();

      expect(refresh).toHaveBeenCalledWith({
        variables: { itemId: "item-123", ledgerId: "owner/ledger" },
      });
      expect(reconcile).toHaveBeenCalledWith({
        variables: { itemId: "item-123", ledgerId: "owner/ledger" },
      });
      expect(refresh.mock.invocationCallOrder[0]).toBeLessThan(
        reconcile.mock.invocationCallOrder[0],
      );
    });

    it("still reports success when the reconcile fails", async () => {
      setupSplitMutations({
        reconcile: vi.fn().mockRejectedValue(new Error("reconcile boom")),
      });
      const onSuccess = vi.fn();

      const result = await completePlaidFlow(onSuccess);

      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(result.current.error).toBeNull();
    });

    it("does not reconcile when the user exits without completing", async () => {
      const { reconcile } = setupSplitMutations();

      renderHook(() =>
        usePlaidReauth({ itemId: "item-123", ledgerId: "owner/ledger" }),
      );

      const launcherCallArgs = mockUsePlaidLinkLauncher.mock.calls[0];
      const onExitCallback = launcherCallArgs[2] as (error: null) => void;

      act(() => {
        onExitCallback(null);
      });

      expect(reconcile).not.toHaveBeenCalled();
    });
  });
});
