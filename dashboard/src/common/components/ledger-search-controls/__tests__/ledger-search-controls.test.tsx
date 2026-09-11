import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as apolloClient from "@apollo/client/react";
import { LedgerSearchControls } from "../index";
import { LedgerSearchParamsContext } from "@/common/providers/ledger-search-params-provider";

vi.mock("@apollo/client/react", () => ({
  useQuery: vi.fn(),
}));

vi.mock("@/common/providers/ledger-provider", () => ({
  useLedger: () => ({
    ledgerData: { options: { operatingCurrency: ["USD", "IRT"] } },
  }),
}));

vi.mock("@/common/hooks/use-translations.ts", () => ({
  useTranslations: () => ({
    t: (key: string) =>
      ({
        "component.searchControls.clearAll": "Clear all",
      })[key] ?? key,
  }),
}));

function mockAttributes() {
  vi.mocked(apolloClient.useQuery).mockReturnValue({
    data: {
      getLedgerAttributes: {
        accounts: [],
        tags: [],
        years: [],
        links: [],
        payees: [],
      },
    },
    loading: false,
    error: undefined,
  } as unknown as ReturnType<typeof apolloClient.useQuery>);
}

describe("LedgerSearchControls", () => {
  it("does not show Clear all when only a presentation currency is set", () => {
    mockAttributes();
    render(
      <LedgerSearchParamsContext.Provider
        value={{
          searchParams: {
            account: "",
            filter: "",
            time: "",
            conversion: "IRT",
          },
          setSearchParams: vi.fn(),
        }}
      >
        <LedgerSearchControls ledgerId="alice/book" />
      </LedgerSearchParamsContext.Provider>,
    );

    expect(
      screen.queryByRole("button", { name: "Clear all" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the presentation currency when clearing all filters", async () => {
    mockAttributes();
    const setSearchParams = vi.fn();
    const user = userEvent.setup();
    render(
      <LedgerSearchParamsContext.Provider
        value={{
          searchParams: {
            account: "Assets",
            filter: "",
            time: "",
            conversion: "IRT",
          },
          setSearchParams,
        }}
      >
        <LedgerSearchControls ledgerId="alice/book" />
      </LedgerSearchParamsContext.Provider>,
    );

    await user.click(screen.getByRole("button", { name: "Clear all" }));

    expect(setSearchParams).toHaveBeenCalledWith({
      account: "",
      filter: "",
      time: "",
      conversion: "IRT",
    });
  });
});
