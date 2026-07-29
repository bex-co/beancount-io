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
});
