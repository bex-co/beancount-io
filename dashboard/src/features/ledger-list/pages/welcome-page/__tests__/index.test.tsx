import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import WelcomePage from "../index";

vi.mock("@apollo/client/react", () => ({
  useMutation: () => [vi.fn(), { loading: false }],
  useQuery: () => ({
    data: {
      listLedgers: [],
      userProfile: {
        limits: {
          ledgersUsed: 0,
          ledgersMax: 1,
          collaboratorsPerLedgerMax: 2,
        },
      },
    },
    loading: false,
  }),
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("@/common/components/seo/page-seo", () => ({
  PageSEO: () => null,
}));

describe("WelcomePage", () => {
  it("offers the sample-ledger template in the first-ledger flow", () => {
    render(<WelcomePage />);

    expect(screen.getByText("Create Your First Ledger")).toBeInTheDocument();
    expect(
      screen.getByRole("radio", { name: /Sample ledger/i }),
    ).toBeInTheDocument();
  });
});
