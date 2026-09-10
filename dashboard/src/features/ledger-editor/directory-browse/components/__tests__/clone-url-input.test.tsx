import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { CloneUrlInput } from "../ledger-clone-url-menu";

vi.mock("@/common/lib/errors/error-message", () => ({
  useErrorMessage: () => (err: unknown) => String(err),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

describe("CloneUrlInput accessible copy button", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it("keeps the HTTP clone label through the copied check state", async () => {
    const user = userEvent.setup();
    render(
      <CloneUrlInput
        url="https://example.com/git/open_ledger/example.git"
        copyLabel="Copy HTTP clone URL"
      />,
    );

    const button = screen.getByRole("button", { name: "Copy HTTP clone URL" });
    await user.click(button);

    await waitFor(() => {
      expect(button.querySelector(".lucide-check")).toBeTruthy();
    });
    expect(
      screen.getByRole("button", { name: "Copy HTTP clone URL" }),
    ).toBeInTheDocument();
  });

  it("names the SSH clone copy button distinctly", async () => {
    const user = userEvent.setup();
    render(
      <CloneUrlInput
        url="git@example.com:open_ledger/example.git"
        copyLabel="Copy SSH clone URL"
      />,
    );

    const button = screen.getByRole("button", { name: "Copy SSH clone URL" });
    await user.click(button);

    await waitFor(() => {
      expect(button.querySelector(".lucide-check")).toBeTruthy();
    });
    expect(
      screen.getByRole("button", { name: "Copy SSH clone URL" }),
    ).toBeInTheDocument();
  });
});
