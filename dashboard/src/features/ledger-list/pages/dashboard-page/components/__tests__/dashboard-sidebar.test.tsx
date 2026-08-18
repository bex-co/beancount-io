import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as apolloClient from "@apollo/client/react";
import { toast } from "sonner";
import { DashboardSidebar } from "../dashboard-sidebar";
import { SidebarProvider } from "@/common/components/ui/sidebar.tsx";
import {
  ListLedgersDocument,
  GetCurrentUserDocument,
  CreateLedgerDocument,
  UpdateLedgerDocument,
  DeleteLedgerDocument,
  type ListLedgersQuery,
  type CreateLedgerMutation,
  type UpdateLedgerMutation,
  type DeleteLedgerMutation,
  type GetCurrentUserQuery,
} from "@/graphql/definitions";
import {
  createMockQueryResult,
  createMockMutationTuple,
  type MockQueryResult,
} from "@/test/apollo-test-utils";

// Mock dependencies
const mockUseNavigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockUseNavigate(),
}));

vi.mock("@apollo/client/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useApolloClient: vi.fn(() => ({
    cache: {
      evict: vi.fn(),
      gc: vi.fn(),
    },
  })),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock ReactNativeBridgeProvider context (used by LimitIndicator in LedgerForm)
vi.mock(
  "@/common/providers/react-native-bridge-provider/react-native-bridge-context",
  () => ({
    useReactNativeContext: () => ({ isReactNative: false }),
  }),
);

type ListLedgerItem = ListLedgersQuery["listLedgers"][number];
type ListLedgersQueryResult = MockQueryResult<ListLedgersQuery>;

function makeLedger(overrides: Partial<ListLedgerItem> = {}): ListLedgerItem {
  return {
    __typename: "Ledger",
    id: "alice/personal",
    name: "Personal",
    fullName: "alice/personal",
    httpUrl: "https://example.com/alice/personal",
    sshUrl: "git@example.com:alice/personal",
    private: true,
    empty: false,
    size: 1024,
    createdAt: new Date("2024-01-01T10:00:00Z").toISOString(),
    updatedAt: new Date("2024-01-15T10:00:00Z").toISOString(),
    description: null,
    permissions: {
      __typename: "Permission",
      admin: true,
      pull: true,
      push: true,
    },
    ...overrides,
  };
}

const mockUserResult: MockQueryResult<GetCurrentUserQuery> =
  createMockQueryResult({
    data: {
      userProfile: {
        __typename: "UserProfileResponse",
        id: "user-1",
        tier: "FREE",
        username: "alice",
        email: "alice@example.com",
        firstName: null,
        lastName: null,
        locale: "en",
        emailReportStatus: null,
        hasEverSubscribed: false,
        limits: {
          __typename: "UserLimits",
          ledgersUsed: 1,
          ledgersMax: 3,
          collaboratorsPerLedgerMax: 2,
          maxDirectives: 1000,
        },
      },
    },
  });

const adminLedger = makeLedger({
  id: "alice/personal",
  name: "Personal",
  description: "Household books",
  private: true,
  permissions: {
    __typename: "Permission",
    admin: true,
    pull: true,
    push: true,
  },
});

const viewerLedger = makeLedger({
  id: "bob/shared-books",
  name: "Shared Books",
  fullName: "bob/shared-books",
  private: false,
  description: null,
  updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  permissions: {
    __typename: "Permission",
    admin: false,
    pull: true,
    push: false,
  },
});

describe("DashboardSidebar", () => {
  const mockNavigate = vi.fn();
  const mockRefetch = vi.fn();
  const mockCreateMutation = vi.fn();
  const mockUpdateMutation = vi.fn();
  const mockDeleteMutation = vi.fn();

  let originalMatchMedia: typeof window.matchMedia;

  function setLedgerQueryResult(
    overrides: Partial<ListLedgersQueryResult> = {},
  ) {
    const ledgerResult = createMockQueryResult<ListLedgersQuery>({
      refetch: mockRefetch,
      ...overrides,
    });

    vi.mocked(apolloClient.useQuery).mockImplementation(((
      document: unknown,
    ): unknown => {
      if (document === GetCurrentUserDocument) return mockUserResult;
      if (document === ListLedgersDocument) return ledgerResult;
      throw new Error("Unexpected query document");
    }) as never);
  }

  function renderSidebar() {
    return render(
      <SidebarProvider>
        <DashboardSidebar />
      </SidebarProvider>,
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseNavigate.mockReturnValue(mockNavigate);

    // SidebarProvider relies on matchMedia via useIsMobile; jsdom lacks it
    originalMatchMedia = window.matchMedia;
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: (query: string): MediaQueryList => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    });

    vi.mocked(apolloClient.useMutation).mockImplementation(((
      document: unknown,
    ): unknown => {
      if (document === CreateLedgerDocument) {
        return createMockMutationTuple<CreateLedgerMutation>(
          mockCreateMutation,
        );
      }
      if (document === UpdateLedgerDocument) {
        return createMockMutationTuple<UpdateLedgerMutation>(
          mockUpdateMutation,
        );
      }
      if (document === DeleteLedgerDocument) {
        return createMockMutationTuple<DeleteLedgerMutation>(
          mockDeleteMutation,
        );
      }
      throw new Error("Unexpected mutation document");
    }) as never);
  });

  afterEach(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: originalMatchMedia,
    });
  });

  describe("loading state", () => {
    it("renders an aria-busy skeleton with 3 rows by default", () => {
      setLedgerQueryResult({ data: undefined, loading: true });

      const { container } = renderSidebar();

      const busyContainer = container.querySelector('[aria-busy="true"]');
      expect(busyContainer).toBeInTheDocument();
      expect(
        busyContainer?.querySelectorAll('[data-sidebar="menu-skeleton"]'),
      ).toHaveLength(3);
      // Real rows must not render while loading
      expect(screen.queryByTestId("ledger-item")).not.toBeInTheDocument();
    });

    it("sizes the skeleton by the cached ledger count when available", () => {
      setLedgerQueryResult({
        data: { listLedgers: [adminLedger, viewerLedger] },
        loading: true,
      });

      const { container } = renderSidebar();

      const busyContainer = container.querySelector('[aria-busy="true"]');
      expect(busyContainer).toBeInTheDocument();
      expect(
        busyContainer?.querySelectorAll('[data-sidebar="menu-skeleton"]'),
      ).toHaveLength(2);
    });
  });

  describe("error state", () => {
    it("shows the error message and retries via refetch", async () => {
      const user = userEvent.setup();
      setLedgerQueryResult({
        data: undefined,
        loading: false,
        error: new Error("Network error"),
      });

      renderSidebar();

      expect(screen.getByText("Failed to Load Ledgers")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Retry" }));
      expect(mockRefetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("empty state", () => {
    it("renders the shared EmptyState with icon, title and description", () => {
      setLedgerQueryResult({ data: { listLedgers: [] }, loading: false });

      const { container } = renderSidebar();

      expect(screen.getByText("No ledgers found")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Create your first ledger to start tracking your finances.",
        ),
      ).toBeInTheDocument();
      // EmptyState renders the requested BookOpen icon
      expect(
        container.querySelector("svg.lucide-book-open"),
      ).toBeInTheDocument();
    });

    it("opens the create dialog from the empty-state CTA", async () => {
      const user = userEvent.setup();
      setLedgerQueryResult({ data: { listLedgers: [] }, loading: false });

      renderSidebar();

      await user.click(screen.getByTestId("empty-state-create-ledger-btn"));

      expect(
        await screen.findByTestId("create-ledger-dialog"),
      ).toBeInTheDocument();
      expect(screen.getByText("Create New Ledger")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Create a new Beancount ledger to start managing your finances.",
        ),
      ).toBeInTheDocument();
    });
  });

  describe("populated rows", () => {
    it("renders visibility icons, names, and owner · meta lines", () => {
      setLedgerQueryResult({
        data: { listLedgers: [adminLedger, viewerLedger] },
        loading: false,
      });

      renderSidebar();

      expect(screen.getAllByTestId("ledger-item")).toHaveLength(2);

      // Private ledger → Lock icon with accessible label
      const privateIcon = screen.getByRole("img", { name: "Private" });
      expect(privateIcon).toHaveClass("lucide-lock");

      // Public ledger → Globe icon with accessible label
      const publicIcon = screen.getByRole("img", { name: "Public" });
      expect(publicIcon).toHaveClass("lucide-globe");

      // Name line shows the name decoded from the ledger id
      expect(screen.getByText("personal")).toBeInTheDocument();
      expect(screen.getByText("shared-books")).toBeInTheDocument();

      // Meta line prefers the description
      expect(screen.getByText("alice · Household books")).toBeInTheDocument();
    });

    it("falls back to relative updatedAt in the meta line when description is missing", () => {
      setLedgerQueryResult({
        data: { listLedgers: [viewerLedger] },
        loading: false,
      });

      renderSidebar();

      expect(screen.getByText(/bob · .* ago/)).toBeInTheDocument();
    });

    it("shows the full name text in a tooltip on hover", async () => {
      const user = userEvent.setup();
      setLedgerQueryResult({
        data: { listLedgers: [adminLedger] },
        loading: false,
      });

      renderSidebar();

      await user.hover(screen.getByText("personal"));

      const tooltip = await screen.findByRole("tooltip");
      expect(tooltip).toHaveTextContent("personal");
    });

    it("navigates to the ledger when a row is clicked", async () => {
      const user = userEvent.setup();
      setLedgerQueryResult({
        data: { listLedgers: [adminLedger] },
        loading: false,
      });

      renderSidebar();

      await user.click(screen.getByText("personal"));

      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/ledger/alice/personal",
      });
    });

    it("renders the settings dropdown only for ledgers with admin permission", () => {
      setLedgerQueryResult({
        data: { listLedgers: [adminLedger, viewerLedger] },
        loading: false,
      });

      renderSidebar();

      const settingsButtons = screen.getAllByTestId("ledger-settings-btn");
      expect(settingsButtons).toHaveLength(1);

      // The single settings button belongs to the admin ledger's row
      const adminRow = screen.getByText("personal").closest("li");
      expect(adminRow).not.toBeNull();
      expect(
        within(adminRow as HTMLElement).getByTestId("ledger-settings-btn"),
      ).toBeInTheDocument();

      const viewerRow = screen.getByText("shared-books").closest("li");
      expect(viewerRow).not.toBeNull();
      expect(
        within(viewerRow as HTMLElement).queryByTestId("ledger-settings-btn"),
      ).not.toBeInTheDocument();
    });
  });

  describe("create ledger flow", () => {
    async function openDialogAndSubmit(name: string) {
      const user = userEvent.setup();
      await user.click(screen.getByTestId("create-ledger-btn"));

      const nameInput = await screen.findByLabelText("Ledger Name");
      await user.tripleClick(nameInput);
      await user.keyboard(name);
      await user.click(screen.getByRole("button", { name: "Save" }));
      return user;
    }
    it("creates the ledger, toasts, closes the dialog, and navigates to it", async () => {
      setLedgerQueryResult({ data: { listLedgers: [] }, loading: false });
      mockCreateMutation.mockResolvedValue({
        data: {
          createLedger: makeLedger({
            id: "alice/new-ledger",
            name: "new-ledger",
            fullName: "alice/new-ledger",
          }),
        },
      });

      renderSidebar();
      await openDialogAndSubmit("New Ledger");

      await waitFor(() => {
        expect(mockCreateMutation).toHaveBeenCalledWith({
          variables: {
            name: "new-ledger",
            description: undefined,
            private: true,
          },
        });
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith({
          to: "/ledger/alice/new-ledger",
        });
      });
      expect(toast.success).toHaveBeenCalledWith("Ledger created successfully");

      await waitFor(() => {
        expect(
          screen.queryByTestId("create-ledger-dialog"),
        ).not.toBeInTheDocument();
      });
    });

    it("shows an error toast and does not navigate when creation fails", async () => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      setLedgerQueryResult({ data: { listLedgers: [] }, loading: false });
      mockCreateMutation.mockRejectedValue(new Error("boom"));

      renderSidebar();
      await openDialogAndSubmit("New Ledger");

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
      expect(mockNavigate).not.toHaveBeenCalled();
      // Dialog stays open so the user can fix and retry
      expect(screen.getByTestId("create-ledger-dialog")).toBeInTheDocument();

      consoleError.mockRestore();
    });
  });

  describe("accessibility", () => {
    it("gives the home control an accessible name and a decorative logo", () => {
      setLedgerQueryResult({ data: { listLedgers: [] }, loading: false });

      renderSidebar();

      const homeButton = screen.getByRole("button", {
        name: "Go to dashboard",
      });
      expect(homeButton.querySelector("img")).toHaveAttribute("alt", "");
    });

    it("keeps the settings trigger out of the row navigation button", () => {
      setLedgerQueryResult({
        data: { listLedgers: [adminLedger] },
        loading: false,
      });

      renderSidebar();

      // No interactive element is nested inside the row button
      const rowButton = screen.getByText("personal").closest("button");
      expect(rowButton).not.toBeNull();
      expect(
        within(rowButton as HTMLElement).queryByRole("button"),
      ).not.toBeInTheDocument();

      // The settings trigger is a sibling within the same list item
      const row = screen.getByText("personal").closest("li");
      expect(
        within(row as HTMLElement).getByTestId("ledger-settings-btn"),
      ).toBeInTheDocument();
    });

    it("puts no extra tab stop between the row button and its settings action", async () => {
      const user = userEvent.setup();
      setLedgerQueryResult({
        data: { listLedgers: [adminLedger] },
        loading: false,
      });

      renderSidebar();

      // The truncation tooltips must not make the row's text focusable
      const rowButton = screen.getByText("personal").closest("button");
      (rowButton as HTMLElement).focus();
      await user.tab();

      expect(document.activeElement).toBe(
        screen.getByTestId("ledger-settings-btn"),
      );
    });

    it("gives the icon-only settings trigger an accessible name and a 24px target", () => {
      setLedgerQueryResult({
        data: { listLedgers: [adminLedger] },
        loading: false,
      });

      renderSidebar();

      const trigger = screen.getByRole("button", { name: "Settings" });
      expect(trigger).toHaveAttribute("title", "Settings");
      expect(trigger.className).toContain("h-6");
      expect(trigger.className).toContain("w-6");
    });

    it("navigates to the ledger when the row is activated by keyboard", async () => {
      const user = userEvent.setup();
      setLedgerQueryResult({
        data: { listLedgers: [adminLedger] },
        loading: false,
      });

      renderSidebar();

      const rowButton = screen.getByText("personal").closest("button");
      (rowButton as HTMLElement).focus();
      await user.keyboard("{Enter}");

      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/ledger/alice/personal",
      });
    });

    it("opens the settings dropdown by keyboard", async () => {
      const user = userEvent.setup();
      setLedgerQueryResult({
        data: { listLedgers: [adminLedger] },
        loading: false,
      });

      renderSidebar();

      screen.getByTestId("ledger-settings-btn").focus();
      await user.keyboard("{Enter}");

      expect(
        await screen.findByRole("menuitem", { name: "Edit Ledger" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("menuitem", { name: "Delete Ledger" }),
      ).toBeInTheDocument();
    });
  });

  describe("delete ledger flow", () => {
    async function openDeleteDialog(user: ReturnType<typeof userEvent.setup>) {
      await user.click(screen.getByTestId("ledger-settings-btn"));
      await user.click(await screen.findByTestId("delete-ledger-menu-item"));
    }

    it("announces the irreversible consequence and focuses the safe action", async () => {
      const user = userEvent.setup();
      setLedgerQueryResult({
        data: { listLedgers: [adminLedger] },
        loading: false,
      });

      renderSidebar();
      await openDeleteDialog(user);

      const dialog = await screen.findByRole("alertdialog");
      expect(dialog).toHaveAccessibleName("Delete Ledger");
      expect(dialog).toHaveAccessibleDescription(
        'Are you sure you want to delete "Personal"? This action cannot be undone.',
      );

      // Initial focus lands on the safe (cancel) action, not Delete
      await waitFor(() => {
        expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
      });
    });

    it("deletes the ledger on confirm and closes the dialog", async () => {
      const user = userEvent.setup();
      setLedgerQueryResult({
        data: { listLedgers: [adminLedger] },
        loading: false,
      });
      mockDeleteMutation.mockResolvedValue({
        data: {
          deleteLedger: {
            __typename: "DeleteLedgerResponse",
            ledgerId: "alice/personal",
          },
        },
      });

      renderSidebar();
      await openDeleteDialog(user);

      await user.click(screen.getByTestId("delete-ledger-confirm-btn"));

      await waitFor(() => {
        expect(mockDeleteMutation).toHaveBeenCalledWith({
          variables: { ledgerId: "alice/personal" },
        });
      });
      await waitFor(() => {
        expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      });
      expect(toast.success).toHaveBeenCalledWith("Ledger deleted successfully");
    });

    it("Escape closes the dialog without deleting and returns focus to the trigger", async () => {
      const user = userEvent.setup();
      setLedgerQueryResult({
        data: { listLedgers: [adminLedger] },
        loading: false,
      });

      renderSidebar();

      // Open the dialog by keyboard so Radix captures the trigger as the
      // focus-restore target: Enter opens the menu, ArrowDown reaches Delete.
      const trigger = screen.getByTestId("ledger-settings-btn");
      trigger.focus();
      await user.keyboard("{Enter}");
      await user.keyboard("{ArrowDown}");
      await user.keyboard("{Enter}");
      await screen.findByRole("alertdialog");

      await user.keyboard("{Escape}");

      await waitFor(() => {
        expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      });
      expect(mockDeleteMutation).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(trigger).toHaveFocus();
      });
    });
  });
});
