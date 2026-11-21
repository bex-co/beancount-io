import { describe, it, expect, vi } from "vitest";
import { render as renderUI, screen } from "@testing-library/react";
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

import { createLocalization } from "@/i18n/init";
import { LocalizationProvider } from "@/i18n/provider";
import {
  LedgerProviderContext,
  type LedgerProviderContextType,
} from "@/common/providers/ledger-provider/context";

vi.unmock("react-i18next");
vi.unmock("@/common/hooks/use-translations");
vi.unmock("@/i18n");

const ledger = {
  ledgerData: { options: { renderCommas: true } },
} as unknown as LedgerProviderContextType;

function render(ui: React.ReactElement) {
  const localization = createLocalization();
  return renderUI(ui, {
    wrapper: ({ children }) => (
      <LocalizationProvider localization={localization}>
        <LedgerProviderContext.Provider value={ledger}>
          {children}
        </LedgerProviderContext.Provider>
      </LocalizationProvider>
    ),
  });
}

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

const money = {
  primaryCurrency: "USD",
  incomeRoot: "Income",
  expensesRoot: "Expenses",
  accountFilter: "",
};

type Layout = "lines" | "days";

/**
 * Rows every list carries before its entries: the column headings, and in
 * the day layout one heading for the day all these entries share.
 */
const FIXED_ROWS: Record<Layout, number> = { lines: 1, days: 2 };

function rowsOf(
  layout: Layout,
  data: JournalTableItem[],
  props: Record<string, unknown>,
) {
  render(
    <JournalTable
      layout={layout}
      money={money}
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

describe.each(["lines", "days"] as const)(
  "journal detail rows (%s)",
  (layout) => {
    it.each([
      ["null metadata", null],
      ["empty metadata", {}],
      [
        "only internal metadata",
        { __automatic__: true, filename: "a.bean", lineno: 3 },
      ],
    ])("adds no row for %s even with Metadata on", (_label, meta) => {
      const counts = rowsOf(layout, [{ directive: transaction(meta) }], {
        showMetadata: true,
      });

      // The fixed rows plus the one transaction, and nothing else.
      expect(counts.total).toBe(FIXED_ROWS[layout] + 1);
      expect(counts.detail).toBe(0);
      expect(counts.empty).toBe(0);
    });

    it("adds one populated row for real metadata", () => {
      const counts = rowsOf(
        layout,
        [{ directive: transaction({ pool: "slushpool" }) }],
        {
          showMetadata: true,
        },
      );

      expect(counts.populated).toBe(1);
      expect(counts.empty).toBe(0);
      expect(screen.getByText("slushpool")).toBeInTheDocument();
    });

    it("keeps the real entry and drops the empty one on a mixed page", () => {
      const counts = rowsOf(
        layout,
        [
          { directive: transaction({ pool: "slushpool" }) },
          { directive: transaction(null) },
          { directive: transaction({ __automatic__: true }) },
        ],
        { showMetadata: true },
      );

      // The fixed rows, three transactions, one detail row.
      expect(counts.total).toBe(FIXED_ROWS[layout] + 4);
      expect(counts.populated).toBe(1);
      expect(counts.empty).toBe(0);
    });

    it("adds a row for visible postings, and none when they are hidden", () => {
      const shown = rowsOf(layout, [{ directive: transaction(null) }], {
        showPostings: true,
      });
      expect(shown.populated).toBe(1);
      expect(shown.empty).toBe(0);

      screen.getByRole("table").remove();

      const hidden = rowsOf(layout, [{ directive: transaction(null) }], {
        showPostings: false,
      });
      expect(hidden.detail).toBe(0);
    });

    it("adds no row for a transaction that has no postings to show", () => {
      const counts = rowsOf(layout, [{ directive: transaction(null, 0) }], {
        showPostings: true,
        showMetadata: true,
      });

      expect(counts.detail).toBe(0);
    });

    it("adds and removes the row as one transaction's postings are toggled", async () => {
      const user = userEvent.setup();
      render(
        <JournalTable
          layout={layout}
          money={money}
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
        name: /^(Show|Hide) \d+ postings? for /,
      })[0];
      await user.click(toggle);
      expect(count()).toBe(1);

      await user.click(toggle);
      expect(count()).toBe(0);
    });
  },
);
