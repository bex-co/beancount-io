import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ResetPasswordPage from "../index";

// Mock dependencies - use vi.hoisted() to ensure mocks are available in hoisted vi.mock() calls
const { mockNavigate, mockUseSearch, mockMutation, mockUseQuery } = vi.hoisted(
  () => {
    return {
      mockNavigate: vi.fn(),
      mockUseSearch: vi.fn(() => ({ token: "valid-token" })),
      mockMutation: vi.fn(),
      mockUseQuery: vi.fn(() => ({
        data: { validateEmailToken: { isValid: true } },
        loading: false,
        error: null,
      })),
    };
  },
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

// Mock SEO components (they use useLocation which requires router context)
vi.mock("@/common/components/seo/page-seo", () => ({
  PageSEO: () => null,
}));

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSearch.mockReturnValue({ token: "valid-token" });
    mockUseQuery.mockReturnValue({
      data: { validateEmailToken: { isValid: true } },
      loading: false,
      error: null,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("with valid token", () => {
    it("should render reset password form", () => {
      render(<ResetPasswordPage />);

      expect(screen.getByText("Reset your password")).toBeInTheDocument();
      expect(
        screen.getByText("Enter your new password below"),
      ).toBeInTheDocument();
      expect(screen.getByLabelText("New Password")).toBeInTheDocument();
      expect(screen.getByLabelText("Confirm New Password")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Reset password" }),
      ).toBeInTheDocument();
    });

    it("should show back to sign in link", () => {
      render(<ResetPasswordPage />);

      expect(
        screen.getByRole("link", { name: "Back to Sign in" }),
      ).toBeInTheDocument();
    });

    it("should show validation error for short password", async () => {
      const user = userEvent.setup();
      render(<ResetPasswordPage />);

      const passwordInput = screen.getByLabelText("New Password");
      await user.type(passwordInput, "12345");
      await user.tab();

      await waitFor(() => {
        expect(
          screen.getByText("Password must be at least 6 characters"),
        ).toBeInTheDocument();
      });
    });

    it("should show validation error for mismatched passwords", async () => {
      const user = userEvent.setup();
      render(<ResetPasswordPage />);

      const passwordInput = screen.getByLabelText("New Password");
      const confirmPasswordInput = screen.getByLabelText(
        "Confirm New Password",
      );

      await user.type(passwordInput, "password123");
      await user.type(confirmPasswordInput, "password456");
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
      });
    });

    it("should disable submit button when passwords do not match", async () => {
      const user = userEvent.setup();
      render(<ResetPasswordPage />);

      const passwordInput = screen.getByLabelText("New Password");
      const confirmPasswordInput = screen.getByLabelText(
        "Confirm New Password",
      );

      await user.type(passwordInput, "password123");
      await user.type(confirmPasswordInput, "password456");

      const submitButton = screen.getByRole("button", {
        name: "Reset password",
      });
      expect(submitButton).toBeDisabled();
    });

    it("should enable submit button when passwords match", async () => {
      const user = userEvent.setup();
      render(<ResetPasswordPage />);

      const passwordInput = screen.getByLabelText("New Password");
      const confirmPasswordInput = screen.getByLabelText(
        "Confirm New Password",
      );

      await user.type(passwordInput, "password123");
      await user.type(confirmPasswordInput, "password123");

      const submitButton = screen.getByRole("button", {
        name: "Reset password",
      });
      expect(submitButton).not.toBeDisabled();
    });

    it("should show success state on successful password reset", async () => {
      const user = userEvent.setup();
      vi.useFakeTimers({ shouldAdvanceTime: true });

      mockMutation.mockResolvedValue({
        data: {
          resetPassword: {
            success: true,
          },
        },
      });

      render(<ResetPasswordPage />);

      const passwordInput = screen.getByLabelText("New Password");
      const confirmPasswordInput = screen.getByLabelText(
        "Confirm New Password",
      );
      const submitButton = screen.getByRole("button", {
        name: "Reset password",
      });

      await user.type(passwordInput, "newpassword123");
      await user.type(confirmPasswordInput, "newpassword123");
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText("Password reset successful!"),
        ).toBeInTheDocument();
      });
    });

    it("should navigate to login after successful password reset", async () => {
      const user = userEvent.setup();
      vi.useFakeTimers({ shouldAdvanceTime: true });

      mockMutation.mockResolvedValue({
        data: {
          resetPassword: {
            success: true,
          },
        },
      });

      render(<ResetPasswordPage />);

      const passwordInput = screen.getByLabelText("New Password");
      const confirmPasswordInput = screen.getByLabelText(
        "Confirm New Password",
      );
      const submitButton = screen.getByRole("button", {
        name: "Reset password",
      });

      await user.type(passwordInput, "newpassword123");
      await user.type(confirmPasswordInput, "newpassword123");
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText("Password reset successful!"),
        ).toBeInTheDocument();
      });

      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      expect(mockNavigate).toHaveBeenCalledWith({ to: "/auth/login" });
    });

    it("should show error when API returns failure", async () => {
      const user = userEvent.setup();

      mockMutation.mockResolvedValue({
        data: {
          resetPassword: {
            success: false,
          },
        },
      });

      render(<ResetPasswordPage />);

      const passwordInput = screen.getByLabelText("New Password");
      const confirmPasswordInput = screen.getByLabelText(
        "Confirm New Password",
      );
      const submitButton = screen.getByRole("button", {
        name: "Reset password",
      });

      await user.type(passwordInput, "newpassword123");
      await user.type(confirmPasswordInput, "newpassword123");
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText("Failed to reset password. Please try again."),
        ).toBeInTheDocument();
      });
    });

    it("should show the localized generic message when the API throws", async () => {
      const user = userEvent.setup();

      mockMutation.mockRejectedValue(new Error("Network error"));

      render(<ResetPasswordPage />);

      const passwordInput = screen.getByLabelText("New Password");
      const confirmPasswordInput = screen.getByLabelText(
        "Confirm New Password",
      );
      const submitButton = screen.getByRole("button", {
        name: "Reset password",
      });

      await user.type(passwordInput, "newpassword123");
      await user.type(confirmPasswordInput, "newpassword123");
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText("Something went wrong. Please try again."),
        ).toBeInTheDocument();
      });
    });

    it("should show the localized generic message for non-Error exceptions", async () => {
      const user = userEvent.setup();

      mockMutation.mockRejectedValue("Unknown error");

      render(<ResetPasswordPage />);

      const passwordInput = screen.getByLabelText("New Password");
      const confirmPasswordInput = screen.getByLabelText(
        "Confirm New Password",
      );
      const submitButton = screen.getByRole("button", {
        name: "Reset password",
      });

      await user.type(passwordInput, "newpassword123");
      await user.type(confirmPasswordInput, "newpassword123");
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText("Something went wrong. Please try again."),
        ).toBeInTheDocument();
      });
    });
  });

  describe("while validating token", () => {
    it("should show loading skeleton while validating token", () => {
      mockUseQuery.mockReturnValue({
        data: null,
        loading: true,
        error: null,
      });

      render(<ResetPasswordPage />);

      // Should show skeleton loading state
      expect(screen.queryByText("Reset your password")).not.toBeInTheDocument();
    });
  });

  describe("with invalid or missing token", () => {
    it("should show error when token is missing", () => {
      mockUseSearch.mockReturnValue({});

      render(<ResetPasswordPage />);

      expect(screen.getByText("Token Expired")).toBeInTheDocument();
      expect(
        screen.getByText("The password reset token is expired or invalid"),
      ).toBeInTheDocument();
    });

    it("should show error when token is invalid", () => {
      mockUseQuery.mockReturnValue({
        data: { validateEmailToken: { isValid: false } },
        loading: false,
        error: null,
      });

      render(<ResetPasswordPage />);

      expect(screen.getByText("Token Expired")).toBeInTheDocument();
    });

    it("should show error when validation query fails", () => {
      mockUseQuery.mockReturnValue({
        data: null,
        loading: false,
        error: new Error("Validation failed"),
      });

      render(<ResetPasswordPage />);

      expect(screen.getByText("Token Expired")).toBeInTheDocument();
    });

    it("should show back to sign in link on error page", () => {
      mockUseSearch.mockReturnValue({});

      render(<ResetPasswordPage />);

      expect(
        screen.getByRole("link", { name: "Back to Sign in" }),
      ).toBeInTheDocument();
    });
  });
});
