import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DirectiveType, type JournalQuery } from "@/common/types/journal";
import { JournalDescription } from "..";

// w31/145: the ledger lists a stored query as a `Query` with its name and
// BQL. It used to arrive as a `Custom`, so the Journal must keep showing both.
const stored: JournalQuery = {
  directive_type: DirectiveType.QUERY,
  entry_hash: "synthetic-query",
  date: "2026-01-05",
  name: "qa-q",
  query_string: "SELECT account WHERE account ~ 'Cash'",
};

describe("JournalDescription of a stored query", () => {
  it("shows the query's name and its BQL", () => {
    render(<JournalDescription directive={stored} />);
    expect(screen.getByText("qa-q")).toBeInTheDocument();
    expect(
      screen.getByText("SELECT account WHERE account ~ 'Cash'"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/unknownDirectiveType|Unknown/)).toBeNull();
  });

  it("keeps both on one line in the compact layout", () => {
    const { container } = render(
      <JournalDescription directive={stored} compact />,
    );
    expect(container.textContent).toBe(
      "qa-q · SELECT account WHERE account ~ 'Cash'",
    );
  });
});
