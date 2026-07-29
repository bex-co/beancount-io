import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMutation } from "@apollo/client/react";
import { usePlaidUpdateModeLinkToken } from "../use-plaid-update-mode-link-token";

vi.mock("@apollo/client/react", () => ({
  useMutation: vi.fn(),
}));

vi.mock("@/graphql/definitions", () => ({
  CreatePlaidUpdateModeLinkTokenDocument: {},
}));

const mockUseMutation = vi.mocked(useMutation);

beforeEach(() => {
  vi.clearAllMocks();
  mockUseMutation.mockReturnValue([vi.fn(), { loading: false }] as never);
});

describe("usePlaidUpdateModeLinkToken", () => {
  it("returns null linkToken and no error initially", () => {
    const { result } = renderHook(() => usePlaidUpdateModeLinkToken());
    expect(result.current.linkToken).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("calls mutation with itemId variable when createUpdateModeLinkToken is invoked", async () => {
    const mockMutate = vi.fn().mockResolvedValue({});
    mockUseMutation.mockReturnValue([mockMutate, { loading: false }] as never);

    const { result } = renderHook(() => usePlaidUpdateModeLinkToken());
    await act(async () => {
      await result.current.createUpdateModeLinkToken(
        "owner/ledger",
        "item-123",
      );
    });

    expect(mockMutate).toHaveBeenCalledWith({
      variables: { itemId: "item-123", ledgerId: "owner/ledger" },
    });
  });

  it("sets linkToken on successful mutation via onCompleted", () => {
    let capturedOnCompleted: ((data: unknown) => void) | undefined;
    mockUseMutation.mockImplementation((_, options) => {
      capturedOnCompleted = options?.onCompleted as (data: unknown) => void;
      return [vi.fn(), { loading: false }];
    });

    const { result } = renderHook(() => usePlaidUpdateModeLinkToken());

    act(() => {
      capturedOnCompleted?.({
        createPlaidUpdateModeLinkToken: { linkToken: "update-link-token-xyz" },
      });
    });

    expect(result.current.linkToken).toBe("update-link-token-xyz");
    expect(result.current.error).toBeNull();
  });

  it("sets error on mutation failure via onError", () => {
    const testError = new Error("Failed to create update mode token");
    let capturedOnError: ((err: Error) => void) | undefined;
    mockUseMutation.mockImplementation((_, options) => {
      capturedOnError = options?.onError as (err: Error) => void;
      return [vi.fn(), { loading: false }];
    });

    const { result } = renderHook(() => usePlaidUpdateModeLinkToken());

    act(() => {
      capturedOnError?.(testError);
    });

    expect(result.current.error).toBe(testError);
    expect(result.current.linkToken).toBeNull();
  });

  it("resets linkToken and error when reset is called", () => {
    let capturedOnCompleted: ((data: unknown) => void) | undefined;
    mockUseMutation.mockImplementation((_, options) => {
      capturedOnCompleted = options?.onCompleted as (data: unknown) => void;
      return [vi.fn(), { loading: false }];
    });

    const { result } = renderHook(() => usePlaidUpdateModeLinkToken());

    act(() => {
      capturedOnCompleted?.({
        createPlaidUpdateModeLinkToken: { linkToken: "update-link-token-xyz" },
      });
    });
    expect(result.current.linkToken).toBe("update-link-token-xyz");

    act(() => {
      result.current.reset();
    });

    expect(result.current.linkToken).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("reflects loading state from mutation", () => {
    mockUseMutation.mockReturnValue([vi.fn(), { loading: true }] as never);
    const { result } = renderHook(() => usePlaidUpdateModeLinkToken());
    expect(result.current.loading).toBe(true);
  });

  it("clears error before calling mutation", async () => {
    let capturedOnError: ((err: Error) => void) | undefined;
    const mockMutate = vi.fn().mockResolvedValue({});
    mockUseMutation.mockImplementation((_, options) => {
      capturedOnError = options?.onError as (err: Error) => void;
      return [mockMutate, { loading: false }];
    });

    const { result } = renderHook(() => usePlaidUpdateModeLinkToken());

    act(() => {
      capturedOnError?.(new Error("previous error"));
    });
    expect(result.current.error).not.toBeNull();

    await act(async () => {
      await result.current.createUpdateModeLinkToken(
        "owner/ledger",
        "item-abc",
      );
    });

    expect(result.current.error).toBeNull();
  });
});
