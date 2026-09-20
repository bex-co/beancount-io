import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import RegisterPage from "../register";
import SignUpOtpPage from "../register-otp";

/**
 * Registration and its OTP step are standalone documents rather than
 * AuthPageLayout consumers, so each shell has to carry its own single main
 * landmark for the primary form or status it shows.
 */

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));

vi.mock("@/common/components/seo/page-seo", () => ({ PageSEO: () => null }));

vi.mock("@/features/auth/hooks/use-register-form", () => ({
  useRegisterForm: () => ({
    onSubmit: vi.fn(),
    isLoading: false,
    serverError: undefined,
    defaultUsername: "",
  }),
}));

vi.mock("@/features/auth/hooks/use-otp-form", () => ({
  useOtpForm: () => ({
    onSubmit: vi.fn(),
    isLoading: false,
    serverError: undefined,
  }),
}));

function mains() {
  return [...document.querySelectorAll("main, [role='main']")];
}

describe("registration main landmark", () => {
  it("marks the sign-up form column and not the promotional column", () => {
    render(<RegisterPage />);

    const found = mains();
    expect(found).toHaveLength(1);
    expect(found[0].contains(screen.getByText("Create your account"))).toBe(
      true,
    );
    // The promotional column is complementary, not part of the main content.
    const aside = document.querySelector("aside");
    expect(aside).not.toBeNull();
    expect(found[0].contains(aside as Node)).toBe(false);
  });

  it("marks the OTP step", () => {
    render(<SignUpOtpPage sessionId="session-1" email="reader@example.com" />);
    expect(mains()).toHaveLength(1);
  });

  it("marks the expired-session shell of the OTP step", () => {
    render(<SignUpOtpPage sessionId="" email="reader@example.com" />);

    const found = mains();
    expect(found).toHaveLength(1);
    expect(found[0].contains(screen.getByText("Session Expired"))).toBe(true);
  });
});
