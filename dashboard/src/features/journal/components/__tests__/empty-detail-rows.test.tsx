import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { JournalTable } from "@/features/journal/components/journal-table";
import type { JournalTableItem } from "@/features/journal/components/journal-table";
import type { JournalTransaction } from "@/common/types/journal";

/**
 * The detail row exists to carry postings and metadata. The global Metadata
 * preference used to create one per transaction whether or not anything would
 * render inside it, so a page of 24 entries exposed 24 empty rows to anyone
 * navigating the table.
 */

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

function transaction(
  meta: Record<string, unknown> | null,
  postingsCount = 2,
): JournalTransaction {
  return {
    entry_hash: `entry-${JSON.stringify(meta)}-${postingsCount}`,
    directive_type: "Transaction",
    date: "2015-01-19",
    flag: "*",
    payee: "Broker",
    narration: "Investing 60% of cash in RGAGX",
    postings: Array.from({ length: postingsCount }, (_, i) => ({
      account: `Assets:Test${i + 1}`,
      units: { number: "100.00", currency: "USD" },
      cost: null,
      price: null,
      flag: null,
      meta: {},
    })),
    tags: [],
    links: [],
    meta,
  } as unknown as JournalTransaction;
}

function rowsOf(data: JournalTableItem[], props: Record<string, unknown>) {
  render(
    <JournalTable
      data={data}
      showMetadata={false}
      showPostings={false}
      onEntryClick={vi.fn()}
      {...props}
    />,
  );
  const all = screen.getAllByRole("row");
  const detail = all.filter((row) => {
    const cells = row.querySelectorAll("td[colspan]");
    return cells.length === 1;
  });
  return {
    total: all.length,
    detail: detail.length,
    empty: detail.filter((r) => r.textContent?.trim() === "").length,
    populated: detail.filter((r) => r.textContent?.trim() !== "").length,
  };
}

describe("journal detail rows", () => {
  it.each([
    ["null metadata", null],
    ["empty metadata", {}],
    [
      "only internal metadata",
      { __automatic__: true, filename: "a.bean", lineno: 3 },
    ],
  ])("adds no row for %s even with Metadata on", (_label, meta) => {
    const counts = rowsOf([{ directive: transaction(meta) }], {
      showMetadata: true,
    });

    // Header plus the one transaction, and nothing else.
    expect(counts.total).toBe(2);
    expect(counts.detail).toBe(0);
    expect(counts.empty).toBe(0);
  });

  it("adds one populated row for real metadata", () => {
    const counts = rowsOf([{ directive: transaction({ pool: "slushpool" }) }], {
      showMetadata: true,
    });

    expect(counts.populated).toBe(1);
    expect(counts.empty).toBe(0);
    expect(screen.getByText("slushpool")).toBeInTheDocument();
  });

  it("keeps the real entry and drops the empty one on a mixed page", () => {
    const counts = rowsOf(
      [
        { directive: transaction({ pool: "slushpool" }) },
        { directive: transaction(null) },
        { directive: transaction({ __automatic__: true }) },
      ],
      { showMetadata: true },
    );

    // Header, three transactions, one detail row.
    expect(counts.total).toBe(5);
    expect(counts.populated).toBe(1);
    expect(counts.empty).toBe(0);
  });

  it("adds a row for visible postings, and none when they are hidden", () => {
    const shown = rowsOf([{ directive: transaction(null) }], {
      showPostings: true,
    });
    expect(shown.populated).toBe(1);
    expect(shown.empty).toBe(0);

    screen.getByRole("table").remove();

    const hidden = rowsOf([{ directive: transaction(null) }], {
      showPostings: false,
    });
    expect(hidden.detail).toBe(0);
  });

  it("adds no row for a transaction that has no postings to show", () => {
    const counts = rowsOf([{ directive: transaction(null, 0) }], {
      showPostings: true,
      showMetadata: true,
    });

    expect(counts.detail).toBe(0);
  });

  it("adds and removes the row as one transaction's postings are toggled", async () => {
    const user = userEvent.setup();
    render(
      <JournalTable
        data={[{ directive: transaction(null) }]}
        showMetadata
        showPostings={false}
        onEntryClick={vi.fn()}
      />,
    );

    const count = () =>
      screen
        .getAllByRole("row")
        .filter((r) => r.querySelectorAll("td[colspan]").length === 1).length;

    expect(count()).toBe(0);

    const toggle = screen.getAllByRole("button", {
      name: "Toggle postings",
    })[0];
    await user.click(toggle);
    expect(count()).toBe(1);

    await user.click(toggle);
    expect(count()).toBe(0);
  });
});
