import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import GalleryPage from "../index";
import * as apolloClient from "@apollo/client/react";
import {
  createMockLazyQueryTuple,
  type MockLazyQueryTuple,
} from "@/test/apollo-test-utils";
import type { SearchLedgersQuery } from "@/graphql/definitions";

// Type aliases
type SearchLedgersQueryTuple = MockLazyQueryTuple<SearchLedgersQuery>;

// Mock dependencies
const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@apollo/client/react", () => ({
  useLazyQuery: vi.fn(),
}));

// Mock SEO components (they use useLocation which requires router context)
vi.mock("@/common/components/seo/page-seo", () => ({
  PageSEO: () => null,
}));

describe("GalleryPage", () => {
  const mockSearchLedgers = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exposes a keyboard-operable Back control before search", async () => {
    const mockQueryTuple: SearchLedgersQueryTuple = createMockLazyQueryTuple(
      mockSearchLedgers,
      {
        data: { searchLedgers: [] },
        loading: false,
        error: undefined,
      },
    );
    vi.mocked(apolloClient.useLazyQuery).mockReturnValue(mockQueryTuple);

    const historyBack = vi
      .spyOn(window.history, "back")
      .mockImplementation(() => undefined);
    const user = userEvent.setup();
    render(<GalleryPage />);

    const back = screen.getByRole("button", { name: /^back$/i });
    const search = screen.getByRole("combobox");

    await user.tab();
    expect(back).toHaveFocus();
    expect(search).not.toHaveFocus();

    await user.keyboard("{Enter}");
    expect(historyBack).toHaveBeenCalledTimes(1);

    back.focus();
    await user.keyboard(" ");
    expect(historyBack).toHaveBeenCalledTimes(2);

    historyBack.mockRestore();
  });

  it("should display ledger descriptions when available", async () => {
    const mockData: SearchLedgersQuery = {
      searchLedgers: [
        {
          id: "un_test/test-ledger",
          name: "test-ledger",
          fullName: "un_test/test-ledger",
          description: "Test ledger for demo purposes",
          __typename: "Ledger",
        },
        {
          id: "un_test/another-ledger",
          name: "another-ledger",
          fullName: "un_test/another-ledger",
          description: "Another test ledger",
          __typename: "Ledger",
        },
      ],
    };

    const mockQueryTuple: SearchLedgersQueryTuple = createMockLazyQueryTuple(
      mockSearchLedgers,
      {
        data: mockData,
        loading: false,
        error: undefined,
      },
    );

    vi.mocked(apolloClient.useLazyQuery).mockReturnValue(mockQueryTuple);

    const user = userEvent.setup();
    render(<GalleryPage />);

    // Type in search box to trigger search
    const searchInput = screen.getByRole("combobox");
    await user.type(searchInput, "test");

    // Wait for search results
    await waitFor(() => {
      expect(mockSearchLedgers).toHaveBeenCalled();
    });

    // Wait for descriptions to appear
    await waitFor(() => {
      expect(
        screen.getByText("Test ledger for demo purposes"),
      ).toBeInTheDocument();
      expect(screen.getByText("Another test ledger")).toBeInTheDocument();
    });
  });

  it("should not display description section when ledger has no description", async () => {
    const mockData: SearchLedgersQuery = {
      searchLedgers: [
        {
          id: "un_test/test-ledger",
          name: "test-ledger",
          fullName: "un_test/test-ledger",
          description: null,
          __typename: "Ledger",
        },
      ],
    };

    const mockQueryTuple: SearchLedgersQueryTuple = createMockLazyQueryTuple(
      mockSearchLedgers,
      {
        data: mockData,
        loading: false,
        error: undefined,
      },
    );

    vi.mocked(apolloClient.useLazyQuery).mockReturnValue(mockQueryTuple);

    const user = userEvent.setup();
    render(<GalleryPage />);

    // Type in search box
    const searchInput = screen.getByRole("combobox");
    await user.type(searchInput, "test");

    await waitFor(() => {
      expect(mockSearchLedgers).toHaveBeenCalled();
    });

    // Ledger name should be visible
    await waitFor(() => {
      expect(screen.getByText("test-ledger")).toBeInTheDocument();
    });

    // But no description should be shown (since it's null)
    expect(screen.queryByText(/test.*ledger.*demo/i)).not.toBeInTheDocument();
  });

  it("should navigate to ledger overview when clicking on search result", async () => {
    const mockData: SearchLedgersQuery = {
      searchLedgers: [
        {
          id: "un_test/test-ledger",
          name: "test-ledger",
          fullName: "un_test/test-ledger",
          description: "Test ledger",
          __typename: "Ledger",
        },
      ],
    };

    const mockQueryTuple: SearchLedgersQueryTuple = createMockLazyQueryTuple(
      mockSearchLedgers,
      {
        data: mockData,
        loading: false,
        error: undefined,
      },
    );

    vi.mocked(apolloClient.useLazyQuery).mockReturnValue(mockQueryTuple);

    const user = userEvent.setup();
    render(<GalleryPage />);

    // Type in search box
    const searchInput = screen.getByRole("combobox");
    await user.type(searchInput, "test");

    await waitFor(() => {
      expect(mockSearchLedgers).toHaveBeenCalled();
    });

    // Click on the ledger
    const ledgerItem = await screen.findByText("test-ledger");
    await user.click(ledgerItem);

    // Should navigate to overview page
    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/ledger/un_test/test-ledger",
    });
  });

  it("exposes listbox semantics with aria-controls and aria-activedescendant", async () => {
    const mockData: SearchLedgersQuery = {
      searchLedgers: [
        {
          id: "un_test/test-ledger",
          name: "test-ledger",
          fullName: "un_test/test-ledger",
          description: "Test ledger",
          __typename: "Ledger",
        },
        {
          id: "un_test/another-ledger",
          name: "another-ledger",
          fullName: "un_test/another-ledger",
          description: null,
          __typename: "Ledger",
        },
      ],
    };

    const mockQueryTuple: SearchLedgersQueryTuple = createMockLazyQueryTuple(
      mockSearchLedgers,
      {
        data: mockData,
        loading: false,
        error: undefined,
      },
    );

    vi.mocked(apolloClient.useLazyQuery).mockReturnValue(mockQueryTuple);

    const user = userEvent.setup();
    render(<GalleryPage />);

    const searchInput = screen.getByRole("combobox");
    expect(searchInput).toHaveAttribute(
      "aria-controls",
      "ledger-search-listbox",
    );

    await user.type(searchInput, "test");

    // Dropdown container is a listbox with the id aria-controls points to
    const listbox = await screen.findByRole("listbox");
    expect(listbox).toHaveAttribute("id", "ledger-search-listbox");

    // Options appear once the debounced query matches the live input
    const options = await screen.findAllByRole("option");
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveAttribute("id", "ledger-search-option-0");
    expect(options[1]).toHaveAttribute("id", "ledger-search-option-1");

    // No highlight yet
    expect(searchInput).not.toHaveAttribute("aria-activedescendant");

    // ArrowDown highlights the first option and exposes it to screen readers
    await user.keyboard("{ArrowDown}");
    expect(searchInput).toHaveAttribute(
      "aria-activedescendant",
      "ledger-search-option-0",
    );
    expect(options[0]).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{ArrowDown}");
    expect(searchInput).toHaveAttribute(
      "aria-activedescendant",
      "ledger-search-option-1",
    );
    expect(options[1]).toHaveAttribute("aria-selected", "true");
  });

  it("clear button is keyboard-reachable and clears the search", async () => {
    const mockData: SearchLedgersQuery = {
      searchLedgers: [
        {
          id: "un_test/test-ledger",
          name: "test-ledger",
          fullName: "un_test/test-ledger",
          description: "Test ledger",
          __typename: "Ledger",
        },
      ],
    };

    const mockQueryTuple: SearchLedgersQueryTuple = createMockLazyQueryTuple(
      mockSearchLedgers,
      {
        data: mockData,
        loading: false,
        error: undefined,
      },
    );

    vi.mocked(apolloClient.useLazyQuery).mockReturnValue(mockQueryTuple);

    const user = userEvent.setup();
    render(<GalleryPage />);

    const searchInput = screen.getByRole("combobox");
    await user.type(searchInput, "test");

    const clearButton = screen.getByRole("button", { name: "Clear" });
    expect(clearButton).not.toHaveAttribute("tabindex", "-1");

    // Operable by keyboard: focus + Enter clears the input and refocuses it
    clearButton.focus();
    await user.keyboard("{Enter}");

    expect(searchInput).toHaveValue("");
    expect(searchInput).toHaveFocus();
  });

  it("clear drops stale highlight so Enter cannot select the old ledger", async () => {
    const mockData: SearchLedgersQuery = {
      searchLedgers: [
        {
          id: "open_ledger/crypto-example",
          name: "crypto-example",
          fullName: "open_ledger/crypto-example",
          description: null,
          __typename: "Ledger",
        },
      ],
    };

    const mockQueryTuple: SearchLedgersQueryTuple = createMockLazyQueryTuple(
      mockSearchLedgers,
      {
        data: mockData,
        loading: false,
        error: undefined,
      },
    );

    vi.mocked(apolloClient.useLazyQuery).mockReturnValue(mockQueryTuple);

    const user = userEvent.setup();
    render(<GalleryPage />);

    const searchInput = screen.getByRole("combobox");
    await user.type(searchInput, "crypto-example");
    await screen.findByRole("option", { name: /crypto-example/i });

    await user.keyboard("{ArrowDown}");
    expect(searchInput).toHaveAttribute(
      "aria-activedescendant",
      "ledger-search-option-0",
    );

    await user.click(screen.getByRole("button", { name: "Clear" }));

    expect(searchInput).toHaveValue("");
    expect(searchInput).toHaveFocus();
    expect(searchInput).toHaveAttribute("aria-expanded", "false");
    expect(searchInput).not.toHaveAttribute("aria-activedescendant");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();

    await user.keyboard("{Enter}");
    expect(mockNavigate).not.toHaveBeenCalled();

    await user.keyboard("{ArrowDown}");
    expect(searchInput).toHaveAttribute("aria-expanded", "false");
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("Escape closes an open empty-result listbox", async () => {
    const mockQueryTuple: SearchLedgersQueryTuple = createMockLazyQueryTuple(
      mockSearchLedgers,
      {
        data: { searchLedgers: [] },
        loading: false,
        error: undefined,
      },
    );

    vi.mocked(apolloClient.useLazyQuery).mockReturnValue(mockQueryTuple);

    const user = userEvent.setup();
    render(<GalleryPage />);

    const searchInput = screen.getByRole("combobox");
    await user.type(searchInput, "qa-no-public-ledger-match");

    await waitFor(() => {
      expect(screen.getByRole("listbox")).toBeInTheDocument();
      expect(screen.getByText("No ledgers found")).toBeInTheDocument();
    });
    expect(searchInput).toHaveAttribute("aria-expanded", "true");

    await user.keyboard("{Escape}");

    expect(searchInput).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(searchInput).not.toHaveAttribute("aria-activedescendant");
  });

  it("Escape keeps focus in the search field so editing can continue", async () => {
    const mockQueryTuple: SearchLedgersQueryTuple = createMockLazyQueryTuple(
      mockSearchLedgers,
      {
        data: { searchLedgers: [] },
        loading: false,
        error: undefined,
      },
    );

    vi.mocked(apolloClient.useLazyQuery).mockReturnValue(mockQueryTuple);

    const user = userEvent.setup();
    render(<GalleryPage />);

    const searchInput = screen.getByRole("combobox");
    await user.type(searchInput, "grocery");

    await waitFor(() => {
      expect(screen.getByRole("listbox")).toBeInTheDocument();
    });

    await user.keyboard("{Escape}");

    // Escape used to blur the input, stranding keyboard users.
    expect(searchInput).toHaveFocus();

    await user.keyboard("{Backspace}");
    expect(searchInput).toHaveValue("grocer");

    // A closed list must not be selectable from.
    await user.keyboard("{Enter}");
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
