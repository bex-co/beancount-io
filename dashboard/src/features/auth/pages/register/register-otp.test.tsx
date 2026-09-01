import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SignUpOtpPage from "./register-otp";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  oauthOtp: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock("@/features/auth/hooks/use-dashboard-oauth-auth", () => ({
  useDashboardOAuthOtp: (options: unknown) => {
    mocks.oauthOtp(options);
    return { onSubmit: vi.fn(), isLoading: false, serverError: "" };
  },
}));

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({ t: (key: string) => key }),
}));

vi.mock("@/features/auth/components/otp-form", () => ({
  OtpForm: () => <div>otp form</div>,
}));

vi.mock("@/common/components/seo/page-seo", () => ({ PageSEO: () => null }));

describe("SignUpOtpPage OAuth completion", () => {
  beforeEach(() => vi.clearAllMocks());

  it("binds OTP verification to the existing Dashboard OAuth interaction", () => {
    render(
      <SignUpOtpPage
        interactionUid="dashboard-interaction"
        sessionId="signup-session"
        email="ada@example.test"
      />,
    );
    expect(mocks.oauthOtp).toHaveBeenCalledWith({
      uid: "dashboard-interaction",
      next: undefined,
      sessionId: "signup-session",
    });
  });
});
