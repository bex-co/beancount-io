import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import CommitsListPage from "../commits-list-page";

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
      {selectedCommitSha && (
        <span data-testid="selected-commit-sha">{selectedCommitSha}</span>
      )}
    </div>
  ),
}));

describe("CommitsListPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseParams.mockReturnValue({
      ledgerOwner: "user1",
      ledgerName: "test-ledger",
    });
  });

  it("should render CommitsSplitView with correct props", () => {
    render(<CommitsListPage />);

    expect(screen.getByTestId("commits-split-view")).toBeInTheDocument();
    expect(screen.getByTestId("ledger-id")).toHaveTextContent(
      "user1/test-ledger",
    );
    expect(screen.queryByTestId("selected-commit-sha")).not.toBeInTheDocument();
  });
});
