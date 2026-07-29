import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePlaidLink as usePlaidLinkSDK } from "react-plaid-link";
import { usePlaidLinkLauncher } from "../use-plaid-link-launcher";

vi.mock("react-plaid-link", () => ({
  usePlaidLink: vi.fn(),
}));

const mockUsePlaidLinkSDK = vi.mocked(usePlaidLinkSDK);

beforeEach(() => {
  vi.clearAllMocks();
  mockUsePlaidLinkSDK.mockReturnValue({
    open: vi.fn(),
    ready: false,
    error: null,
    exit: vi.fn(),
  });
});

describe("usePlaidLinkLauncher", () => {
  it("returns ready=false when linkToken is null", () => {
    const { result } = renderHook(() => usePlaidLinkLauncher(null, vi.fn()));
    expect(result.current.ready).toBe(false);
  });

  it("returns ready=false when SDK not ready even with a token", () => {
    mockUsePlaidLinkSDK.mockReturnValue({
      open: vi.fn(),
      ready: false,
      error: null,
      exit: vi.fn(),
    });

    const { result } = renderHook(() =>
      usePlaidLinkLauncher("link-token", vi.fn()),
    );
    expect(result.current.ready).toBe(false);
  });

  it("returns ready=true when SDK is ready and token is present", () => {
    mockUsePlaidLinkSDK.mockReturnValue({
      open: vi.fn(),
      ready: true,
      error: null,
      exit: vi.fn(),
    });

    const { result } = renderHook(() =>
      usePlaidLinkLauncher("link-token", vi.fn()),
    );
    expect(result.current.ready).toBe(true);
  });

  it("calls open() when openPlaidLink is invoked with valid token and ready state", () => {
    const mockOpen = vi.fn();
    mockUsePlaidLinkSDK.mockReturnValue({
      open: mockOpen,
      ready: true,
      error: null,
      exit: vi.fn(),
    });

    const { result } = renderHook(() =>
      usePlaidLinkLauncher("link-token", vi.fn()),
    );

    act(() => {
      result.current.openPlaidLink();
    });

    expect(mockOpen).toHaveBeenCalledTimes(1);
  });

  it("does not call open() when token is null", () => {
    const mockOpen = vi.fn();
    mockUsePlaidLinkSDK.mockReturnValue({
      open: mockOpen,
      ready: true,
      error: null,
      exit: vi.fn(),
    });

    const { result } = renderHook(() => usePlaidLinkLauncher(null, vi.fn()));

    act(() => {
      result.current.openPlaidLink();
    });

    expect(mockOpen).not.toHaveBeenCalled();
  });

  it("does not call open() when SDK not ready", () => {
    const mockOpen = vi.fn();
    mockUsePlaidLinkSDK.mockReturnValue({
      open: mockOpen,
      ready: false,
      error: null,
      exit: vi.fn(),
    });

    const { result } = renderHook(() =>
      usePlaidLinkLauncher("link-token", vi.fn()),
    );

    act(() => {
      result.current.openPlaidLink();
    });

    expect(mockOpen).not.toHaveBeenCalled();
  });

  it("passes onSuccess and onExit callbacks to SDK", () => {
    const onSuccess = vi.fn();
    const onExit = vi.fn();

    renderHook(() => usePlaidLinkLauncher("link-token", onSuccess, onExit));

    expect(mockUsePlaidLinkSDK).toHaveBeenCalledWith(
      expect.objectContaining({
        token: "link-token",
        onSuccess,
        onExit,
      }),
    );
  });

  it("exposes SDK error", () => {
    const sdkError = {
      error_type: "ITEM_ERROR",
      error_code: "INVALID_CREDENTIALS",
      error_message: "Invalid credentials",
      display_message: "Your credentials are invalid.",
    };
    mockUsePlaidLinkSDK.mockReturnValue({
      open: vi.fn(),
      ready: false,
      error: sdkError,
      exit: vi.fn(),
    });

    const { result } = renderHook(() =>
      usePlaidLinkLauncher("link-token", vi.fn()),
    );

    expect(result.current.error).toBe(sdkError);
  });
});
