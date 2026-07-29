import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMutation } from "@apollo/client/react";
import { usePlaidTokenExchange } from "../use-plaid-token-exchange";

vi.mock("@apollo/client/react", () => ({
  useMutation: vi.fn(),
}));

vi.mock("@/graphql/definitions", () => ({
  ExchangePlaidPublicTokenDocument: {},
  GetPlaidItemsDocument: {},
}));

const mockUseMutation = vi.mocked(useMutation);

beforeEach(() => {
  vi.clearAllMocks();
  mockUseMutation.mockReturnValue([vi.fn(), { loading: false }] as never);
});

describe("usePlaidTokenExchange", () => {
  it("returns no error and not loading initially", () => {
    const { result } = renderHook(() => usePlaidTokenExchange());
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("calls mutation with correct publicToken variable", async () => {
    const mockMutate = vi.fn().mockResolvedValue({});
    mockUseMutation.mockReturnValue([mockMutate, { loading: false }] as never);

    const { result } = renderHook(() => usePlaidTokenExchange());
    await act(async () => {
      await result.current.exchangePublicToken(
        "owner/ledger",
        "public-token-xyz",
      );
    });

    expect(mockMutate).toHaveBeenCalledWith({
      variables: { ledgerId: "owner/ledger", publicToken: "public-token-xyz" },
    });
  });

  it("clears error on successful mutation via onCompleted", () => {
    let capturedOnError: ((err: Error) => void) | undefined;
    let capturedOnCompleted: (() => void) | undefined;
    mockUseMutation.mockImplementation((_, options) => {
      capturedOnError = options?.onError as (err: Error) => void;
      capturedOnCompleted = options?.onCompleted as () => void;
      return [vi.fn(), { loading: false }];
    });

    const { result } = renderHook(() => usePlaidTokenExchange());

    // Set an error first
    act(() => {
      capturedOnError?.(new Error("exchange failed"));
    });
    expect(result.current.error).not.toBeNull();

    // Then simulate success
    act(() => {
      capturedOnCompleted?.();
    });
    expect(result.current.error).toBeNull();
  });

  it("sets error on mutation failure via onError", () => {
    const testError = new Error("Exchange failed");
    let capturedOnError: ((err: Error) => void) | undefined;
    mockUseMutation.mockImplementation((_, options) => {
      capturedOnError = options?.onError as (err: Error) => void;
      return [vi.fn(), { loading: false }];
    });

    const { result } = renderHook(() => usePlaidTokenExchange());

    act(() => {
      capturedOnError?.(testError);
    });

    expect(result.current.error).toBe(testError);
  });

  it("reflects loading state from mutation", () => {
    mockUseMutation.mockReturnValue([vi.fn(), { loading: true }] as never);
    const { result } = renderHook(() => usePlaidTokenExchange());
    expect(result.current.loading).toBe(true);
  });

  it("clears error before calling mutation", async () => {
    let capturedOnError: ((err: Error) => void) | undefined;
    const mockMutate = vi.fn().mockResolvedValue({});
    mockUseMutation.mockImplementation((_, options) => {
      capturedOnError = options?.onError as (err: Error) => void;
      return [mockMutate, { loading: false }];
    });

    const { result } = renderHook(() => usePlaidTokenExchange());

    // Set an error first
    act(() => {
      capturedOnError?.(new Error("previous error"));
    });
    expect(result.current.error).not.toBeNull();

    // exchangePublicToken should clear the error
    await act(async () => {
      await result.current.exchangePublicToken("owner/ledger", "token");
    });

    expect(result.current.error).toBeNull();
  });
});
