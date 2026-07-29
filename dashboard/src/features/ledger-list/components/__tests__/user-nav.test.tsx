import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserNav } from "../user-nav";
import * as apolloClient from "@apollo/client/react";
import {
  createMockQueryResult,
  type GetCurrentUserQueryResult,
} from "@/test/apollo-test-utils";

// Mock dependencies
const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@apollo/client/react", () => ({
  useQuery: vi.fn(),
}));

describe("UserNav", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render loading state", () => {
    const mockQueryResult: GetCurrentUserQueryResult = createMockQueryResult({
      data: undefined,
      loading: true,
      error: undefined,
    });
    vi.mocked(apolloClient.useQuery).mockReturnValue(mockQueryResult);

    render(<UserNav />);

    // Check for loading skeleton elements
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("should render user avatar with initial", () => {
    const mockQueryResult: GetCurrentUserQueryResult = createMockQueryResult({
      data: {
        userProfile: {
          __typename: "UserProfileResponse",
          id: "user-1",
          username: "testuser",
          email: "test@example.com",
          firstName: "Test",
          lastName: "User",
          locale: "en",
          tier: "FREE",
          emailReportStatus: null,
          limits: {
            __typename: "UserLimits",
            ledgersUsed: 1,
            ledgersMax: 3,
            collaboratorsPerLedgerMax: 5,
          },
        },
      },
      loading: false,
      error: undefined,
    });
    vi.mocked(apolloClient.useQuery).mockReturnValue(mockQueryResult);

    render(<UserNav />);

    // Should render the first letter of username as avatar fallback
    expect(screen.getByText("T")).toBeInTheDocument();
  });

  it("should render user fallback when username is null", () => {
    const mockQueryResult: GetCurrentUserQueryResult = createMockQueryResult({
      data: {
        userProfile: {
          __typename: "UserProfileResponse",
          id: "user-1",
          username: null,
          email: "test@example.com",
          firstName: null,
          lastName: null,
          locale: "en",
          tier: "FREE",
          emailReportStatus: null,
          limits: {
            __typename: "UserLimits",
            ledgersUsed: 1,
            ledgersMax: 3,
            collaboratorsPerLedgerMax: 5,
          },
        },
      },
      loading: false,
      error: undefined,
    });
    vi.mocked(apolloClient.useQuery).mockReturnValue(mockQueryResult);

    render(<UserNav />);

    // Should render the fallback text "U" (first letter of "User")
    expect(screen.getByText("U")).toBeInTheDocument();
  });

  it("should navigate to settings when avatar button is clicked", async () => {
    const user = userEvent.setup();
    const mockQueryResult: GetCurrentUserQueryResult = createMockQueryResult({
      data: {
        userProfile: {
          __typename: "UserProfileResponse",
          id: "user-1",
          username: "testuser",
          email: "test@example.com",
          firstName: "Test",
          lastName: "User",
          locale: "en",
          tier: "FREE",
          emailReportStatus: null,
          limits: {
            __typename: "UserLimits",
            ledgersUsed: 1,
            ledgersMax: 3,
            collaboratorsPerLedgerMax: 5,
          },
        },
      },
      loading: false,
      error: undefined,
    });
    vi.mocked(apolloClient.useQuery).mockReturnValue(mockQueryResult);

    render(<UserNav />);

    const avatarButton = screen.getByRole("button");
    await user.click(avatarButton);

    expect(mockNavigate).toHaveBeenCalledWith({ to: "/settings" });
  });

  it("should render with null user profile", () => {
    const mockQueryResult: GetCurrentUserQueryResult = createMockQueryResult({
      data: {
        userProfile: null,
      },
      loading: false,
      error: undefined,
    });
    vi.mocked(apolloClient.useQuery).mockReturnValue(mockQueryResult);

    render(<UserNav />);

    // Should render fallback "U" (first letter of "User" fallback)
    expect(screen.getByText("U")).toBeInTheDocument();
  });
});
