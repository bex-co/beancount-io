import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import CommitDetailPage from "../commit-detail-page";

const mockUseParams = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useParams: () => mockUseParams(),
}));

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/common/components/seo/ledger-page-seo", () => ({
  LedgerPageSEO: () => null,
}));

vi.mock("../../components/commits-split-view", () => ({
  default: ({ ledgerId, selectedCommitSha }: any) => (
    <div data-testid="commits-split-view">
      <span data-testid="ledger-id">{ledgerId}</span>
      <span data-testid="selected-commit-sha">{selectedCommitSha}</span>
    </div>
  ),
}));

describe("CommitDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseParams.mockReturnValue({
      ledgerOwner: "user1",
      ledgerName: "test-ledger",
      commitSha: "abc123",
    });
  });

  it("should render CommitsSplitView with correct props", () => {
    render(<CommitDetailPage />);

    expect(screen.getByTestId("commits-split-view")).toBeInTheDocument();
    expect(screen.getByTestId("ledger-id")).toHaveTextContent(
      "user1/test-ledger",
    );
    expect(screen.getByTestId("selected-commit-sha")).toHaveTextContent(
      "abc123",
    );
  });
});
