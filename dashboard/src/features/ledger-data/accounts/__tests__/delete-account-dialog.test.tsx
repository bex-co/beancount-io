import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useQuery, useMutation } from "@apollo/client/react";
import { toast } from "sonner";
import { DeleteAccountDialog } from "../delete-account-dialog";
import type { AccountDirective } from "../types";

vi.mock("@apollo/client/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

vi.mock("@/common/hooks/use-theme", () => ({
  useIsDarkTheme: () => false,
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/common/lib/editor/monaco-beancount-language-vscode", () => ({
  registerBeancountLanguage: vi.fn(),
}));

const mockUseQuery = vi.mocked(useQuery);
const mockUseMutation = vi.mocked(useMutation);

const account: AccountDirective = {
  account: "Assets:Checking",
  openedAt: "2023-01-01",
  closedAt: null,
  entryCount: 0,
  entryHash: "abc123",
  closeEntryHash: null,
};

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  account,
  ledgerId: "ledger-1",
  onSuccess: vi.fn(),
};

describe("DeleteAccountDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue({
      data: undefined,
      loading: false,
      error: undefined,
    } as ReturnType<typeof useQuery>);
    mockUseMutation.mockReturnValue([
      vi.fn(),
      { loading: false },
    ] as unknown as ReturnType<typeof useMutation>);
  });

  it("renders dialog title with delete icon when open=true", () => {
    render(<DeleteAccountDialog {...defaultProps} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    // Title contains translated key for deleteAccount
    expect(screen.getByText(/delete account/i)).toBeInTheDocument();
  });

  it("Delete button is disabled when context is still loading", () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      loading: true,
      error: undefined,
    } as ReturnType<typeof useQuery>);

    render(<DeleteAccountDialog {...defaultProps} />);
    const deleteBtn = screen.getByRole("button", { name: /delete/i });
    expect(deleteBtn).toBeDisabled();
  });

  it("Delete button is disabled when context has not loaded sha256sum", () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      loading: false,
      error: undefined,
    } as ReturnType<typeof useQuery>);

    render(<DeleteAccountDialog {...defaultProps} />);
    const deleteBtn = screen.getByRole("button", { name: /delete/i });
    expect(deleteBtn).toBeDisabled();
  });

  it("Delete button is enabled when context loaded with sha256sum", () => {
    mockUseQuery.mockReturnValue({
      data: {
        getLedgerEntryContext: {
          sha256sum: "abc",
          slice: "2023-01-01 open Assets:Checking USD",
          entry: { meta: { filename: "main.bean", lineno: 1 } },
        },
      },
      loading: false,
      error: undefined,
    } as ReturnType<typeof useQuery>);

    render(<DeleteAccountDialog {...defaultProps} />);
    const deleteBtn = screen.getByRole("button", { name: /delete/i });
    expect(deleteBtn).not.toBeDisabled();
  });

  it("calls mutation with entryHash and sha256sum on delete", async () => {
    const user = userEvent.setup();
    const mockDeleteFn = vi.fn().mockResolvedValue({});
    mockUseMutation.mockReturnValue([
      mockDeleteFn,
      { loading: false },
    ] as unknown as ReturnType<typeof useMutation>);

    mockUseQuery.mockReturnValue({
      data: {
        getLedgerEntryContext: {
          sha256sum: "abc",
          slice: "2023-01-01 open Assets:Checking USD",
          entry: { meta: { filename: "main.bean", lineno: 1 } },
        },
      },
      loading: false,
      error: undefined,
    } as ReturnType<typeof useQuery>);

    render(<DeleteAccountDialog {...defaultProps} />);
    await user.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() => {
      expect(mockDeleteFn).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            ledgerId: "ledger-1",
            input: expect.objectContaining({
              entries: expect.arrayContaining([
                expect.objectContaining({
                  entryHash: "abc123",
                  sha256sum: "abc",
                }),
              ]),
            }),
          }),
        }),
      );
    });
  });

  it("shows success toast and calls onSuccess after deletion", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const onOpenChange = vi.fn();
    const mockDeleteFn = vi.fn().mockResolvedValue({});
    mockUseMutation.mockReturnValue([
      mockDeleteFn,
      { loading: false },
    ] as unknown as ReturnType<typeof useMutation>);

    mockUseQuery.mockReturnValue({
      data: {
        getLedgerEntryContext: {
          sha256sum: "abc",
          slice: "2023-01-01 open Assets:Checking USD",
          entry: { meta: { filename: "main.bean", lineno: 1 } },
        },
      },
      loading: false,
      error: undefined,
    } as ReturnType<typeof useQuery>);

    render(
      <DeleteAccountDialog
        {...defaultProps}
        onSuccess={onSuccess}
        onOpenChange={onOpenChange}
      />,
    );
    await user.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalled();
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("shows error when mutation throws", async () => {
    const user = userEvent.setup();
    const mockDeleteFn = vi.fn().mockRejectedValue(new Error("Delete failed"));
    mockUseMutation.mockReturnValue([
      mockDeleteFn,
      { loading: false },
    ] as unknown as ReturnType<typeof useMutation>);

    mockUseQuery.mockReturnValue({
      data: {
        getLedgerEntryContext: {
          sha256sum: "abc",
          slice: "2023-01-01 open Assets:Checking USD",
          entry: { meta: { filename: "main.bean", lineno: 1 } },
        },
      },
      loading: false,
      error: undefined,
    } as ReturnType<typeof useQuery>);

    render(<DeleteAccountDialog {...defaultProps} />);
    await user.click(screen.getByRole("button", { name: /delete/i }));

    await waitFor(() => {
      expect(
        screen.getByText("Something went wrong. Please try again."),
      ).toBeInTheDocument();
    });
  });
});
