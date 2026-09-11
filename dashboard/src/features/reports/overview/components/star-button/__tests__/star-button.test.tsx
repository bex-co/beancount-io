import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const {
  mockNavigate,
  mockStarLedger,
  mockUnstarLedger,
  mockIsAuthenticated,
  mockNextPath,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockStarLedger: vi.fn(),
  mockUnstarLedger: vi.fn(),
  mockIsAuthenticated: vi.fn(() => true),
  mockNextPath: vi.fn(() => "/ledger/open_ledger/example?lang=en&time=2017"),
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@/common/hooks/use-is-authenticated", () => ({
  useIsAuthenticated: () => mockIsAuthenticated(),
}));

vi.mock("@/common/hooks/use-login-next-path", () => ({
  useLoginNextPath: () => mockNextPath(),
}));

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
}));

vi.mock("../use-star-ledger", () => ({
  useStarLedger: () => ({ starLedger: mockStarLedger, loading: false }),
}));

vi.mock("../use-unstar-ledger", () => ({
  useUnstarLedger: () => ({ unstarLedger: mockUnstarLedger, loading: false }),
}));

const { StarButton } = await import("../index");

const STAR = "page.overview.starButton.star";
const STARRED = "page.overview.starButton.starred";

describe("StarButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAuthenticated.mockReturnValue(true);
    mockNextPath.mockReturnValue(
      "/ledger/open_ledger/example?lang=en&time=2017",
    );
  });

  it("sends a guest to login with the current page as the return destination", async () => {
    mockIsAuthenticated.mockReturnValue(false);
    render(<StarButton ledgerId="abc" isStarred={false} />);

    await userEvent.click(screen.getByRole("button"));

    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/auth/login",
      search: { next: "/ledger/open_ledger/example?lang=en&time=2017" },
    });
    expect(mockStarLedger).not.toHaveBeenCalled();
  });

  it("keeps the starred state after a confirmed success", async () => {
    mockStarLedger.mockResolvedValue({
      data: { starLedger: { success: true, isStarred: true, message: null } },
    });
    render(<StarButton ledgerId="abc" isStarred={false} />);

    await userEvent.click(screen.getByRole("button"));

    await waitFor(() =>
      expect(screen.getByRole("button")).toHaveTextContent(STARRED),
    );
  });

  it("restores Star when the server reports success:false", async () => {
    mockStarLedger.mockResolvedValue({
      data: {
        starLedger: {
          success: false,
          isStarred: false,
          message: "Failed to star ledger",
        },
      },
    });
    render(<StarButton ledgerId="abc" isStarred={false} />);

    await userEvent.click(screen.getByRole("button"));

    // A fulfilled mutation reporting a domain failure must not leave the
    // button claiming the ledger is starred.
    await waitFor(() =>
      expect(screen.getByRole("button")).toHaveTextContent(STAR),
    );

    // The next click must retry the same action, not prepare an unstar.
    await userEvent.click(screen.getByRole("button"));
    expect(mockStarLedger).toHaveBeenCalledTimes(2);
    expect(mockUnstarLedger).not.toHaveBeenCalled();
  });

  it("restores Starred when an unstar reports success:false", async () => {
    mockUnstarLedger.mockResolvedValue({
      data: {
        unstarLedger: {
          success: false,
          isStarred: true,
          message: "Failed to unstar ledger",
        },
      },
    });
    render(<StarButton ledgerId="abc" isStarred={true} />);

    await userEvent.click(screen.getByRole("button"));

    await waitFor(() =>
      expect(screen.getByRole("button")).toHaveTextContent(STARRED),
    );
    await userEvent.click(screen.getByRole("button"));
    expect(mockUnstarLedger).toHaveBeenCalledTimes(2);
    expect(mockStarLedger).not.toHaveBeenCalled();
  });

  it("rolls back when the mutation throws", async () => {
    mockStarLedger.mockRejectedValue(new Error("network"));
    render(<StarButton ledgerId="abc" isStarred={false} />);

    await userEvent.click(screen.getByRole("button"));

    await waitFor(() =>
      expect(screen.getByRole("button")).toHaveTextContent(STAR),
    );
  });
});
