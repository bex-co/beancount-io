import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as apolloClient from "@apollo/client/react";
import type { ListLedgersQuery } from "@/graphql/definitions";
import { LedgerSwitcher } from "../ledger-switcher";

const { mockNavigate } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    className,
    "aria-label": ariaLabel,
  }: {
    children: ReactNode;
    className?: string;
    "aria-label"?: string;
  }) => (
    <a href="#" className={className} aria-label={ariaLabel}>
      {children}
    </a>
  ),
  useLocation: () => ({ pathname: "/ledger/open_ledger/ledger-1" }),
  useNavigate: () => mockNavigate,
}));

vi.mock("@apollo/client/react", () => ({
  useMutation: vi.fn(),
  useQuery: vi.fn(),
}));

vi.mock("@/common/components/authenticated", () => ({
  Authenticated: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@/common/providers/react-native-bridge-provider", () => ({
  useReactNativeContext: () => ({ isReactNative: false }),
}));

function makeLedgers(count: number): ListLedgersQuery["listLedgers"] {
  return Array.from({ length: count }, (_, index) => {
    const name = `ledger-${index + 1}`;
    return {
      __typename: "Ledger" as const,
      id: `open_ledger/${name}`,
      name,
      fullName: `open_ledger/${name}`,
      httpUrl: `https://example.com/open_ledger/${name}`,
      sshUrl: `git@example.com:open_ledger/${name}`,
      private: false,
      empty: false,
      size: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      description: null,
      permissions: {
        __typename: "Permission" as const,
        admin: true,
        pull: true,
        push: true,
      },
    };
  });
}

describe("LedgerSwitcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apolloClient.useQuery).mockReturnValue({
      data: { listLedgers: makeLedgers(20) },
      loading: false,
    } as ReturnType<typeof apolloClient.useQuery>);
    vi.mocked(apolloClient.useMutation).mockReturnValue([
      vi.fn(),
      { loading: false },
    ] as unknown as ReturnType<typeof apolloClient.useMutation>);
  });

  it("scrolls ledger results while keeping global actions outside the list", async () => {
    const user = userEvent.setup();
    render(
      <LedgerSwitcher
        currentLedgerId="open_ledger/ledger-1"
        currentLedgerName="ledger-1"
        currentLedgerFullName="open_ledger/ledger-1"
      />,
    );

    await user.click(screen.getByRole("combobox", { name: "Select a ledger" }));

    const ledgerList = await screen.findByRole("listbox");
    const createButton = screen.getByRole("button", { name: "Create Ledger" });
    const manageButton = screen.getByRole("button", {
      name: "Manage your Beancount ledgers",
    });

    expect(ledgerList).toHaveClass(
      "min-h-0",
      "flex-1",
      "max-h-[300px]",
      "overflow-y-auto",
    );
    expect(ledgerList).not.toContainElement(createButton);
    expect(ledgerList).not.toContainElement(manageButton);
    expect(createButton.parentElement).toHaveClass(
      "shrink-0",
      "border-t",
      "bg-popover",
    );
  });
});
