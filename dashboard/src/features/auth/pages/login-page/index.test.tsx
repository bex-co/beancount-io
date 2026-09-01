import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginPage from ".";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  oauthLogin: vi.fn(),
  search: {
    interaction: "dashboard-interaction",
    next: "/ledger/ada/personal",
    reason: undefined as "interaction_expired" | "expired" | undefined,
  },
}));

vi.mock("@tanstack/react-router", () => ({
  useSearch: () => mocks.search,
  useNavigate: () => mocks.navigate,
}));

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({ t: (key: string) => key }),
}));

vi.mock("@/features/auth/hooks/use-dashboard-oauth-auth", () => ({
  useDashboardOAuthLogin: (uid: string, next?: string) => {
    mocks.oauthLogin(uid, next);
    return { onSubmit: vi.fn(), isLoading: false, serverError: "" };
  },
}));

vi.mock("@/features/auth/components/login-form", () => ({
  LoginForm: ({ onRegisterClick }: { onRegisterClick: () => void }) => (
    <button onClick={onRegisterClick}>register</button>
  ),
}));

vi.mock("@/common/components/seo/page-seo", () => ({ PageSEO: () => null }));

describe("Dashboard OAuth LoginPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("submits credentials only through the bound OAuth interaction", () => {
    render(<LoginPage />);
    expect(mocks.oauthLogin).toHaveBeenCalledWith(
      "dashboard-interaction",
      "/ledger/ada/personal",
    );
  });

  it("keeps sign-up inside the same OAuth interaction", () => {
    render(<LoginPage />);
    fireEvent.click(screen.getByText("register"));
    expect(mocks.navigate).toHaveBeenCalledWith({
      to: "/auth/sign-up",
      search: {
        interaction: "dashboard-interaction",
        next: "/ledger/ada/personal",
        reason: undefined,
      },
    });
  });
});
