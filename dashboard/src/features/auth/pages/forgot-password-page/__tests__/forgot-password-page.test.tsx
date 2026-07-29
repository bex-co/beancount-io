import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ForgotPasswordPage from "../index";

// Mock dependencies
const mockMutation = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));

vi.mock("@apollo/client/react", () => ({
  useMutation: vi.fn(() => [mockMutation, { loading: false }]),
}));

// Mock SEO components (they use useLocation which requires router context)
vi.mock("@/common/components/seo/page-seo", () => ({
  PageSEO: () => null,
}));

describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render forgot password form", () => {
    render(<ForgotPasswordPage />);

    expect(screen.getByText("Forgot your password?")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Enter your email address and we'll send you a link to reset your password",
      ),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Email address")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Send reset link" }),
    ).toBeInTheDocument();
  });

  it("should show back to sign in link", () => {
    render(<ForgotPasswordPage />);

    expect(
      screen.getByRole("link", { name: "Back to Sign in" }),
    ).toBeInTheDocument();
  });

  it("should show validation error for invalid email", async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordPage />);

    const emailInput = screen.getByLabelText("Email address");
    await user.type(emailInput, "invalid-email");
    await user.tab(); // Trigger blur validation

    await waitFor(() => {
      expect(
        screen.getByText("Please enter a valid email address"),
      ).toBeInTheDocument();
    });
  });

  it("should disable submit button when email is invalid", () => {
    render(<ForgotPasswordPage />);

    const submitButton = screen.getByRole("button", {
      name: "Send reset link",
    });
    expect(submitButton).toBeDisabled();
  });

  it("should enable submit button when email is valid", async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordPage />);

    const emailInput = screen.getByLabelText("Email address");
    await user.type(emailInput, "test@example.com");

    const submitButton = screen.getByRole("button", {
      name: "Send reset link",
    });
    expect(submitButton).not.toBeDisabled();
  });

  it("should show success state on successful submission", async () => {
    const user = userEvent.setup();

    mockMutation.mockResolvedValue({
      data: {
        sendForgotPasswordLink: {
          success: true,
        },
      },
    });

    render(<ForgotPasswordPage />);

    const emailInput = screen.getByLabelText("Email address");
    const submitButton = screen.getByRole("button", {
      name: "Send reset link",
    });

    await user.type(emailInput, "test@example.com");
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText("Email sent!")).toBeInTheDocument();
    });
  });

  it("should show error when API returns failure", async () => {
    const user = userEvent.setup();

    mockMutation.mockResolvedValue({
      data: {
        sendForgotPasswordLink: {
          success: false,
        },
      },
    });

    render(<ForgotPasswordPage />);

    const emailInput = screen.getByLabelText("Email address");
    const submitButton = screen.getByRole("button", {
      name: "Send reset link",
    });

    await user.type(emailInput, "test@example.com");
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(
          "Failed to send password reset email. Please try again.",
        ),
      ).toBeInTheDocument();
    });
  });

  it("should show the localized generic message when the API throws", async () => {
    const user = userEvent.setup();

    mockMutation.mockRejectedValue(new Error("Network error"));

    render(<ForgotPasswordPage />);

    const emailInput = screen.getByLabelText("Email address");
    const submitButton = screen.getByRole("button", {
      name: "Send reset link",
    });

    await user.type(emailInput, "test@example.com");
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

    render(<ForgotPasswordPage />);

    const emailInput = screen.getByLabelText("Email address");
    const submitButton = screen.getByRole("button", {
      name: "Send reset link",
    });

    await user.type(emailInput, "test@example.com");
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText("Something went wrong. Please try again."),
      ).toBeInTheDocument();
    });
  });

  it("should change button text while submitting", async () => {
    const user = userEvent.setup();

    // Mock a slow mutation that never resolves
    let resolveMutation: (value: unknown) => void;
    const mutationPromise = new Promise((resolve) => {
      resolveMutation = resolve;
    });
    mockMutation.mockReturnValue(mutationPromise);

    render(<ForgotPasswordPage />);

    const emailInput = screen.getByLabelText("Email address");
    const submitButton = screen.getByRole("button", {
      name: "Send reset link",
    });

    await user.type(emailInput, "test@example.com");
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Sending..." }),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Sending..." })).toBeDisabled();
    });

    // Cleanup - resolve the promise to prevent act() warnings
    await waitFor(async () => {
      resolveMutation!({
        data: { sendForgotPasswordLink: { success: false } },
      });
    });
  });

  it("should show back to sign in link on success page", async () => {
    const user = userEvent.setup();

    mockMutation.mockResolvedValue({
      data: {
        sendForgotPasswordLink: {
          success: true,
        },
      },
    });

    render(<ForgotPasswordPage />);

    const emailInput = screen.getByLabelText("Email address");
    const submitButton = screen.getByRole("button", {
      name: "Send reset link",
    });

    await user.type(emailInput, "test@example.com");
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByRole("link", { name: "Back to Sign in" }),
      ).toBeInTheDocument();
    });
  });
});
