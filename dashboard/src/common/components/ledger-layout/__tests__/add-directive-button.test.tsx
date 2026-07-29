import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AddDirectiveButton } from "../add-directive-button";

let canWrite = true;

vi.mock("@/common/hooks/use-ledger-permission", () => ({
  useLedgerPermission: () => ({ canWrite }),
}));

vi.mock("@/common/components/ui/sidebar.tsx", () => ({
  SidebarMenuAction: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    params,
    search,
    ...props
  }: {
    children: React.ReactNode;
    to: string;
    params: Record<string, string>;
    search: Record<string, string>;
    "aria-label": string;
  }) => (
    <a
      href="#"
      data-to={to}
      data-params={JSON.stringify(params)}
      data-search={JSON.stringify(search)}
      aria-label={props["aria-label"]}
    >
      {children}
    </a>
  ),
}));

describe("AddDirectiveButton", () => {
  beforeEach(() => {
    canWrite = true;
  });

  it("links writers to the canonical journal entry action", () => {
    render(<AddDirectiveButton ledgerId="alice/books" />);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute(
      "data-to",
      "/ledger/$ledgerOwner/$ledgerName/journal",
    );
    expect(link).toHaveAttribute(
      "data-params",
      JSON.stringify({ ledgerOwner: "alice", ledgerName: "books" }),
    );
    expect(link).toHaveAttribute(
      "data-search",
      JSON.stringify({ action: "new-entry", directive: "transaction" }),
    );
  });

  it("is hidden from read-only users", () => {
    canWrite = false;
    const { container } = render(<AddDirectiveButton ledgerId="alice/books" />);
    expect(container).toBeEmptyDOMElement();
  });
});
