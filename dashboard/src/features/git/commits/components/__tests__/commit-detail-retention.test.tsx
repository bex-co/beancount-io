import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { useQuery } from "@apollo/client/react";
import { CommitDetail } from "../commit-detail";

vi.mock("@apollo/client/react", () => ({
  useQuery: vi.fn(),
}));

vi.mock("@/common/components/diff-viewer", () => ({
  DiffViewer: ({ diff }: { diff: string }) => <pre>{diff}</pre>,
  getDiffFileId: (filename: string) => filename,
  parseDiffFileId: () => null,
}));

const mockUseQuery = vi.mocked(useQuery);

const commit = {
  sha: "46df57e2d38ecf88148e30418a128dead3897387",
  message: "qa change",
  author: { name: "Ada", email: "ada@example.com", date: "2026-10-01" },
  stats: { additions: 2, deletions: 0, filesChanged: 1 },
  files: [{ filename: "qa.txt", status: "added", additions: 2, deletions: 0 }],
  diff: "+line one\n+line two",
};

function state(overrides: Record<string, unknown>) {
  return {
    data: undefined,
    loading: false,
    error: undefined,
    refetch: vi.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useQuery>;
}

describe("CommitDetail through a cache refresh (w4/1087)", () => {
  it("keeps loaded details through pending, failure and success", async () => {
    const user = userEvent.setup();
    mockUseQuery.mockReturnValue(state({ data: { getCommitDetails: commit } }));
    const { rerender } = render(
      <CommitDetail ledgerId="owner/books" commitSha={commit.sha} />,
    );
    const details = document.querySelector("details");
    expect(details).not.toBeNull();
    (details as HTMLDetailsElement).open = true;
    expect(screen.getByText(/line one/)).toBeInTheDocument();

    // Refresh pending: same nodes stay, no skeletons replace them.
    mockUseQuery.mockReturnValue(state({ loading: true }));
    rerender(<CommitDetail ledgerId="owner/books" commitSha={commit.sha} />);
    expect(document.querySelector("details")).toBe(details);
    expect((details as HTMLDetailsElement).open).toBe(true);
    expect(screen.getByText(/line one/)).toBeInTheDocument();

    // Refresh failure: content stays beside the error and retry.
    mockUseQuery.mockReturnValue(state({ error: new Error("offline") }));
    rerender(<CommitDetail ledgerId="owner/books" commitSha={commit.sha} />);
    expect(document.querySelector("details")).toBe(details);
    expect((details as HTMLDetailsElement).open).toBe(true);
    expect(screen.getByText(/line one/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeVisible();

    // Healthy retry: same disclosure state after success.
    mockUseQuery.mockReturnValue(state({ data: { getCommitDetails: commit } }));
    rerender(<CommitDetail ledgerId="owner/books" commitSha={commit.sha} />);
    await waitFor(() =>
      expect(
        (document.querySelector("details") as HTMLDetailsElement).open,
      ).toBe(true),
    );
    expect(screen.getByText(/line one/)).toBeInTheDocument();
    await user.click(screen.getByText("qa.txt")).catch(() => {});
  });

  it("still shows skeletons on a cold read", () => {
    mockUseQuery.mockReturnValue(state({ loading: true }));
    render(<CommitDetail ledgerId="owner/books" commitSha={commit.sha} />);
    expect(document.querySelector("[aria-busy='true']")).not.toBeNull();
    expect(screen.queryByText(/line one/)).toBeNull();
  });
});
