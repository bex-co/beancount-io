import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMutation } from "@apollo/client/react";
import { toast } from "sonner";
import { usePlaidManageAccounts } from "../use-plaid-manage-accounts";
import { usePlaidUpdateModeLinkToken } from "../use-plaid-update-mode-link-token";
import { usePlaidLinkLauncher } from "../use-plaid-link-launcher";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@apollo/client/react", () => ({
  useMutation: vi.fn(),
}));

vi.mock("@/graphql/definitions", () => ({
  ReconcilePlaidAccountsDocument: {},
  GetPlaidAccountsDocument: {},
}));

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({ t: (key: string) => key }),
}));

vi.mock("@/common/lib/errors/error-message", () => ({
  useErrorMessage: () => (error: Error) => error.message,
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

function mockReconcile(result: { addedCount: number; removedCount: number }) {
  const reconcile = vi.fn().mockResolvedValue({
    data: { reconcilePlaidAccounts: { success: true, ...result } },
  });
  mockUseMutation.mockReturnValue([
    reconcile,
    { loading: false, error: undefined },
  ] as never);
  return reconcile;
}

function mockLinkReady(linkToken: string | null = "update-link-token") {
  const createUpdateModeLinkToken = vi.fn().mockResolvedValue(undefined);
  const reset = vi.fn();
  mockUsePlaidUpdateModeLinkToken.mockReturnValue({
    linkToken,
    createUpdateModeLinkToken,
    loading: false,
    error: null,
    reset,
  });
  const openPlaidLink = vi.fn();
  mockUsePlaidLinkLauncher.mockReturnValue({
    openPlaidLink,
    ready: !!linkToken,
    error: null,
  });
  return { createUpdateModeLinkToken, reset, openPlaidLink };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockReconcile({ addedCount: 0, removedCount: 0 });
  mockLinkReady(null);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

async function completePlaidFlow(
  onSuccess?: (s: { addedCount: number; removedCount: number }) => void,
) {
  const { result } = renderHook(() =>
    usePlaidManageAccounts({
      itemId: "pitm_1",
      ledgerId: "owner/ledger",
      onSuccess,
    }),
  );

  await act(async () => {
    await result.current.manageAccounts();
  });

  const onSuccessCallback = mockUsePlaidLinkLauncher.mock
    .calls[0][1] as () => Promise<void>;

  await act(async () => {
    await onSuccessCallback();
  });

  return result;
}

describe("usePlaidManageAccounts", () => {
  it("returns idle state initially", () => {
    const { result } = renderHook(() =>
      usePlaidManageAccounts({ itemId: "pitm_1", ledgerId: "owner/ledger" }),
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("requests a link token with account selection enabled", async () => {
    const { createUpdateModeLinkToken } = mockLinkReady(null);

    const { result } = renderHook(() =>
      usePlaidManageAccounts({ itemId: "pitm_1", ledgerId: "owner/ledger" }),
    );

    await act(async () => {
      await result.current.manageAccounts();
    });

    expect(createUpdateModeLinkToken).toHaveBeenCalledWith(
      "owner/ledger",
      "pitm_1",
      true,
    );
  });

  it("opens Plaid Link once the token is ready", async () => {
    const { openPlaidLink } = mockLinkReady();

    const { result } = renderHook(() =>
      usePlaidManageAccounts({ itemId: "pitm_1", ledgerId: "owner/ledger" }),
    );

    await act(async () => {
      await result.current.manageAccounts();
    });

    expect(openPlaidLink).toHaveBeenCalledTimes(1);
  });

  it("reconciles accounts and reports the counts on Plaid success", async () => {
    const reconcile = mockReconcile({ addedCount: 2, removedCount: 1 });
    mockLinkReady();
    const onSuccess = vi.fn();

    await completePlaidFlow(onSuccess);

    expect(reconcile).toHaveBeenCalledWith({
      variables: { itemId: "pitm_1", ledgerId: "owner/ledger" },
    });
    expect(onSuccess).toHaveBeenCalledWith({ addedCount: 2, removedCount: 1 });
    expect(toast.success).toHaveBeenCalled();
  });

  it("explains the no-op instead of staying silent when nothing changed", async () => {
    mockReconcile({ addedCount: 0, removedCount: 0 });
    mockLinkReady();

    await completePlaidFlow();

    // Some institutions complete update mode without ever showing Account
    // Select; a silent success would look like the button did nothing.
    expect(toast.info).toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("never reconciles when the user backs out of Plaid Link", async () => {
    const reconcile = mockReconcile({ addedCount: 0, removedCount: 0 });
    const { reset } = mockLinkReady();

    renderHook(() =>
      usePlaidManageAccounts({ itemId: "pitm_1", ledgerId: "owner/ledger" }),
    );

    const onExitCallback = mockUsePlaidLinkLauncher.mock.calls[0][2] as (
      error: null,
    ) => void;

    act(() => {
      onExitCallback(null);
    });

    // Nothing about the selection was confirmed, so nothing may be deleted.
    expect(reconcile).not.toHaveBeenCalled();
    expect(reset).toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("surfaces an error toast when the reconcile fails", async () => {
    const reconcile = vi.fn().mockRejectedValue(new Error("boom"));
    mockUseMutation.mockReturnValue([
      reconcile,
      { loading: false, error: undefined },
    ] as never);
    mockLinkReady();

    await completePlaidFlow();

    expect(toast.error).toHaveBeenCalled();
  });
});
