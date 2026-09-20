import { MockedProvider } from "@apollo/client/testing/react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import LedgerCloneUrlMenu from "../ledger-clone-url-menu";

/**
 * Radix gives this popup role="dialog", which needs a name, and the two
 * read-only URL boxes are textboxes whose value is the URL rather than their
 * name. Both were anonymous in the accessibility tree while "Clone Repository"
 * sat visibly above them. The copy buttons name the action, not the field, so
 * these cases query by role *and* name — an assertion on the URL value would
 * have passed before the fix.
 */

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

vi.mock("@/common/components/authenticated", () => ({
  Authenticated: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/common/providers/ledger-provider", () => ({
  useLedger: () => ({
    ledgerData: {
      httpUrl: "https://example.com/git/alice/books.git",
      sshUrl: "git@example.com:alice/books.git",
    },
  }),
}));

async function openCloneMenu() {
  const user = userEvent.setup();
  render(
    <MockedProvider mocks={[]}>
      <LedgerCloneUrlMenu ledgerId="alice/books" />
    </MockedProvider>,
  );
  await user.click(screen.getByRole("button", { name: /git clone/i }));
  return user;
}

describe("clone popup naming", () => {
  it("names the dialog with the heading already on screen", async () => {
    await openCloneMenu();

    expect(
      screen.getByRole("dialog", { name: "Clone Repository" }),
    ).toBeInTheDocument();
  });

  it("names the SSH field by its protocol and the clone context", async () => {
    await openCloneMenu();

    expect(
      screen.getByRole("textbox", { name: "SSH Clone Repository" }),
    ).toHaveValue("git@example.com:alice/books.git");
  });

  it("gives the HTTP field a different name and its own URL", async () => {
    const user = await openCloneMenu();

    await user.click(screen.getByRole("tab", { name: "HTTP" }));

    expect(
      screen.getByRole("textbox", { name: "HTTP Clone Repository" }),
    ).toHaveValue("https://example.com/git/alice/books.git");
    expect(
      screen.queryByRole("textbox", { name: "SSH Clone Repository" }),
    ).toBeNull();
  });

  it("does not borrow the copy button's label for the field", async () => {
    await openCloneMenu();

    // The copy action keeps its own name, separate from the field's.
    expect(
      screen.getByRole("button", { name: "Copy SSH clone URL" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /copy/i })).toBeNull();
  });

  it("keeps the URL fields read-only", async () => {
    await openCloneMenu();

    expect(
      screen.getByRole("textbox", { name: "SSH Clone Repository" }),
    ).toHaveAttribute("readonly");
  });
});
