import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePlaidConnection } from "../use-plaid-connection";
import { usePlaidLinkToken } from "../use-plaid-link-token";
import { usePlaidLinkLauncher } from "../use-plaid-link-launcher";
import { usePlaidTokenExchange } from "../use-plaid-token-exchange";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("../use-plaid-link-token", () => ({
  usePlaidLinkToken: vi.fn(),
}));

vi.mock("../use-plaid-link-launcher", () => ({
  usePlaidLinkLauncher: vi.fn(),
}));

vi.mock("../use-plaid-token-exchange", () => ({
  usePlaidTokenExchange: vi.fn(),
}));

const mockUsePlaidLinkToken = vi.mocked(usePlaidLinkToken);
const mockUsePlaidLinkLauncher = vi.mocked(usePlaidLinkLauncher);
const mockUsePlaidTokenExchange = vi.mocked(usePlaidTokenExchange);

function setupDefaultMocks() {
  mockUsePlaidLinkToken.mockReturnValue({
    linkToken: null,
    createLinkToken: vi.fn().mockResolvedValue(undefined),
    loading: false,
    error: null,
    reset: vi.fn(),
  });

  mockUsePlaidLinkLauncher.mockReturnValue({
    openPlaidLink: vi.fn(),
    ready: false,
    error: null,
  });

  mockUsePlaidTokenExchange.mockReturnValue({
    exchangePublicToken: vi.fn().mockResolvedValue(undefined),
    loading: false,
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

describe("usePlaidConnection", () => {
  it("returns idle state initially", () => {
    const { result } = renderHook(() =>
      usePlaidConnection({ ledgerId: "owner/ledger" }),
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.loadingMessage).toBe("Connecting...");
  });

  it("sets isLoading to true and calls createLinkToken when connect() is called", async () => {
    const mockCreateLinkToken = vi.fn().mockResolvedValue(undefined);
    mockUsePlaidLinkToken.mockReturnValue({
      linkToken: null,
      createLinkToken: mockCreateLinkToken,
      loading: false,
      error: null,
      reset: vi.fn(),
    });

    const { result } = renderHook(() =>
      usePlaidConnection({ ledgerId: "owner/ledger" }),
    );

    await act(async () => {
      await result.current.connect();
    });

    expect(mockCreateLinkToken).toHaveBeenCalledTimes(1);
  });

  it("shows 'Preparing...' loading message during token creation", async () => {
    const mockCreateLinkToken = vi
      .fn()
      .mockImplementation(() => new Promise(() => {})); // never resolves
    mockUsePlaidLinkToken.mockReturnValue({
      linkToken: null,
      createLinkToken: mockCreateLinkToken,
      loading: true,
      error: null,
      reset: vi.fn(),
    });

    const { result } = renderHook(() =>
      usePlaidConnection({ ledgerId: "owner/ledger" }),
    );

    act(() => {
      void result.current.connect();
    });

    // After calling connect, flowState becomes CREATING_TOKEN
    expect(result.current.isLoading).toBe(true);
    expect(result.current.loadingMessage).toBe("Preparing...");
  });

  it("auto-launches Plaid Link when token is ready and plaid is ready", async () => {
    const mockOpenPlaidLink = vi.fn();
    const mockCreateLinkToken = vi.fn().mockResolvedValue(undefined);

    mockUsePlaidLinkToken.mockReturnValue({
      linkToken: "link-token-abc",
      createLinkToken: mockCreateLinkToken,
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
      usePlaidConnection({ ledgerId: "owner/ledger" }),
    );

    await act(async () => {
      await result.current.connect();
    });

    expect(mockOpenPlaidLink).toHaveBeenCalledTimes(1);
  });

  it("handles successful token exchange and sets isSuccess", async () => {
    const mockExchangePublicToken = vi.fn().mockResolvedValue(undefined);
    const mockReset = vi.fn();
    const mockCreateLinkToken = vi.fn().mockResolvedValue(undefined);

    mockUsePlaidLinkToken.mockReturnValue({
      linkToken: "link-token-abc",
      createLinkToken: mockCreateLinkToken,
      loading: false,
      error: null,
      reset: mockReset,
    });

    mockUsePlaidLinkLauncher.mockReturnValue({
      openPlaidLink: vi.fn(),
      ready: true,
      error: null,
    });

    mockUsePlaidTokenExchange.mockReturnValue({
      exchangePublicToken: mockExchangePublicToken,
      loading: false,
      error: null,
    });

    const { result } = renderHook(() =>
      usePlaidConnection({ ledgerId: "owner/ledger" }),
    );

    // Start the connection flow
    await act(async () => {
      await result.current.connect();
    });

    // The onPlaidSuccess callback is created inside the hook, so we need to
    // simulate the Plaid Link success by calling it through the launcher's callback.
    // We capture the onSuccess callback passed to usePlaidLinkLauncher.
    const launcherCallArgs = mockUsePlaidLinkLauncher.mock.calls[0];
    const onSuccessCallback = launcherCallArgs[1] as (
      publicToken: string,
    ) => Promise<void>;

    await act(async () => {
      await onSuccessCallback("public-token-xyz");
    });

    expect(mockExchangePublicToken).toHaveBeenCalledWith(
      "owner/ledger",
      "public-token-xyz",
    );
    expect(result.current.isSuccess).toBe(true);
  });

  it("resets to IDLE after success via setTimeout", async () => {
    const mockExchangePublicToken = vi.fn().mockResolvedValue(undefined);
    const mockReset = vi.fn();
    const mockCreateLinkToken = vi.fn().mockResolvedValue(undefined);

    mockUsePlaidLinkToken.mockReturnValue({
      linkToken: "link-token-abc",
      createLinkToken: mockCreateLinkToken,
      loading: false,
      error: null,
      reset: mockReset,
    });

    mockUsePlaidLinkLauncher.mockReturnValue({
      openPlaidLink: vi.fn(),
      ready: true,
      error: null,
    });

    mockUsePlaidTokenExchange.mockReturnValue({
      exchangePublicToken: mockExchangePublicToken,
      loading: false,
      error: null,
    });

    const { result } = renderHook(() =>
      usePlaidConnection({ ledgerId: "owner/ledger" }),
    );

    await act(async () => {
      await result.current.connect();
    });

    const launcherCallArgs = mockUsePlaidLinkLauncher.mock.calls[0];
    const onSuccessCallback = launcherCallArgs[1] as (
      publicToken: string,
    ) => Promise<void>;

    await act(async () => {
      await onSuccessCallback("public-token-xyz");
    });

    expect(result.current.isSuccess).toBe(true);

    // Advance timer past the 100ms reset timeout
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    expect(mockReset).toHaveBeenCalled();
  });

  it("shows toast error by default when error occurs", async () => {
    const { toast } = await import("sonner");
    const testError = new Error("Connection failed");
    const mockReset = vi.fn();

    mockUsePlaidTokenExchange.mockReturnValue({
      exchangePublicToken: vi.fn().mockRejectedValue(testError),
      loading: false,
      error: testError,
    });

    mockUsePlaidLinkToken.mockReturnValue({
      linkToken: null,
      createLinkToken: vi.fn().mockResolvedValue(undefined),
      loading: false,
      error: null,
      reset: mockReset,
    });

    renderHook(() => usePlaidConnection({ ledgerId: "owner/ledger" }));

    // Allow the error effect to run
    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(toast.error).toHaveBeenCalledWith("Connection Failed", {
      description: "Something went wrong. Please try again.",
      duration: 6000,
    });
  });

  it("calls custom onError handler instead of toast when provided", async () => {
    const { toast } = await import("sonner");
    const testError = new Error("Custom error");
    const customOnError = vi.fn();

    mockUsePlaidTokenExchange.mockReturnValue({
      exchangePublicToken: vi.fn(),
      loading: false,
      error: testError,
    });

    mockUsePlaidLinkToken.mockReturnValue({
      linkToken: null,
      createLinkToken: vi.fn().mockResolvedValue(undefined),
      loading: false,
      error: null,
      reset: vi.fn(),
    });

    renderHook(() =>
      usePlaidConnection({ ledgerId: "owner/ledger", onError: customOnError }),
    );

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(customOnError).toHaveBeenCalledWith(testError);
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("shows specific 'Connection Already Exists' toast for duplicate institution errors", async () => {
    const { toast } = await import("sonner");
    const duplicateError = new Error(
      "You already have an active connection to Chase Bank. Please unlink the existing connection first.",
    );

    mockUsePlaidTokenExchange.mockReturnValue({
      exchangePublicToken: vi.fn(),
      loading: false,
      error: duplicateError,
    });

    mockUsePlaidLinkToken.mockReturnValue({
      linkToken: null,
      createLinkToken: vi.fn().mockResolvedValue(undefined),
      loading: false,
      error: null,
      reset: vi.fn(),
    });

    renderHook(() => usePlaidConnection({ ledgerId: "owner/ledger" }));

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(toast.error).toHaveBeenCalledWith(
      "Connection Already Exists",
      expect.objectContaining({
        description: expect.stringContaining("Chase Bank"),
      }),
    );
  });

  it("does not call connect again if already in CREATING_TOKEN state", async () => {
    const mockCreateLinkToken = vi
      .fn()
      .mockImplementation(() => new Promise(() => {})); // never resolves

    mockUsePlaidLinkToken.mockReturnValue({
      linkToken: null,
      createLinkToken: mockCreateLinkToken,
      loading: true,
      error: null,
      reset: vi.fn(),
    });

    const { result } = renderHook(() =>
      usePlaidConnection({ ledgerId: "owner/ledger" }),
    );

    act(() => {
      void result.current.connect();
    });

    // Try connecting again while still in CREATING_TOKEN state
    act(() => {
      void result.current.connect();
    });

    // Should only have been called once
    expect(mockCreateLinkToken).toHaveBeenCalledTimes(1);
  });

  it("resets flow when user exits Plaid Link without error", () => {
    const mockReset = vi.fn();

    mockUsePlaidLinkToken.mockReturnValue({
      linkToken: "link-token",
      createLinkToken: vi.fn(),
      loading: false,
      error: null,
      reset: mockReset,
    });

    mockUsePlaidLinkLauncher.mockReturnValue({
      openPlaidLink: vi.fn(),
      ready: true,
      error: null,
    });

    renderHook(() => usePlaidConnection({ ledgerId: "owner/ledger" }));

    // Simulate user exiting Plaid Link without error
    const launcherCallArgs = mockUsePlaidLinkLauncher.mock.calls[0];
    const onExitCallback = launcherCallArgs[2] as (error: null) => void;

    act(() => {
      onExitCallback(null);
    });

    expect(mockReset).toHaveBeenCalled();
  });
});
