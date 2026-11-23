import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ResetPasswordPage from "../index";

/**
 * Every branch of this standalone page is its own document shell, so each one
 * has to carry the page's single main landmark — otherwise landmark navigation
 * cannot reach the form or the status the reader is looking at.
 */

const { mockNavigate, mockUseSearch, mockMutation, mockUseQuery } = vi.hoisted(
  () => ({
    mockNavigate: vi.fn(),
    mockUseSearch: vi.fn(() => ({ token: "valid-token" })),
    mockMutation: vi.fn(),
    mockUseQuery: vi.fn(() => ({
      data: { validateEmailToken: { isValid: true } },
      loading: false,
      error: null,
    })),
  }),
);

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  useSearch: () => mockUseSearch(),
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));

vi.mock("@apollo/client/react", () => ({
  useQuery: () => mockUseQuery(),
  useMutation: vi.fn(() => [mockMutation, { loading: false }]),
}));

vi.mock("@/common/components/seo/page-seo", () => ({ PageSEO: () => null }));

function expectPageHeading(name: string) {
  const main = screen.getByRole("main");
  expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  expect(
    within(main).getByRole("heading", { level: 1, name }),
  ).toBeInTheDocument();
  return main;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUseSearch.mockReturnValue({ token: "valid-token" });
  mockUseQuery.mockReturnValue({
    data: { validateEmailToken: { isValid: true } },
    loading: false,
    error: null,
  });
});

describe("ResetPasswordPage main landmark and heading", () => {
  it("marks the form shell", () => {
    render(<ResetPasswordPage />);
    expectPageHeading("Reset your password");
  });

  it("marks the validating shell", () => {
    mockUseQuery.mockReturnValue({ data: null, loading: true, error: null });
    render(<ResetPasswordPage />);
    expectPageHeading("Reset your password");
  });

  it.each([undefined, "invalid-token"])(
    "names the expired-token page and offers a fresh link for token %s",
    (token) => {
      mockUseSearch.mockReturnValue({ token });
      mockUseQuery.mockReturnValue({
        data: { validateEmailToken: { isValid: false } },
        loading: false,
        error: null,
      });
      render(<ResetPasswordPage />);
      const main = expectPageHeading("Token Expired");
      expect(
        within(main).getByRole("link", { name: "Request a new link" }),
      ).toHaveAttribute("href", "/auth/forgot-password");
      expect(
        within(main).getByRole("link", { name: "Back to Sign in" }),
      ).toHaveAttribute("href", "/auth/login");
    },
  );

  it("marks the validation-unavailable shell", () => {
    mockUseQuery.mockReturnValue({
      data: null,
      loading: false,
      error: new Error("network"),
      refetch: vi.fn(),
    });
    render(<ResetPasswordPage />);
    expectPageHeading("Couldn't check your reset link");
  });

  it("marks the success shell", async () => {
    const user = userEvent.setup();
    mockMutation.mockResolvedValue({
      data: { resetPassword: { success: true } },
    });
    render(<ResetPasswordPage />);

    await user.type(screen.getByLabelText("New Password"), "aVeryGoodPass1");
    await user.type(
      screen.getByLabelText("Confirm New Password"),
      "aVeryGoodPass1",
    );
    await user.click(screen.getByRole("button", { name: "Reset password" }));

    await waitFor(() =>
      expect(
        screen.getByText("Password reset successful!"),
      ).toBeInTheDocument(),
    );
    expectPageHeading("Password reset successful!");
  });
});
