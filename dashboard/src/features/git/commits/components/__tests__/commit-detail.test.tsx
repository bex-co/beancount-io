import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CommitDetail } from "../commit-detail";

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock("@apollo/client/react", () => ({
  useQuery: mocks.useQuery,
}));

const commit = {
  __typename: "CommitDetails" as const,
  sha: "1234567890abcdef",
  message: "Compact commit",
  author: {
    __typename: "CommitAuthor" as const,
    name: "Ada",
    email: "ada@example.com",
    date: "2026-07-27T12:00:00.000Z",
  },
  committer: null,
  files: [
    {
      __typename: "CommitFileChange" as const,
      filename: "main.bean",
      additions: 1,
      deletions: 1,
    },
  ],
  stats: {
    __typename: "CommitStats" as const,
    additions: 1,
    deletions: 1,
    total: 2,
  },
  diff: `diff --git a/main.bean b/main.bean
--- a/main.bean
+++ b/main.bean
@@ -1 +1 @@
-old
+new`,
  parents: [],
};

function setQueryResult(overrides: Record<string, unknown> = {}) {
  mocks.useQuery.mockReturnValue({
    data: undefined,
    loading: false,
    error: undefined,
    refetch: mocks.refetch,
    ...overrides,
  });
}

describe("CommitDetail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders an ordinary commit with aggregate stats only in metadata", () => {
    setQueryResult({ data: { getCommitDetails: commit } });
    render(<CommitDetail ledgerId="alice/books" commitSha={commit.sha} />);

    expect(
      screen.getByRole("heading", { name: "Compact commit" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("1 file")).toHaveLength(1);
    const metadata = within(screen.getByTestId("commit-metadata"));
    expect(metadata.getAllByText("+1")).toHaveLength(1);
    expect(metadata.getAllByText("-1")).toHaveLength(1);
    expect(
      screen.getByRole("heading", { name: "Changes" }),
    ).toBeInTheDocument();
  });

  it("renders a scoped missing-commit state", () => {
    const error = new CombinedGraphQLErrors({
      errors: [
        {
          message: "Commit not found",
          extensions: { code: "NOT_FOUND" },
        },
      ],
    });
    setQueryResult({ error });

    render(<CommitDetail ledgerId="alice/books" commitSha="missing" />);

    expect(screen.getByText("Commit not found")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Try again" }),
    ).not.toBeInTheDocument();
  });

  it("offers a scoped retry for query failures", async () => {
    const user = userEvent.setup();
    setQueryResult({ error: new Error("backend unavailable") });

    render(<CommitDetail ledgerId="alice/books" commitSha="1234567" />);
    await user.click(screen.getByRole("button", { name: "Try Again" }));

    expect(mocks.refetch).toHaveBeenCalledOnce();
  });

  it("guards large diffs until the user explicitly loads them", async () => {
    const user = userEvent.setup();
    setQueryResult({
      data: {
        getCommitDetails: {
          ...commit,
          stats: {
            ...commit.stats,
            additions: 800,
            deletions: 200,
            total: 1000,
          },
        },
      },
    });

    render(<CommitDetail ledgerId="alice/books" commitSha={commit.sha} />);

    expect(
      screen.queryByRole("heading", { name: "Changes" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Load Large Diff" }));
    expect(
      screen.getByRole("heading", { name: "Changes" }),
    ).toBeInTheDocument();
  });
});
