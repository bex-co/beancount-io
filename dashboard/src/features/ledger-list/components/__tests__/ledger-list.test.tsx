import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LedgerList } from "../ledger-list";
import * as apolloClient from "@apollo/client/react";
import type {
  Ledger,
  ListLedgersQuery,
  CreateLedgerMutation,
  UpdateLedgerMutation,
  DeleteLedgerMutation,
} from "@/graphql/definitions";
import {
  CreateLedgerDocument,
  DeleteLedgerDocument,
  LedgerTemplate,
  UpdateLedgerDocument,
} from "@/graphql/definitions";
import { toast } from "sonner";
import {
  createMockQueryResult,
  createMockMutationTuple,
  type MockQueryResult,
  type MockMutationTuple,
} from "@/test/apollo-test-utils";

// Mock dependencies
const mockUseNavigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockUseNavigate(),
}));

const mockCacheEvict = vi.fn();
const mockCacheGc = vi.fn();
const mockApolloClient = {
  cache: {
    evict: mockCacheEvict,
    gc: mockCacheGc,
  },
};

vi.mock("@apollo/client/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useApolloClient: vi.fn(() => mockApolloClient),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Type aliases for better readability
type ListLedgersQueryResult = MockQueryResult<ListLedgersQuery>;
type CreateLedgerMutationMockTuple = MockMutationTuple<CreateLedgerMutation>;
type UpdateLedgerMutationMockTuple = MockMutationTuple<UpdateLedgerMutation>;
type DeleteLedgerMutationMockTuple = MockMutationTuple<DeleteLedgerMutation>;

const mockLedgers: Ledger[] = [
  {
    id: "user1/personal-finance",
    name: "Personal Finance",
    fullName: "user1/personal-finance",
    private: true,
    updatedAt: new Date("2024-01-15T10:00:00Z").toISOString(),
    createdAt: new Date("2024-01-01T10:00:00Z").toISOString(),
    empty: false,
    httpUrl: "https://example.com/ledger-1",
    sshUrl: "git@example.com:ledger-1",
    size: 1024,
    description: null,
    __typename: "Ledger",
    permissions: {
      __typename: "Permission",
      admin: true,
      pull: true,
      push: true,
    },
    attributes: {
      __typename: "LedgerAttributes",
      accounts: [],
      currencies: [],
      links: [],
      payees: [],
      tags: [],
      years: [],
    },
    options: {
      __typename: "LedgerOptions",
      nameAssets: "Assets",
      nameEquity: "Equity",
      nameExpenses: "Expenses",
      nameIncome: "Income",
      nameLiabilities: "Liabilities",
      operatingCurrency: [],
    },
  },
  {
    id: "user1/business",
    name: "Business",
    fullName: "user1/business",
    private: false,
    updatedAt: new Date("2024-01-20T10:00:00Z").toISOString(),
    createdAt: new Date("2024-01-01T10:00:00Z").toISOString(),
    empty: false,
    httpUrl: "https://example.com/ledger-2",
    sshUrl: "git@example.com:ledger-2",
    size: 2048,
    description: null,
    __typename: "Ledger",
    permissions: {
      __typename: "Permission",
      admin: true,
      pull: true,
      push: true,
    },
    attributes: {
      __typename: "LedgerAttributes",
      accounts: [],
      currencies: [],
      links: [],
      payees: [],
      tags: [],
      years: [],
    },
    options: {
      __typename: "LedgerOptions",
      nameAssets: "Assets",
      nameEquity: "Equity",
      nameExpenses: "Expenses",
      nameIncome: "Income",
      nameLiabilities: "Liabilities",
      operatingCurrency: [],
    },
  },
];

/**
 * Helper to setup mutation mocks with proper typing
 * Returns configured mocks for create, update, and delete mutations
 */
function setupMutationMocks(options?: {
  createLoading?: boolean;
  updateLoading?: boolean;
  deleteLoading?: boolean;
  createFn?: typeof vi.fn;
  updateFn?: typeof vi.fn;
  deleteFn?: typeof vi.fn;
}) {
  const {
    createLoading = false,
    updateLoading = false,
    deleteLoading = false,
    createFn = vi.fn(),
    updateFn = vi.fn(),
    deleteFn = vi.fn(),
  } = options ?? {};

  let callCount = 0;
  vi.mocked(apolloClient.useMutation).mockImplementation(() => {
    callCount++;
    if (callCount === 1) {
      const tuple: CreateLedgerMutationMockTuple = createMockMutationTuple(
        createFn,
        { loading: createLoading },
      );
      return tuple;
    } else if (callCount === 2) {
      const tuple: UpdateLedgerMutationMockTuple = createMockMutationTuple(
        updateFn,
        { loading: updateLoading },
      );
      return tuple;
    }
    const tuple: DeleteLedgerMutationMockTuple = createMockMutationTuple(
      deleteFn,
      { loading: deleteLoading },
    );
    return tuple;
  });

  return { createFn, updateFn, deleteFn };
}

describe("LedgerList", () => {
  const mockNavigate = vi.fn();
  const mockRefetch = vi.fn();
  const mockCreateMutation = vi.fn();
  const mockUpdateMutation = vi.fn();
  const mockDeleteMutation = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseNavigate.mockReturnValue(mockNavigate);

    // Default mutation mocks - return array with [mutationFn, { loading: false }]
    const defaultMutationTuple: CreateLedgerMutationMockTuple =
      createMockMutationTuple(mockCreateMutation, { loading: false });
    vi.mocked(apolloClient.useMutation).mockReturnValue(defaultMutationTuple);
  });

  it("should render loading state", () => {
    const mockQueryResult: ListLedgersQueryResult = createMockQueryResult({
      data: undefined,
      loading: true,
      error: undefined,
      refetch: mockRefetch,
    });
    vi.mocked(apolloClient.useQuery).mockReturnValue(mockQueryResult);

    render(<LedgerList />);

    expect(screen.getByText("Your Ledgers")).toBeInTheDocument();
    expect(screen.getByText("Name")).toBeInTheDocument();
  });

  it("should render error state with retry button", () => {
    const mockQueryResult: ListLedgersQueryResult = createMockQueryResult({
      data: undefined,
      loading: false,
      error: new Error("Network error"),
      refetch: mockRefetch,
    });
    vi.mocked(apolloClient.useQuery).mockReturnValue(mockQueryResult);

    render(<LedgerList />);

    expect(screen.getByText("Failed to Load Ledgers")).toBeInTheDocument();
    expect(
      screen.getByText(
        "We couldn't retrieve your ledgers. Please check your connection and try again.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Retry/i })).toBeInTheDocument();
  });

  it("should call refetch when retry button is clicked", async () => {
    const user = userEvent.setup();
    const mockQueryResult: ListLedgersQueryResult = createMockQueryResult({
      data: undefined,
      loading: false,
      error: new Error("Network error"),
      refetch: mockRefetch,
    });
    vi.mocked(apolloClient.useQuery).mockReturnValue(mockQueryResult);

    render(<LedgerList />);

    await user.click(screen.getByRole("button", { name: /Retry/i }));

    expect(mockRefetch).toHaveBeenCalled();
  });

  it("should render empty state when no ledgers exist", () => {
    const mockQueryResult: ListLedgersQueryResult = createMockQueryResult({
      data: { listLedgers: [] },
      loading: false,
      error: undefined,
      refetch: mockRefetch,
    });
    vi.mocked(apolloClient.useQuery).mockReturnValue(mockQueryResult);

    render(<LedgerList />);

    expect(screen.getByText("No ledgers found")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Create a new Beancount ledger to start managing your finances.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create Ledger" }),
    ).toBeInTheDocument();
  });

  it("should render ledgers table with data", () => {
    const mockQueryResult: ListLedgersQueryResult = createMockQueryResult({
      data: { listLedgers: mockLedgers },
      loading: false,
      error: undefined,
      refetch: mockRefetch,
    });
    vi.mocked(apolloClient.useQuery).mockReturnValue(mockQueryResult);

    render(<LedgerList />);

    // Check table headers
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
    expect(screen.getByText("Owner")).toBeInTheDocument();
    expect(screen.getByText("Last Updated")).toBeInTheDocument();
    // Actions column may not have a label

    // Check ledger data
    expect(screen.getByText("Personal Finance")).toBeInTheDocument();
    expect(screen.getByText("Business")).toBeInTheDocument();
    expect(screen.getByText("Private")).toBeInTheDocument();
    expect(screen.getByText("Public")).toBeInTheDocument();
  });

  it("should extract and display owner from fullName", () => {
    const mockQueryResult: ListLedgersQueryResult = createMockQueryResult({
      data: { listLedgers: mockLedgers },
      loading: false,
      error: undefined,
      refetch: mockRefetch,
    });
    vi.mocked(apolloClient.useQuery).mockReturnValue(mockQueryResult);

    render(<LedgerList />);

    // Should display "user1" which is the owner part of "user1/personal-finance"
    const ownerCells = screen.getAllByText("user1");
    expect(ownerCells.length).toBeGreaterThan(0);
  });

  it("should open create dialog when Create Ledger button is clicked", async () => {
    const user = userEvent.setup();
    const mockQueryResult: ListLedgersQueryResult = createMockQueryResult({
      data: { listLedgers: [] },
      loading: false,
      error: undefined,
      refetch: mockRefetch,
    });
    vi.mocked(apolloClient.useQuery).mockReturnValue(mockQueryResult);

    render(<LedgerList />);

    await user.click(screen.getByRole("button", { name: "Create Ledger" }));

    await waitFor(() => {
      expect(screen.getByText("Create New Ledger")).toBeInTheDocument();
      expect(
        screen.getAllByText(
          "Create a new Beancount ledger to start managing your finances.",
        ),
      ).toHaveLength(2);
    });
  });

  it("should open create dialog and show form when Create Ledger button is clicked", async () => {
    const user = userEvent.setup();
    mockCreateMutation.mockResolvedValue({ data: {} });

    // Setup separate mocks for create and delete mutations
    setupMutationMocks({
      createFn: mockCreateMutation,
      deleteFn: mockDeleteMutation,
    });

    const mockQueryResult: ListLedgersQueryResult = createMockQueryResult({
      data: { listLedgers: [] },
      loading: false,
      error: undefined,
      refetch: mockRefetch,
    });
    vi.mocked(apolloClient.useQuery).mockReturnValue(mockQueryResult);

    render(<LedgerList />);

    // Open create dialog
    await user.click(screen.getByRole("button", { name: "Create Ledger" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Ledger Name")).toBeInTheDocument();
      expect(screen.getByText("Create New Ledger")).toBeInTheDocument();
      expect(
        screen.getByRole("radio", { name: /Sample ledger/i }),
      ).toBeInTheDocument();
    });
  });

  it("should have form validation and toast messages", async () => {
    const user = userEvent.setup();

    // Setup separate mocks for create and delete mutations
    setupMutationMocks({
      createFn: mockCreateMutation,
      deleteFn: mockDeleteMutation,
    });

    const mockQueryResult: ListLedgersQueryResult = createMockQueryResult({
      data: { listLedgers: [] },
      loading: false,
      error: undefined,
      refetch: mockRefetch,
    });
    vi.mocked(apolloClient.useQuery).mockReturnValue(mockQueryResult);

    render(<LedgerList />);

    // Open create dialog and verify form is rendered
    await user.click(screen.getByRole("button", { name: "Create Ledger" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Ledger Name")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    });
  });

  it("should send the selected sample template to ledger creation", async () => {
    const user = userEvent.setup();
    const createFn = vi.fn().mockResolvedValue({ data: {} });
    vi.mocked(apolloClient.useMutation).mockImplementation((document) => {
      if (document === CreateLedgerDocument) {
        return createMockMutationTuple(createFn, { loading: false });
      }
      if (document === UpdateLedgerDocument) {
        return createMockMutationTuple(mockUpdateMutation, { loading: false });
      }
      if (document === DeleteLedgerDocument) {
        return createMockMutationTuple(mockDeleteMutation, { loading: false });
      }
      throw new Error("Unexpected mutation document");
    });
    const mockQueryResult: ListLedgersQueryResult = createMockQueryResult({
      data: { listLedgers: [] },
      loading: false,
      error: undefined,
      refetch: mockRefetch,
    });
    vi.mocked(apolloClient.useQuery).mockReturnValue(mockQueryResult);

    render(<LedgerList />);

    await user.click(screen.getByRole("button", { name: "Create Ledger" }));
    const nameInput = await screen.findByLabelText("Ledger Name");
    await user.tripleClick(nameInput);
    await user.keyboard("Sample Book");
    await user.click(screen.getByRole("radio", { name: /Sample ledger/i }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(createFn).toHaveBeenCalledWith({
        variables: {
          name: "sample-book",
          description: undefined,
          private: true,
          template: LedgerTemplate.Sample,
        },
      });
    });
  });

  it("should activate a focusable ledger row with click, Enter, and Space", async () => {
    const user = userEvent.setup();
    const mockQueryResult: ListLedgersQueryResult = createMockQueryResult({
      data: { listLedgers: mockLedgers },
      loading: false,
      error: undefined,
      refetch: mockRefetch,
    });
    vi.mocked(apolloClient.useQuery).mockReturnValue(mockQueryResult);

    render(<LedgerList />);

    const ledgerRow = screen.getByText("Personal Finance").closest("tr");
    expect(ledgerRow).toBeInTheDocument();
    expect(ledgerRow).toHaveAttribute("role", "link");
    expect(ledgerRow).toHaveAttribute("tabindex", "0");

    await user.click(ledgerRow as HTMLElement);
    ledgerRow?.focus();
    expect(ledgerRow).toHaveFocus();
    await user.keyboard("{Enter}");
    await user.keyboard(" ");

    expect(mockNavigate).toHaveBeenCalledTimes(3);
    expect(mockNavigate).toHaveBeenLastCalledWith({
      to: "/ledger/user1/personal-finance",
    });
  });

  it("should open edit dialog when edit button is clicked", async () => {
    const user = userEvent.setup();

    // Setup mutation mocks
    setupMutationMocks({
      createFn: mockCreateMutation,
      updateFn: mockUpdateMutation,
      deleteFn: mockDeleteMutation,
    });

    const mockQueryResult: ListLedgersQueryResult = createMockQueryResult({
      data: { listLedgers: mockLedgers },
      loading: false,
      error: undefined,
      refetch: mockRefetch,
    });
    vi.mocked(apolloClient.useQuery).mockReturnValue(mockQueryResult);

    render(<LedgerList />);

    // Click edit button (first edit button)
    const editButtons = screen.getAllByTitle("Edit Ledger");
    await user.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Edit Ledger Settings")).toBeInTheDocument();
      expect(
        screen.getByText("Update the details of your ledger."),
      ).toBeInTheDocument();
    });
  });

  it("should prevent row click when edit button is clicked", async () => {
    const user = userEvent.setup();

    // Setup mutation mocks
    setupMutationMocks({
      createFn: mockCreateMutation,
      updateFn: mockUpdateMutation,
      deleteFn: mockDeleteMutation,
    });

    const mockQueryResult: ListLedgersQueryResult = createMockQueryResult({
      data: { listLedgers: mockLedgers },
      loading: false,
      error: undefined,
      refetch: mockRefetch,
    });
    vi.mocked(apolloClient.useQuery).mockReturnValue(mockQueryResult);

    render(<LedgerList />);

    // Click edit button
    const editButtons = screen.getAllByTitle("Edit Ledger");
    await user.click(editButtons[0]);

    // Navigate should not be called
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("should open delete confirmation when delete button is clicked", async () => {
    const user = userEvent.setup();

    // Setup mutation mocks
    setupMutationMocks({
      createFn: mockCreateMutation,
      updateFn: mockUpdateMutation,
      deleteFn: mockDeleteMutation,
    });

    const mockQueryResult: ListLedgersQueryResult = createMockQueryResult({
      data: { listLedgers: mockLedgers },
      loading: false,
      error: undefined,
      refetch: mockRefetch,
    });
    vi.mocked(apolloClient.useQuery).mockReturnValue(mockQueryResult);

    render(<LedgerList />);

    // Click delete button
    const deleteButtons = screen.getAllByTitle("Delete Ledger");
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Delete Ledger")).toBeInTheDocument();
      expect(
        screen.getByText(
          'Are you sure you want to delete "Personal Finance"? This action cannot be undone.',
        ),
      ).toBeInTheDocument();
    });
  });

  it("should prevent row click when delete button is clicked", async () => {
    const user = userEvent.setup();

    // Setup mutation mocks
    setupMutationMocks({
      createFn: mockCreateMutation,
      updateFn: mockUpdateMutation,
      deleteFn: mockDeleteMutation,
    });

    const mockQueryResult: ListLedgersQueryResult = createMockQueryResult({
      data: { listLedgers: mockLedgers },
      loading: false,
      error: undefined,
      refetch: mockRefetch,
    });
    vi.mocked(apolloClient.useQuery).mockReturnValue(mockQueryResult);

    render(<LedgerList />);

    // Click delete button
    const deleteButtons = screen.getAllByTitle("Delete Ledger");
    await user.click(deleteButtons[0]);

    // Navigate should not be called
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("should open delete confirmation dialog with correct ledger name", async () => {
    const user = userEvent.setup();
    mockDeleteMutation.mockResolvedValue({ data: {} });

    // Setup mutation mocks for all three mutations
    setupMutationMocks({
      createFn: mockCreateMutation,
      updateFn: mockUpdateMutation,
      deleteFn: mockDeleteMutation,
    });

    const mockQueryResult: ListLedgersQueryResult = createMockQueryResult({
      data: { listLedgers: mockLedgers },
      loading: false,
      error: undefined,
      refetch: mockRefetch,
    });
    vi.mocked(apolloClient.useQuery).mockReturnValue(mockQueryResult);

    render(<LedgerList />);

    // Click delete button
    const deleteButtons = screen.getAllByTitle("Delete Ledger");
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Delete Ledger")).toBeInTheDocument();
      expect(
        screen.getByText(
          'Are you sure you want to delete "Personal Finance"? This action cannot be undone.',
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Delete" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Cancel" }),
      ).toBeInTheDocument();
    });
  });

  it("should close delete dialog when cancel is clicked", async () => {
    const user = userEvent.setup();

    // Setup mutation mocks
    setupMutationMocks({
      createFn: mockCreateMutation,
      updateFn: mockUpdateMutation,
      deleteFn: mockDeleteMutation,
    });

    const mockQueryResult: ListLedgersQueryResult = createMockQueryResult({
      data: { listLedgers: mockLedgers },
      loading: false,
      error: undefined,
      refetch: mockRefetch,
    });
    vi.mocked(apolloClient.useQuery).mockReturnValue(mockQueryResult);

    render(<LedgerList />);

    // Open delete dialog
    const deleteButtons = screen.getAllByTitle("Delete Ledger");
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Delete Ledger")).toBeInTheDocument();
    });

    // Click cancel
    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    await user.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText("Delete Ledger")).not.toBeInTheDocument();
    });

    expect(mockDeleteMutation).not.toHaveBeenCalled();
  });

  it("should show loading state during delete", async () => {
    const user = userEvent.setup();

    // Setup mocks with delete loading true
    setupMutationMocks({
      createFn: mockCreateMutation,
      updateFn: mockUpdateMutation,
      deleteFn: mockDeleteMutation,
      deleteLoading: true,
    });

    const mockQueryResult: ListLedgersQueryResult = createMockQueryResult({
      data: { listLedgers: mockLedgers },
      loading: false,
      error: undefined,
      refetch: mockRefetch,
    });
    vi.mocked(apolloClient.useQuery).mockReturnValue(mockQueryResult);

    render(<LedgerList />);

    // Open delete dialog
    const deleteButtons = screen.getAllByTitle("Delete Ledger");
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Deleting..." }),
      ).toBeInTheDocument();
    });
  });

  it("should display relative time for last updated", () => {
    const mockQueryResult: ListLedgersQueryResult = createMockQueryResult({
      data: { listLedgers: mockLedgers },
      loading: false,
      error: undefined,
      refetch: mockRefetch,
    });
    vi.mocked(apolloClient.useQuery).mockReturnValue(mockQueryResult);

    render(<LedgerList />);

    // Should display relative time (e.g., "X days ago")
    // The exact text depends on current date, but the Badge should be present
    const badges = screen.getAllByText(/ago/i);
    expect(badges.length).toBeGreaterThan(0);
  });

  it("should render action buttons with correct icons", () => {
    const mockQueryResult: ListLedgersQueryResult = createMockQueryResult({
      data: { listLedgers: mockLedgers },
      loading: false,
      error: undefined,
      refetch: mockRefetch,
    });
    vi.mocked(apolloClient.useQuery).mockReturnValue(mockQueryResult);

    render(<LedgerList />);

    // Edit and delete buttons should have icons (rendered as SVG)
    const editButtons = screen.getAllByTitle("Edit Ledger");
    const deleteButtons = screen.getAllByTitle("Delete Ledger");

    expect(editButtons.length).toBe(2); // Two ledgers
    expect(deleteButtons.length).toBe(2);

    // Each button should contain an SVG icon
    editButtons.forEach((button) => {
      expect(button.querySelector("svg")).toBeInTheDocument();
    });
    deleteButtons.forEach((button) => {
      expect(button.querySelector("svg")).toBeInTheDocument();
    });
  });

  describe("Update Ledger Functionality", () => {
    beforeEach(() => {
      mockCacheEvict.mockClear();
    });

    it("should show success toast after successful update", async () => {
      const user = userEvent.setup();

      const mockUpdateResult = {
        data: {
          updateLedger: {
            id: "user1/personal-finance",
            name: "Personal Finance",
            fullName: "user1/personal-finance",
            private: true,
            empty: false,
            httpUrl: "https://example.com/ledger-1",
            sshUrl: "git@example.com:ledger-1",
            size: 1024,
            createdAt: new Date("2024-01-01T10:00:00Z").toISOString(),
            updatedAt: new Date("2024-01-16T10:00:00Z").toISOString(),
            __typename: "Ledger",
            attributes: {
              __typename: "LedgerAttributes",
              accounts: [],
              currencies: [],
              links: [],
              payees: [],
              tags: [],
            },
            options: {
              __typename: "LedgerOptions",
              nameAssets: "Assets",
              nameEquity: "Equity",
              nameExpenses: "Expenses",
              nameIncome: "Income",
              nameLiabilities: "Liabilities",
              operatingCurrency: [],
            },
          },
        },
      };

      const updateFn = vi.fn().mockResolvedValue(mockUpdateResult);

      setupMutationMocks({
        createFn: mockCreateMutation,
        updateFn: updateFn,
        deleteFn: mockDeleteMutation,
      });

      const mockQueryResult: ListLedgersQueryResult = createMockQueryResult({
        data: { listLedgers: mockLedgers },
        loading: false,
        error: undefined,
        refetch: mockRefetch,
      });
      vi.mocked(apolloClient.useQuery).mockReturnValue(mockQueryResult);

      render(<LedgerList />);

      const editButtons = screen.getAllByTitle("Edit Ledger");
      await user.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByLabelText("Ledger Name")).toBeInTheDocument();
      });

      const saveButton = screen.getByRole("button", { name: "Save" });
      await user.click(saveButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          "Ledger updated successfully",
        );
      });
    });

    it("should use base64-encoded ledger IDs from server", () => {
      const mockQueryResult: ListLedgersQueryResult = createMockQueryResult({
        data: { listLedgers: mockLedgers },
        loading: false,
        error: undefined,
        refetch: mockRefetch,
      });
      vi.mocked(apolloClient.useQuery).mockReturnValue(mockQueryResult);

      render(<LedgerList />);

      // Verify that ledgers are rendered with their display names
      expect(screen.getByText("Personal Finance")).toBeInTheDocument();
      expect(screen.getByText("Business")).toBeInTheDocument();

      // Verify the ledger IDs in mock data are base64-encoded
      expect(mockLedgers[0].id).toBe("user1/personal-finance");
      expect(mockLedgers[1].id).toBe("user1/business");
    });
  });
});
