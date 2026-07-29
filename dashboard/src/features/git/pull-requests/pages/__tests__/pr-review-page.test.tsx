import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PRReviewPage from "../pr-review-page";
import * as apolloClient from "@apollo/client/react";
import { toast } from "sonner";
import {
  createMockQueryResult,
  createMockMutationTuple,
  type MockQueryResult,
  type MockMutationTuple,
} from "@/test/apollo-test-utils";
import type {
  GetPullRequestDetailsQuery,
  ApprovePullRequestMutation,
  RejectPullRequestMutation,
} from "@/graphql/definitions";

// Type aliases
type GetPullRequestDetailsQueryResult =
  MockQueryResult<GetPullRequestDetailsQuery>;
type ApprovePullRequestMutationTuple =
  MockMutationTuple<ApprovePullRequestMutation>;
type RejectPullRequestMutationTuple =
  MockMutationTuple<RejectPullRequestMutation>;

// Mock dependencies
const mockUseParams = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useParams: () => mockUseParams(),
  Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

vi.mock("@apollo/client/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => [vi.fn(), { loading: false }]),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock child components
vi.mock("../../components/pr-metadata", () => ({
  PRMetadata: ({ title, number, author }: any) => (
    <div data-testid="pr-metadata">
      <div>#{number}</div>
      <div>{title}</div>
      <div>{typeof author === "string" ? author : author?.name}</div>
    </div>
  ),
}));

vi.mock("../../components/pr-file-list", () => ({
  PRFileList: ({
    files,
  }: {
    files: Array<{
      filename: string;
      additions: number;
      deletions: number;
      changes: number;
    }>;
  }) => (
    <div data-testid="pr-file-list">
      {files.map((file) => (
        <div key={file.filename}>{file.filename}</div>
      ))}
    </div>
  ),
}));

vi.mock("@/common/components/diff-viewer", () => ({
  DiffViewer: ({ diff }: { diff: string }) => (
    <div data-testid="diff-viewer">{diff}</div>
  ),
}));

vi.mock("../../components/pr-actions", () => ({
  PRActions: ({
    onApprove,
    onReject,
    approving,
    rejecting,
  }: {
    state: string;
    onApprove: () => void;
    onReject: () => void;
    approving: boolean;
    rejecting: boolean;
  }) => (
    <div data-testid="pr-actions">
      <button onClick={onApprove} disabled={approving}>
        {approving ? "Approving..." : "Approve"}
      </button>
      <button onClick={onReject} disabled={rejecting}>
        {rejecting ? "Rejecting..." : "Reject"}
      </button>
    </div>
  ),
}));

describe("PRReviewPage", () => {
  const mockApproveMutation = vi.fn();
  const mockRejectMutation = vi.fn();
  const mockRefetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseParams.mockReturnValue({
      ledgerOwner: "user1",
      ledgerName: "test-ledger",
      prNumber: "42",
    });

    // Setup default mutation mocks
    const approveTuple: ApprovePullRequestMutationTuple =
      createMockMutationTuple(mockApproveMutation, { loading: false });
    const rejectTuple: RejectPullRequestMutationTuple = createMockMutationTuple(
      mockRejectMutation,
      { loading: false },
    );

    vi.mocked(apolloClient.useMutation)
      .mockReturnValueOnce(approveTuple)
      .mockReturnValueOnce(rejectTuple);
  });

  it("should render loading state", () => {
    const mockQueryResult: GetPullRequestDetailsQueryResult =
      createMockQueryResult({
        data: undefined,
        loading: true,
        error: undefined,
        refetch: mockRefetch,
      });
    vi.mocked(apolloClient.useQuery).mockReturnValue(mockQueryResult);

    render(<PRReviewPage />);

    const skeletons = screen.getAllByRole("generic", { hidden: true });
    const loadingSkeletons = skeletons.filter(
      (el) => el.getAttribute("data-slot") === "skeleton",
    );
    expect(loadingSkeletons.length).toBeGreaterThan(0);
  });

  it("should render localized error message in error state", () => {
    const mockQueryResult: GetPullRequestDetailsQueryResult =
      createMockQueryResult({
        data: undefined,
        loading: false,
        error: new Error("Failed to fetch PR"),
        refetch: mockRefetch,
      });
    vi.mocked(apolloClient.useQuery).mockReturnValue(mockQueryResult);

    render(<PRReviewPage />);

    expect(
      screen.getByText("Something went wrong. Please try again."),
    ).toBeInTheDocument();
  });

  it("should render not found state when PR is null", () => {
    const mockQueryResult: GetPullRequestDetailsQueryResult =
      createMockQueryResult({
        data: { getPullRequestDetails: null },
        loading: false,
        error: undefined,
        refetch: mockRefetch,
      });
    vi.mocked(apolloClient.useQuery).mockReturnValue(mockQueryResult);

    render(<PRReviewPage />);

    expect(screen.getByText("Pull request not found")).toBeInTheDocument();
  });

  it("should render PR details when data is loaded", () => {
    const mockPR = {
      __typename: "PullRequest" as const,
      number: 42,
      title: "feat: add authentication",
      state: "open" as const,
      author: {
        __typename: "PRAuthor" as const,
        name: "John Doe",
        email: "john@example.com",
      },
      headBranch: "feature/auth",
      baseBranch: "main",
      description: "Add JWT authentication",
      files: [
        {
          __typename: "PRFile" as const,
          filename: "src/auth.ts",
          status: "added",
          additions: 10,
          deletions: 0,
          changes: 10,
        },
      ],
      diff: "diff --git a/src/auth.ts b/src/auth.ts\n...",
    };

    const mockQueryResult: GetPullRequestDetailsQueryResult =
      createMockQueryResult({
        data: { getPullRequestDetails: mockPR },
        loading: false,
        error: undefined,
        refetch: mockRefetch,
      });
    vi.mocked(apolloClient.useQuery).mockReturnValue(mockQueryResult);

    render(<PRReviewPage />);

    // Check components are rendered
    expect(screen.getByTestId("pr-metadata")).toBeInTheDocument();
    expect(screen.getByText("#42")).toBeInTheDocument();
    expect(screen.getByText("feat: add authentication")).toBeInTheDocument();

    expect(screen.getByTestId("pr-file-list")).toBeInTheDocument();
    expect(screen.getByText("src/auth.ts")).toBeInTheDocument();

    expect(screen.getByTestId("diff-viewer")).toBeInTheDocument();
    expect(screen.getByText(/diff --git a\/src\/auth.ts/)).toBeInTheDocument();

    expect(screen.getByTestId("pr-actions")).toBeInTheDocument();
  });

  it("should handle successful PR approval", async () => {
    const user = userEvent.setup();

    const mockPR = {
      __typename: "PullRequest" as const,
      number: 42,
      title: "Test PR",
      state: "open" as const,
      author: {
        __typename: "PRAuthor" as const,
        name: "John Doe",
        email: "john@example.com",
      },
      headBranch: "feature",
      baseBranch: "main",
      description: null,
      files: [],
      diff: "",
    };

    const mockQueryResult: GetPullRequestDetailsQueryResult =
      createMockQueryResult({
        data: { getPullRequestDetails: mockPR },
        loading: false,
        error: undefined,
        refetch: mockRefetch,
      });
    vi.mocked(apolloClient.useQuery).mockReturnValue(mockQueryResult);

    mockApproveMutation.mockResolvedValue({
      data: {
        approvePullRequest: {
          success: true,
          message: "PR approved",
        },
      },
    });

    render(<PRReviewPage />);

    const approveButton = screen.getByRole("button", { name: "Approve" });
    await user.click(approveButton);

    await waitFor(() => {
      expect(mockApproveMutation).toHaveBeenCalledWith({
        variables: {
          ledgerOwner: "user1",
          ledgerName: "test-ledger",
          prNumber: 42,
        },
      });
      expect(toast.success).toHaveBeenCalledWith(
        "Pull request approved and merged successfully",
      );
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  it("should handle failed PR approval", async () => {
    const user = userEvent.setup();

    const mockPR = {
      __typename: "PullRequest" as const,
      number: 42,
      title: "Test PR",
      state: "open" as const,
      author: {
        __typename: "PRAuthor" as const,
        name: "John Doe",
        email: "john@example.com",
      },
      headBranch: "feature",
      baseBranch: "main",
      description: null,
      files: [],
      diff: "",
    };

    const mockQueryResult: GetPullRequestDetailsQueryResult =
      createMockQueryResult({
        data: { getPullRequestDetails: mockPR },
        loading: false,
        error: undefined,
        refetch: mockRefetch,
      });
    vi.mocked(apolloClient.useQuery).mockReturnValue(mockQueryResult);

    mockApproveMutation.mockResolvedValue({
      data: {
        approvePullRequest: {
          success: false,
          message: "Approval failed",
        },
      },
    });

    render(<PRReviewPage />);

    const approveButton = screen.getByRole("button", { name: "Approve" });
    await user.click(approveButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Approval failed");
      expect(mockRefetch).not.toHaveBeenCalled();
    });
  });

  it("should handle PR approval error", async () => {
    const user = userEvent.setup();

    const mockPR = {
      __typename: "PullRequest" as const,
      number: 42,
      title: "Test PR",
      state: "open" as const,
      author: {
        __typename: "PRAuthor" as const,
        name: "John Doe",
        email: "john@example.com",
      },
      headBranch: "feature",
      baseBranch: "main",
      description: null,
      files: [],
      diff: "",
    };

    const mockQueryResult: GetPullRequestDetailsQueryResult =
      createMockQueryResult({
        data: { getPullRequestDetails: mockPR },
        loading: false,
        error: undefined,
        refetch: mockRefetch,
      });
    vi.mocked(apolloClient.useQuery).mockReturnValue(mockQueryResult);

    mockApproveMutation.mockRejectedValue(new Error("Network error"));

    render(<PRReviewPage />);

    const approveButton = screen.getByRole("button", { name: "Approve" });
    await user.click(approveButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to approve pull request",
      );
    });
  });

  it("should handle successful PR rejection", async () => {
    const user = userEvent.setup();

    const mockPR = {
      __typename: "PullRequest" as const,
      number: 42,
      title: "Test PR",
      state: "open" as const,
      author: {
        __typename: "PRAuthor" as const,
        name: "John Doe",
        email: "john@example.com",
      },
      headBranch: "feature",
      baseBranch: "main",
      description: null,
      files: [],
      diff: "",
    };

    const mockQueryResult: GetPullRequestDetailsQueryResult =
      createMockQueryResult({
        data: { getPullRequestDetails: mockPR },
        loading: false,
        error: undefined,
        refetch: mockRefetch,
      });
    vi.mocked(apolloClient.useQuery).mockReturnValue(mockQueryResult);

    mockRejectMutation.mockResolvedValue({
      data: {
        rejectPullRequest: {
          success: true,
          message: "PR rejected",
        },
      },
    });

    render(<PRReviewPage />);

    const rejectButton = screen.getByRole("button", { name: "Reject" });
    await user.click(rejectButton);

    await waitFor(() => {
      expect(mockRejectMutation).toHaveBeenCalledWith({
        variables: {
          ledgerOwner: "user1",
          ledgerName: "test-ledger",
          prNumber: 42,
        },
      });
      expect(toast.success).toHaveBeenCalledWith(
        "Pull request closed successfully",
      );
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  it("should handle failed PR rejection", async () => {
    const user = userEvent.setup();

    const mockPR = {
      __typename: "PullRequest" as const,
      number: 42,
      title: "Test PR",
      state: "open" as const,
      author: {
        __typename: "PRAuthor" as const,
        name: "John Doe",
        email: "john@example.com",
      },
      headBranch: "feature",
      baseBranch: "main",
      description: null,
      files: [],
      diff: "",
    };

    const mockQueryResult: GetPullRequestDetailsQueryResult =
      createMockQueryResult({
        data: { getPullRequestDetails: mockPR },
        loading: false,
        error: undefined,
        refetch: mockRefetch,
      });
    vi.mocked(apolloClient.useQuery).mockReturnValue(mockQueryResult);

    mockRejectMutation.mockResolvedValue({
      data: {
        rejectPullRequest: {
          success: false,
          message: "Rejection failed",
        },
      },
    });

    render(<PRReviewPage />);

    const rejectButton = screen.getByRole("button", { name: "Reject" });
    await user.click(rejectButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Rejection failed");
      expect(mockRefetch).not.toHaveBeenCalled();
    });
  });

  it("should handle PR rejection error", async () => {
    const user = userEvent.setup();

    const mockPR = {
      __typename: "PullRequest" as const,
      number: 42,
      title: "Test PR",
      state: "open" as const,
      author: {
        __typename: "PRAuthor" as const,
        name: "John Doe",
        email: "john@example.com",
      },
      headBranch: "feature",
      baseBranch: "main",
      description: null,
      files: [],
      diff: "",
    };

    const mockQueryResult: GetPullRequestDetailsQueryResult =
      createMockQueryResult({
        data: { getPullRequestDetails: mockPR },
        loading: false,
        error: undefined,
        refetch: mockRefetch,
      });
    vi.mocked(apolloClient.useQuery).mockReturnValue(mockQueryResult);

    mockRejectMutation.mockRejectedValue(new Error("Network error"));

    render(<PRReviewPage />);

    const rejectButton = screen.getByRole("button", { name: "Reject" });
    await user.click(rejectButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to close pull request");
    });
  });

  it("should render empty diff when diff is null", () => {
    const mockPR = {
      __typename: "PullRequest" as const,
      number: 1,
      title: "Empty PR",
      state: "open" as const,
      author: {
        __typename: "PRAuthor" as const,
        name: "Alice",
        email: "alice@example.com",
      },
      headBranch: "feature",
      baseBranch: "main",
      description: null,
      files: [],
      diff: null,
    };

    const mockQueryResult: GetPullRequestDetailsQueryResult =
      createMockQueryResult({
        data: { getPullRequestDetails: mockPR },
        loading: false,
        error: undefined,
        refetch: mockRefetch,
      });
    vi.mocked(apolloClient.useQuery).mockReturnValue(mockQueryResult);

    render(<PRReviewPage />);

    const diffViewer = screen.getByTestId("diff-viewer");
    expect(diffViewer).toBeInTheDocument();
    expect(diffViewer).toHaveTextContent("");
  });

  it("should call useQuery with correct variables", () => {
    const mockQueryResult: GetPullRequestDetailsQueryResult =
      createMockQueryResult({
        data: undefined,
        loading: true,
        error: undefined,
        refetch: mockRefetch,
      });
    vi.mocked(apolloClient.useQuery).mockReturnValue(mockQueryResult);

    render(<PRReviewPage />);

    expect(apolloClient.useQuery).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        variables: {
          ledgerOwner: "user1",
          ledgerName: "test-ledger",
          prNumber: 42,
        },
      }),
    );
  });
});
