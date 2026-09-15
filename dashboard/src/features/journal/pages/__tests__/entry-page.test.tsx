import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import EntryPage from "../entry-page";

const mockUseParams = vi.fn();
const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useParams: () => mockUseParams(),
  useNavigate: () => mockNavigate,
  Link: ({
    children,
    to,
    params,
    ...rest
  }: {
    children: ReactNode;
    to: string;
    params?: Record<string, string>;
  }) => (
    <a
      href={`${to}?${new URLSearchParams(params ?? {}).toString()}`}
      data-to={to}
      data-params={JSON.stringify(params ?? {})}
      {...rest}
    >
      {children}
    </a>
  ),
}));

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({ ledgerName: "Real Estate Example" }),
}));

vi.mock("@/common/components/seo/ledger-page-seo", () => ({
  LedgerPageSEO: ({
    seoKey,
    canonicalUrl,
  }: {
    seoKey: string;
    canonicalUrl?: string;
  }) => (
    <div
      data-testid="ledger-page-seo"
      data-seo-key={seoKey}
      data-canonical={canonicalUrl}
    />
  ),
}));

vi.mock("@/features/journal/components/entry-context-panel", () => ({
  EntryContextPanel: ({
    entryHash,
    ledgerId,
  }: {
    entryHash: string;
    ledgerId: string;
  }) => (
    <div data-testid="entry-context-panel">
      <span data-testid="ledger-id">{ledgerId}</span>
      <span data-testid="entry-hash">{entryHash}</span>
    </div>
  ),
}));

describe("EntryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseParams.mockReturnValue({
      ledgerOwner: "open_ledger",
      ledgerName: "real-estate-example",
      entryHash: "2f4431f658f3553e73512ea3ebc1a2d4",
    });
  });

  it("binds the route ledger identity and entry hash to the context panel", () => {
    render(<EntryPage />);

    expect(screen.getByTestId("entry-context-panel")).toBeInTheDocument();
    expect(screen.getByTestId("ledger-id")).toHaveTextContent(
      "open_ledger/real-estate-example",
    );
    expect(screen.getByTestId("entry-hash")).toHaveTextContent(
      "2f4431f658f3553e73512ea3ebc1a2d4",
    );
  });

  it("fails closed when params point at a different ledger or hash", () => {
    mockUseParams.mockReturnValue({
      ledgerOwner: "other_owner",
      ledgerName: "other-ledger",
      entryHash: "deadbeef",
    });

    render(<EntryPage />);

    expect(screen.getByTestId("ledger-id")).toHaveTextContent(
      "other_owner/other-ledger",
    );
    expect(screen.getByTestId("entry-hash")).toHaveTextContent("deadbeef");
    expect(screen.getByTestId("ledger-id")).not.toHaveTextContent(
      "open_ledger/real-estate-example",
    );
    expect(screen.getByTestId("entry-hash")).not.toHaveTextContent(
      "2f4431f658f3553e73512ea3ebc1a2d4",
    );
  });

  it("emits generic SEO without embedding the entry hash in the seo key", () => {
    render(<EntryPage />);

    const seo = screen.getByTestId("ledger-page-seo");
    expect(seo).toHaveAttribute("data-seo-key", "ledgerEntry");
    expect(seo.getAttribute("data-canonical")).toBe(
      "https://beancount.io/ledger/open_ledger/real-estate-example/entry/2f4431f658f3553e73512ea3ebc1a2d4",
    );
  });

  it("links back to the same ledger journal", () => {
    render(<EntryPage />);

    const back = screen.getByText("journal.backToJournal").closest("a");
    expect(back).toHaveAttribute(
      "data-to",
      "/ledger/$ledgerOwner/$ledgerName/journal",
    );
    expect(back).toHaveAttribute(
      "data-params",
      JSON.stringify({
        ledgerOwner: "open_ledger",
        ledgerName: "real-estate-example",
      }),
    );
  });
});
