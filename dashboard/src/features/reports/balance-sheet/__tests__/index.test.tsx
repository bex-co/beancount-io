import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useQuery } from "@apollo/client/react";
import LedgerBalanceSheetPage from "../index";

vi.mock("@apollo/client/react", () => ({ useQuery: vi.fn() }));

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({ ledgerOwner: "demo", ledgerName: "books" }),
}));

vi.mock("@/common/hooks/use-ledger", () => ({
  useLedger: () => ({
    ledgerName: "Demo Books",
    primaryCurrency: "USD",
    ledgerData: {
      options: { title: "", operatingCurrency: ["USD", "IRT"] },
      favaOptions: { fiscalYearEnd: { month: 12, day: 31 } },
    },
  }),
}));

vi.mock("@/common/hooks/use-ledger-search-params", () => ({
  useLedgerSearchParams: () => ({
    searchParams: { account: "", filter: "", time: "", conversion: "IRT" },
  }),
}));

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({ t: (key: string) => key }),
}));

vi.mock("../balance-sheet-content", () => ({
  BalanceSheetContent: () => <div>balance-sheet-content</div>,
}));

describe("LedgerBalanceSheetPage query variables", () => {
  it("resolves the URL conversion into the query the same way the loader does", () => {
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      previousData: undefined,
      loading: true,
      error: undefined,
    } as never);

    render(<LedgerBalanceSheetPage />);

    const [, options] = vi.mocked(useQuery).mock.calls[0];
    expect(
      (options as { variables: { conversion: string } }).variables.conversion,
    ).toBe("IRT");
  });
});
