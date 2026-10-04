import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RecentActivityCard } from "../recent-activity-card";

let postings: Array<{
  account: string;
  units: { number: string; currency: string };
}> = [];

vi.mock("@apollo/client/react", () => ({
  useQuery: () => ({
    data: {
      getLedgerJournal: {
        data: [
          {
            entry_hash: "hash-1",
            date: "2026-02-03",
            directive_type: "Transaction",
            flag: "*",
            payee: "Cafe",
            narration: "Coffee",
            postings,
            tags: [],
            links: [],
          },
        ],
        total: 1,
      },
    },
    loading: false,
    error: undefined,
    refetch: vi.fn(),
  }),
}));

vi.mock("@/common/hooks/use-format-number", () => ({
  useFormatNumber: () => (v: number) => String(v),
}));

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => (
    <a href="#">{children}</a>
  ),
}));

const props = {
  ledgerId: "alice/books",
  ledgerOwner: "alice",
  ledgerName: "books",
  account: "",
  filter: "",
  time: "",
  primaryCurrency: "USD",
  incomeRoot: "Income",
  expensesRoot: "Expenses",
  canWrite: true,
};

/**
 * Text a row shows at a breakpoint, resolving Tailwind's responsive display
 * classes the way the browser would (jsdom applies no CSS).
 */
function visibleText(row: HTMLElement, viewport: "narrow" | "desktop") {
  const clone = row.cloneNode(true) as HTMLElement;
  for (const el of Array.from(clone.querySelectorAll<HTMLElement>("*"))) {
    const classes = el.className.toString().split(/\s+/);
    const hidden =
      viewport === "narrow"
        ? classes.includes("hidden")
        : classes.includes("sm:hidden") ||
          (classes.includes("hidden") &&
            !classes.some((c) => /^sm:(block|flex|inline-flex)$/.test(c)));
    if (hidden) el.remove();
  }
  return clone.textContent ?? "";
}

function occurrences(text: string, needle: string) {
  return text.split(needle).length - 1;
}

describe("RecentActivityCard account summary", () => {
  beforeEach(() => {
    postings = [];
  });

  it("names a row's accounts once at desktop width and keeps them on narrow rows", () => {
    postings = [
      { account: "Expenses:Food", units: { number: "4.50", currency: "USD" } },
      { account: "Assets:Cash", units: { number: "-4.50", currency: "USD" } },
    ];
    render(<RecentActivityCard {...props} />);
    const row = screen.getByRole("button", { name: /Cafe/ });

    expect(occurrences(visibleText(row, "desktop"), "Food · Cash")).toBe(1);
    expect(occurrences(visibleText(row, "narrow"), "Food · Cash")).toBe(1);
  });

  it("keeps a transfer's accounts in the subtitle beside its Transfer label", () => {
    postings = [
      {
        account: "Assets:Savings",
        units: { number: "100", currency: "USD" },
      },
      {
        account: "Assets:Checking",
        units: { number: "-100", currency: "USD" },
      },
    ];
    render(<RecentActivityCard {...props} />);
    const row = screen.getByRole("button", { name: /Cafe/ });
    const desktop = visibleText(row, "desktop");

    expect(occurrences(desktop, "Savings · Checking")).toBe(1);
    expect(desktop).toContain("page.overview.transactionTransfer");
    expect(occurrences(visibleText(row, "narrow"), "Savings · Checking")).toBe(
      1,
    );
  });
});
