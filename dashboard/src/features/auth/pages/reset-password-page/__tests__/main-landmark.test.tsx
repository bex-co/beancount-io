import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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

function expectOneMainAround(text: string | RegExp) {
  const mains = document.querySelectorAll("main, [role='main']");
  expect(mains).toHaveLength(1);
  const marker = screen.getByText(text);
  expect(mains[0].contains(marker)).toBe(true);
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

describe("ResetPasswordPage main landmark", () => {
  it("marks the form shell", () => {
    render(<ResetPasswordPage />);
    expectOneMainAround("Reset your password");
  });

  it("marks the validating shell", () => {
    mockUseQuery.mockReturnValue({ data: null, loading: true, error: null });
    render(<ResetPasswordPage />);
    expect(document.querySelectorAll("main, [role='main']")).toHaveLength(1);
  });

  it("marks the expired-token shell", () => {
    mockUseSearch.mockReturnValue({});
    render(<ResetPasswordPage />);
    expectOneMainAround("Token Expired");
  });

  it("marks the validation-unavailable shell", () => {
    mockUseQuery.mockReturnValue({
      data: null,
      loading: false,
      error: new Error("network"),
      refetch: vi.fn(),
    });
    render(<ResetPasswordPage />);
    expectOneMainAround("Couldn't check your reset link");
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
    expectOneMainAround("Password reset successful!");
  });
});
