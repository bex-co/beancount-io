import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RelatedLinks } from "../related-links";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    className,
  }: {
    children: React.ReactNode;
    to: string;
    className?: string;
  }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

describe("RelatedLinks", () => {
  const links = [
    { label: "Overview", to: "/ledger/user/repo/overview" },
    { label: "Balance Sheet", to: "/ledger/user/repo/balance-sheet" },
  ];

  it("renders a nav landmark with related links", () => {
    render(<RelatedLinks links={links} />);

    const nav = screen.getByRole("navigation");
    expect(nav).toBeInTheDocument();
  });

  it("renders a link for each item in the links array", () => {
    render(<RelatedLinks links={links} />);

    expect(screen.getByText("Overview")).toBeInTheDocument();
    expect(screen.getByText("Balance Sheet")).toBeInTheDocument();
  });

  it("uses the correct href for each link", () => {
    render(<RelatedLinks links={links} />);

    const overviewLink = screen.getByText("Overview").closest("a");
    expect(overviewLink).toHaveAttribute("href", "/ledger/user/repo/overview");

    const balanceLink = screen.getByText("Balance Sheet").closest("a");
    expect(balanceLink).toHaveAttribute(
      "href",
      "/ledger/user/repo/balance-sheet",
    );
  });

  it("renders the section heading", () => {
    render(<RelatedLinks links={links} />);

    // The global translation mock returns the English string for "common.seeAlso"
    expect(screen.getByText("Related Pages")).toBeInTheDocument();
  });

  it("returns null when links array is empty", () => {
    const { container } = render(<RelatedLinks links={[]} />);

    expect(container.firstChild).toBeNull();
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a single link correctly", () => {
    render(<RelatedLinks links={[{ label: "Home", to: "/" }]} />);

    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Home").closest("a")).toHaveAttribute("href", "/");
  });
});
