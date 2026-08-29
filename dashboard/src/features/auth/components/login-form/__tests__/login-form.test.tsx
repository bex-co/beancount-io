import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LoginForm } from "../index";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));

const defaultProps = {
  onSubmit: vi.fn().mockResolvedValue(undefined),
  isLoading: false,
  serverError: "",
};

describe("LoginForm password recovery", () => {
  it("links to standalone password recovery by default", () => {
    render(<LoginForm {...defaultProps} />);

    expect(
      screen.getByRole("link", { name: "Forgot Password?" }),
    ).toHaveAttribute("href", "/auth/forgot-password");
  });

  it("can keep password recovery inside its parent flow", async () => {
    const user = userEvent.setup();
    const onForgotPasswordClick = vi.fn();
    render(
      <LoginForm
        {...defaultProps}
        onForgotPasswordClick={onForgotPasswordClick}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Forgot Password?" }));

    expect(onForgotPasswordClick).toHaveBeenCalledOnce();
    expect(
      screen.queryByRole("link", { name: "Forgot Password?" }),
    ).not.toBeInTheDocument();
  });
});
