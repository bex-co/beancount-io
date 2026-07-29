import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CommitsSplitView from "../commits-split-view";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  useQuery: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock("@apollo/client/react", () => ({
  useQuery: mocks.useQuery,
}));

vi.mock("../commits-list", () => ({
  CommitsList: ({
    error,
    onCommitSelect,
  }: {
    error?: Error;
    onCommitSelect?: (sha: string) => void;
  }) => (
    <div data-testid="commits-list">
      {error?.message}
      {onCommitSelect && (
        <button type="button" onClick={() => onCommitSelect("next-sha")}>
          Select next commit
        </button>
      )}
    </div>
  ),
}));

vi.mock("../commit-detail", () => ({
  CommitDetail: ({ commitSha }: { commitSha: string }) => (
    <div data-testid="commit-detail">{commitSha}</div>
  ),
}));

const commits = [
  {
    __typename: "CommitListItem" as const,
    sha: "first-sha",
    shortSha: "first-s",
    message: "First commit",
    author: {
      __typename: "CommitAuthor" as const,
      name: "Ada",
      email: "ada@example.com",
      date: "2026-07-27T12:00:00.000Z",
    },
    committer: null,
  },
];

describe("CommitsSplitView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useQuery.mockReturnValue({
      data: { listCommits: commits },
      loading: false,
      error: undefined,
    });
  });

  it("auto-selects the first commit from the history route without adding a history entry", async () => {
    render(<CommitsSplitView ledgerId="alice/books" />);

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith({
        to: "/ledger/$ledgerOwner/$ledgerName/commit/$commitSha",
        params: {
          ledgerOwner: "alice",
          ledgerName: "books",
          commitSha: "first-sha",
        },
        replace: true,
      });
    });
  });

  it("renders a directly selected commit while the history query is still loading", () => {
    mocks.useQuery.mockReturnValue({
      data: undefined,
      loading: true,
      error: undefined,
    });

    render(
      <CommitsSplitView
        ledgerId="alice/books"
        selectedCommitSha="direct-sha"
      />,
    );

    expect(screen.getByTestId("commit-detail")).toHaveTextContent("direct-sha");
    expect(
      screen.getByRole("button", { name: "Version History" }),
    ).toBeInTheDocument();
  });

  it("opens responsive history and closes it after a plain commit selection", async () => {
    const user = userEvent.setup();
    render(
      <CommitsSplitView ledgerId="alice/books" selectedCommitSha="first-sha" />,
    );

    await user.click(screen.getByRole("button", { name: "Version History" }));
    expect(
      screen.getByRole("button", { name: "Select next commit" }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Select next commit" }),
    );

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: "Select next commit" }),
      ).not.toBeInTheDocument();
    });
  });

  it("keeps a list-query failure scoped to the workspace", () => {
    mocks.useQuery.mockReturnValue({
      data: undefined,
      loading: false,
      error: new Error("commit history unavailable"),
    });

    render(<CommitsSplitView ledgerId="alice/books" />);
    expect(screen.getByText("commit history unavailable")).toBeInTheDocument();
  });
});
