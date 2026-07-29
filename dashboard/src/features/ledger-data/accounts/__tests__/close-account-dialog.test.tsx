import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { CloseAccountDialog } from "../close-account-dialog";
import type { AccountDirective } from "../types";

const mockMutation = vi.fn();

vi.mock("@apollo/client/react", () => ({
  useMutation: vi.fn(() => [mockMutation, { loading: false }]),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

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

describe("CloseAccountDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders dialog with account name in confirmation text when open=true", () => {
    render(<CloseAccountDialog {...defaultProps} />);
    expect(screen.getByText(/Assets:Checking/)).toBeInTheDocument();
  });

  it("does not render dialog content when open=false", () => {
    render(<CloseAccountDialog {...defaultProps} open={false} />);
    expect(screen.queryByText(/Assets:Checking/)).not.toBeInTheDocument();
  });

  it("Cancel button calls onOpenChange(false)", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <CloseAccountDialog {...defaultProps} onOpenChange={onOpenChange} />,
    );

    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("Close Account button triggers mutation with correct variables", async () => {
    const user = userEvent.setup();
    mockMutation.mockResolvedValue({
      data: { bulkEntries: { success: true } },
    });

    render(<CloseAccountDialog {...defaultProps} />);
    await user.click(screen.getByRole("button", { name: /close account/i }));

    await waitFor(() => {
      expect(mockMutation).toHaveBeenCalledWith(
        expect.objectContaining({
          variables: expect.objectContaining({
            ledgerId: "ledger-1",
            entries: [
              expect.objectContaining({
                type: "CLOSE",
                close: expect.objectContaining({ account: "Assets:Checking" }),
              }),
            ],
          }),
        }),
      );
    });
  });

  it("shows error message when mutation returns failure", async () => {
    const user = userEvent.setup();
    mockMutation.mockResolvedValue({
      data: { bulkEntries: { success: false, message: "Already closed" } },
    });

    render(<CloseAccountDialog {...defaultProps} />);
    await user.click(screen.getByRole("button", { name: /close account/i }));

    await waitFor(() => {
      expect(screen.getByText("Already closed")).toBeInTheDocument();
    });
  });

  it("shows error message when mutation throws", async () => {
    const user = userEvent.setup();
    mockMutation.mockRejectedValue(new Error("Network error"));

    render(<CloseAccountDialog {...defaultProps} />);
    await user.click(screen.getByRole("button", { name: /close account/i }));

    await waitFor(() => {
      expect(
        screen.getByText("Something went wrong. Please try again."),
      ).toBeInTheDocument();
    });
  });

  it("shows success toast and calls onSuccess when mutation succeeds", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    const onOpenChange = vi.fn();
    mockMutation.mockResolvedValue({
      data: { bulkEntries: { success: true } },
    });

    render(
      <CloseAccountDialog
        {...defaultProps}
        onSuccess={onSuccess}
        onOpenChange={onOpenChange}
      />,
    );
    await user.click(screen.getByRole("button", { name: /close account/i }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalled();
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
