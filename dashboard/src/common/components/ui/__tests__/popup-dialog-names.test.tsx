import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { Combobox } from "../combobox";
import { AccountCombobox } from "@/common/components/ledger-layout/go-to-account";
import { Button } from "@/common/components/ui/button";
import { SidebarProvider } from "@/common/components/ui/sidebar";

/**
 * Radix renders these popups with role="dialog". A dialog needs its own
 * accessible name: naming only the input inside it leaves assistive technology
 * announcing an unnamed dialog, which is what these cases pin. Asserting the
 * input's placeholder would pass either way, so every case queries by role
 * *and* name.
 */

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({ ledgerOwner: "testowner", ledgerName: "testledger" }),
}));

vi.mock("@apollo/client/react", () => ({ useQuery: vi.fn() }));

import { useQuery } from "@apollo/client/react";

const mockUseQuery = useQuery as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
  mockUseQuery.mockReturnValue({
    data: { getLedgerAccounts: ["Assets:Bank:Checking", "Income:Salary"] },
    loading: false,
    error: undefined,
    refetch: vi.fn(),
  });
});

describe("account navigation popup", () => {
  it("names the popup itself, not only the search input", async () => {
    const user = userEvent.setup();
    render(
      <SidebarProvider>
        <AccountCombobox>
          <Button aria-label="Search accounts...">open</Button>
        </AccountCombobox>
      </SidebarProvider>,
    );

    await user.click(
      screen.getByRole("button", { name: "Search accounts..." }),
    );

    expect(
      screen.getByRole("dialog", { name: "Search accounts..." }),
    ).toBeInTheDocument();
  });

  it("keeps the search input separately labelled inside the named popup", async () => {
    const user = userEvent.setup();
    render(
      <SidebarProvider>
        <AccountCombobox>
          <Button aria-label="Search accounts...">open</Button>
        </AccountCombobox>
      </SidebarProvider>,
    );

    await user.click(
      screen.getByRole("button", { name: "Search accounts..." }),
    );

    const dialog = screen.getByRole("dialog", { name: "Search accounts..." });
    expect(
      within(dialog).getByPlaceholderText("Search accounts..."),
    ).toBeInTheDocument();
  });
});

describe("shared combobox popup", () => {
  const OPTIONS = [
    { value: "2016-02", label: "2016-02" },
    { value: "2016-03", label: "2016-03" },
  ];

  it("takes its name from the field it belongs to", async () => {
    const user = userEvent.setup();
    render(
      <Combobox
        options={OPTIONS}
        value=""
        onValueChange={vi.fn()}
        placeholder="Time"
      />,
    );

    await user.click(screen.getByRole("combobox"));

    expect(screen.getByRole("dialog", { name: "Time" })).toBeInTheDocument();
  });

  it("names each field's popup differently rather than sharing one label", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Combobox
          options={OPTIONS}
          value=""
          onValueChange={vi.fn()}
          placeholder="Account"
        />
      </>,
    );

    await user.click(screen.getByRole("combobox"));

    expect(screen.getByRole("dialog", { name: "Account" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Time" })).toBeNull();
  });

  it("leaves the inner listbox and options addressable", async () => {
    const user = userEvent.setup();
    render(
      <Combobox
        options={OPTIONS}
        value=""
        onValueChange={vi.fn()}
        placeholder="Time"
      />,
    );

    await user.click(screen.getByRole("combobox"));

    const dialog = screen.getByRole("dialog", { name: "Time" });
    expect(
      within(dialog).getByRole("listbox", { name: "Time" }),
    ).toBeInTheDocument();
    expect(within(dialog).getAllByRole("option")).toHaveLength(2);
  });
});
