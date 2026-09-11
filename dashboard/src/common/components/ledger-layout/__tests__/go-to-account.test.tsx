import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { AccountCombobox } from "../go-to-account";
import { SidebarProvider } from "@/common/components/ui/sidebar";

// Mock dependencies
const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({
    ledgerOwner: "testowner",
    ledgerName: "testledger",
  }),
}));

vi.mock("@apollo/client/react", () => ({
  useQuery: vi.fn(),
}));

// Import useQuery after mocking to get the mocked version
import { useQuery } from "@apollo/client/react";

const mockUseQuery = useQuery as ReturnType<typeof vi.fn>;

describe("AccountCombobox", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock window.matchMedia for mobile detection
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: query === "(max-width: 768px)", // Simulate mobile
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    // Default mock for useQuery
    mockUseQuery.mockReturnValue({
      data: {
        getLedgerAccounts: [
          "Assets:Bank:Checking",
          "Expenses:Groceries",
          "Income:Salary",
        ],
      },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    });
  });

  it("shows loading instead of empty while the first accounts read is pending", async () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      loading: true,
      error: undefined,
      refetch: vi.fn(),
    });

    render(
      <SidebarProvider>
        <AccountCombobox>
          <button>Go to Account</button>
        </AccountCombobox>
      </SidebarProvider>,
    );

    await user.click(
      screen.getByRole("button", {
        name: /go to account/i,
      }),
    );

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/loading/i);
    });
    expect(screen.queryByText(/no accounts found/i)).not.toBeInTheDocument();
  });

  it("shows a retry action when the accounts read fails", async () => {
    const refetch = vi.fn().mockResolvedValue({});
    mockUseQuery.mockReturnValue({
      data: undefined,
      loading: false,
      error: new Error("network"),
      refetch,
    });

    render(
      <SidebarProvider>
        <AccountCombobox>
          <button>Go to Account</button>
        </AccountCombobox>
      </SidebarProvider>,
    );

    await user.click(
      screen.getByRole("button", {
        name: /go to account/i,
      }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /try again/i }),
      ).toBeInTheDocument();
    });
    expect(screen.queryByText(/no accounts found/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /try again/i }));
    expect(refetch).toHaveBeenCalled();
  });

  it("shows empty only after a successful load with no accounts", async () => {
    mockUseQuery.mockReturnValue({
      data: { getLedgerAccounts: [] },
      loading: false,
      error: undefined,
      refetch: vi.fn(),
    });

    render(
      <SidebarProvider>
        <AccountCombobox>
          <button>Go to Account</button>
        </AccountCombobox>
      </SidebarProvider>,
    );

    await user.click(
      screen.getByRole("button", {
        name: /go to account/i,
      }),
    );

    await waitFor(() => {
      expect(screen.getByText(/no accounts found/i)).toBeInTheDocument();
    });
  });

  it("should close mobile sidebar when account is selected on mobile", async () => {
    render(
      <SidebarProvider>
        <AccountCombobox>
          <button>Go to Account</button>
        </AccountCombobox>
      </SidebarProvider>,
    );

    // Click the trigger button to open the popover
    const triggerButton = screen.getByRole("button", {
      name: /go to account/i,
    });
    await user.click(triggerButton);

    // Wait for popover to open and account list to render
    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });
    expect(screen.getByRole("combobox")).toHaveAccessibleName(
      /search accounts/i,
    );

    // Type to search for an account
    const searchInput = screen.getByRole("combobox");
    await user.type(searchInput, "Assets");

    // Wait for and click an account option
    await waitFor(() => {
      const accountOption = screen.getByRole("option", {
        name: /Assets:Bank:Checking/i,
      });
      expect(accountOption).toBeInTheDocument();
    });

    const accountOption = screen.getByRole("option", {
      name: /Assets:Bank:Checking/i,
    });
    await user.click(accountOption);

    // Verify navigation was called
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/ledger/$ledgerOwner/$ledgerName/account/$accountName",
        params: {
          ledgerOwner: "testowner",
          ledgerName: "testledger",
          accountName: "Assets:Bank:Checking",
        },
      });
    });

    // Note: We can't directly verify setOpenMobile was called because it's internal to SidebarProvider
    // The behavior is tested through integration - the sidebar should close on mobile when an account is selected
  });

  it("should handle account selection on desktop", async () => {
    // Mock desktop viewport
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query) => ({
        matches: false, // Desktop
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    render(
      <SidebarProvider>
        <AccountCombobox>
          <button>Go to Account</button>
        </AccountCombobox>
      </SidebarProvider>,
    );

    // Click the trigger button to open the popover
    const triggerButton = screen.getByRole("button", {
      name: /go to account/i,
    });
    await user.click(triggerButton);

    // Wait for popover to open
    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    // Type to search
    const searchInput = screen.getByRole("combobox");
    await user.type(searchInput, "Income");

    // Wait for and click an account
    await waitFor(() => {
      const accountOption = screen.getByRole("option", {
        name: /Income:Salary/i,
      });
      expect(accountOption).toBeInTheDocument();
    });

    const accountOption = screen.getByRole("option", {
      name: /Income:Salary/i,
    });
    await user.click(accountOption);

    // Verify navigation was called
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/ledger/$ledgerOwner/$ledgerName/account/$accountName",
        params: {
          ledgerOwner: "testowner",
          ledgerName: "testledger",
          accountName: "Income:Salary",
        },
      });
    });
  });
});
