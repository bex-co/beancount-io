import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LoginForm } from "../index";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    search,
  }: {
    to: string;
    children: React.ReactNode;
    search?: unknown;
  }) => (
    <a href={to} data-search={typeof search === "function" ? "carry" : "none"}>
      {children}
    </a>
  ),
}));

const deployment = vi.hoisted(() => ({
  oidcProviderName: null as string | null,
}));

vi.mock("@/common/hooks/use-deployment-info", () => ({
  useDeploymentInfo: () => deployment,
}));

const defaultProps = {
  onSubmit: vi.fn().mockResolvedValue(undefined),
  isLoading: false,
  serverError: "",
};

describe("LoginForm password recovery", () => {
  it("links to standalone password recovery by default", () => {
    render(<LoginForm {...defaultProps} />);

    const link = screen.getByRole("link", { name: "Forgot Password?" });
    expect(link).toHaveAttribute("href", "/auth/forgot-password");
    expect(link).toHaveAttribute("data-search", "carry");
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

describe("LoginForm sign-up link", () => {
  it("offers sign-up by default", () => {
    const { container } = render(<LoginForm {...defaultProps} />);
    expect(container.querySelector('a[href="/auth/sign-up"]')).not.toBeNull();
  });

  it("offers none once the deployment takes no more sign-ups", () => {
    const { container } = render(
      <LoginForm {...defaultProps} showSignUpLink={false} />,
    );
    expect(container.querySelector('a[href="/auth/sign-up"]')).toBeNull();
    expect(
      screen.getByRole("button", { name: /sign in/i }),
    ).toBeInTheDocument();
  });
});

describe("LoginForm provider sign-in", () => {
  it("offers no provider button when none is set up", () => {
    deployment.oidcProviderName = null;
    render(<LoginForm {...defaultProps} />);
    expect(
      screen.queryByRole("link", { name: /sign in with/i }),
    ).not.toBeInTheDocument();
  });

  it("starts provider sign-in and returns to the given path", () => {
    deployment.oidcProviderName = "Keycloak";
    render(<LoginForm {...defaultProps} oidcNext="/ledger?x=1" />);
    expect(
      screen.getByRole("link", { name: "Sign in with Keycloak" }),
    ).toHaveAttribute(
      "href",
      "/api-gateway/auth/oidc/start?next=%2Fledger%3Fx%3D1",
    );
  });
});
