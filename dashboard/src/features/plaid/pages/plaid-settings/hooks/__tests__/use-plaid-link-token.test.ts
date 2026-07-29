import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMutation } from "@apollo/client/react";
import { usePlaidLinkToken } from "../use-plaid-link-token";

vi.mock("@apollo/client/react", () => ({
  useMutation: vi.fn(),
}));

vi.mock("@/graphql/definitions", () => ({
  CreatePlaidLinkTokenDocument: {},
}));

const mockUseMutation = vi.mocked(useMutation);

beforeEach(() => {
  vi.clearAllMocks();
  mockUseMutation.mockReturnValue([vi.fn(), { loading: false }] as never);
});

describe("usePlaidLinkToken", () => {
  it("returns null linkToken and no error initially", () => {
    const { result } = renderHook(() => usePlaidLinkToken());
    expect(result.current.linkToken).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("calls mutation when createLinkToken is invoked", async () => {
    const mockMutate = vi.fn().mockResolvedValue({});
    mockUseMutation.mockReturnValue([mockMutate, { loading: false }] as never);

    const { result } = renderHook(() => usePlaidLinkToken());
    await act(async () => {
      await result.current.createLinkToken("owner/ledger");
    });

    expect(mockMutate).toHaveBeenCalledTimes(1);
  });

  it("sets linkToken on successful mutation via onCompleted", () => {
    let capturedOnCompleted: ((data: unknown) => void) | undefined;
    mockUseMutation.mockImplementation((_, options) => {
      capturedOnCompleted = options?.onCompleted as (data: unknown) => void;
      return [vi.fn(), { loading: false }];
    });

    const { result } = renderHook(() => usePlaidLinkToken());

    act(() => {
      capturedOnCompleted?.({
        createPlaidLinkToken: { linkToken: "link-token-abc" },
      });
    });

    expect(result.current.linkToken).toBe("link-token-abc");
    expect(result.current.error).toBeNull();
  });

  it("sets error on mutation failure via onError", () => {
    const testError = new Error("Network error");
    let capturedOnError: ((err: Error) => void) | undefined;
    mockUseMutation.mockImplementation((_, options) => {
      capturedOnError = options?.onError as (err: Error) => void;
      return [vi.fn(), { loading: false }];
    });

    const { result } = renderHook(() => usePlaidLinkToken());

    act(() => {
      capturedOnError?.(testError);
    });

    expect(result.current.error).toBe(testError);
    expect(result.current.linkToken).toBeNull();
  });

  it("resets linkToken and error when reset is called", () => {
    let capturedOnCompleted: ((data: unknown) => void) | undefined;
    let capturedOnError: ((err: Error) => void) | undefined;
    mockUseMutation.mockImplementation((_, options) => {
      capturedOnCompleted = options?.onCompleted as (data: unknown) => void;
      capturedOnError = options?.onError as (err: Error) => void;
      return [vi.fn(), { loading: false }];
    });

    const { result } = renderHook(() => usePlaidLinkToken());

    act(() => {
      capturedOnCompleted?.({
        createPlaidLinkToken: { linkToken: "link-token-abc" },
      });
    });
    expect(result.current.linkToken).toBe("link-token-abc");

    act(() => {
      result.current.reset();
    });

    expect(result.current.linkToken).toBeNull();
    expect(result.current.error).toBeNull();

    // Also test reset clears error
    act(() => {
      capturedOnError?.(new Error("some error"));
    });
    act(() => {
      result.current.reset();
    });
    expect(result.current.error).toBeNull();
  });

  it("reflects loading state from mutation", () => {
    mockUseMutation.mockReturnValue([vi.fn(), { loading: true }] as never);
    const { result } = renderHook(() => usePlaidLinkToken());
    expect(result.current.loading).toBe(true);
  });

  it("clears error before calling mutation", async () => {
    let capturedOnError: ((err: Error) => void) | undefined;
    const mockMutate = vi.fn().mockResolvedValue({});
    mockUseMutation.mockImplementation((_, options) => {
      capturedOnError = options?.onError as (err: Error) => void;
      return [mockMutate, { loading: false }];
    });

    const { result } = renderHook(() => usePlaidLinkToken());

    // Set an error first
    act(() => {
      capturedOnError?.(new Error("previous error"));
    });
    expect(result.current.error).not.toBeNull();

    // createLinkToken should clear the error
    await act(async () => {
      await result.current.createLinkToken("owner/ledger");
    });

    expect(result.current.error).toBeNull();
  });
});
