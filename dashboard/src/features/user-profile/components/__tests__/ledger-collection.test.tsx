import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UserRepository } from "@/graphql/definitions";
import { LedgerCollection } from "../ledger-collection";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, params, to: _to, ...props }: any) => (
    <a href={`/ledger/${params.ledgerOwner}/${params.ledgerName}`} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("@/common/hooks/use-translations", async () => {
  const { default: en } = await import("../../locales/en");
  return {
    useTranslations: () => ({
      t: (key: string, params: Record<string, string | number> = {}) =>
        (en[key]?.message || key).replace(/\{(\w+)\}/g, (_, name: string) =>
          String(params[name]),
        ),
    }),
  };
});

const repositories: UserRepository[] = Array.from(
  { length: 15 },
  (_, index) => ({
    __typename: "UserRepository",
    name: `ledger-${String(index).padStart(2, "0")}`,
    fullName: `owner/ledger-${String(index).padStart(2, "0")}`,
    description: index === 0 ? "Household budget" : null,
    isPrivate: index === 0,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: `2026-01-${String(index + 1).padStart(2, "0")}T00:00:00Z`,
  }),
);

function renderCollection() {
  return render(
    <LedgerCollection username="owner" repositories={repositories} />,
  );
}

describe("LedgerCollection discovery", () => {
  it("searches the entire collection by name and description, ignoring case and outer whitespace", async () => {
    const user = userEvent.setup();
    renderCollection();
    expect(
      screen.queryByRole("heading", { name: "ledger-00" }),
    ).not.toBeInTheDocument();
    const input = screen.getByRole("searchbox", { name: "Search ledgers…" });
    await user.type(input, "  HOUSEHOLD  ");
    expect(
      screen.getByRole("heading", { name: "ledger-00" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Showing 1 of 1 ledgers",
    );
    await user.clear(input);
    await user.type(input, "LEDGER-14");
    expect(
      screen.getByRole("heading", { name: "ledger-14" }),
    ).toBeInTheDocument();
  });

  it("sorts by recency by default and supports alphabetical browsing without mutating the data", async () => {
    const user = userEvent.setup();
    renderCollection();
    expect(screen.getAllByRole("link")[0]).toHaveAttribute(
      "href",
      "/ledger/owner/ledger-14",
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Sort ledgers" }),
      "name",
    );
    expect(screen.getAllByRole("link")[0]).toHaveAttribute(
      "href",
      "/ledger/owner/ledger-00",
    );
    expect(repositories[0].name).toBe("ledger-00");
  });

  it("reveals all remaining ledgers and resets the visible page after a search is cleared", async () => {
    const user = userEvent.setup();
    renderCollection();
    expect(screen.getAllByRole("link")).toHaveLength(12);
    await user.click(screen.getByRole("button", { name: "Show more ledgers" }));
    expect(screen.getAllByRole("link")).toHaveLength(15);
    expect(
      screen.queryByRole("button", { name: "Show more ledgers" }),
    ).not.toBeInTheDocument();
    await user.type(screen.getByRole("searchbox"), "ledger-14");
    await user.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.getAllByRole("link")).toHaveLength(12);
    expect(screen.getByRole("searchbox")).toHaveFocus();
  });

  it("offers a recovery action for an unmatched query", async () => {
    const user = userEvent.setup();
    renderCollection();
    await user.type(screen.getByRole("searchbox"), "nonexistent");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Showing 0 of 0 ledgers",
    );
    expect(
      screen.getByText(/No ledgers match your search/),
    ).toBeInTheDocument();
    await user.click(
      screen.getAllByRole("button", { name: "Clear search" })[1],
    );
    expect(screen.getAllByRole("link")).toHaveLength(12);
    expect(screen.getByRole("searchbox")).toHaveFocus();
  });
});
