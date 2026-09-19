import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => (
    <a href="#">{children}</a>
  ),
  useNavigate: () => vi.fn(),
  useSearch: () => ({}),
}));

const sendForgotPasswordLink = vi.fn();
vi.mock("@apollo/client/react", () => ({
  useMutation: () => [sendForgotPasswordLink, { loading: false }],
  useApolloClient: () => ({ query: vi.fn(), resetStore: vi.fn() }),
}));

vi.mock("@/common/hooks/use-translations", () => ({
  useTranslations: () => ({ t: (key: string) => key }),
}));

import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";
import { LoginForm } from "@/features/auth/components/login-form";
import { RegisterForm } from "@/features/auth/components/register-form";

/**
 * Resolve the association the way assistive technology does: follow
 * aria-describedby to the elements it names and read them. Asserting that a
 * message is merely visible is what let this defect ship.
 */
function describedBy(field: HTMLElement) {
  const ids = (field.getAttribute("aria-describedby") ?? "")
    .split(/\s+/)
    .filter(Boolean);
  return {
    ids,
    nodes: ids.map((id) => document.getElementById(id)),
    text: ids
      .map((id) => document.getElementById(id)?.textContent?.trim() ?? "")
      .join(" "),
  };
}

function expectAssociatedError(field: HTMLElement, expected: RegExp) {
  expect(field).toHaveAttribute("aria-invalid", "true");
  const { ids, nodes, text } = describedBy(field);
  expect(ids.length).toBeGreaterThan(0);
  // Every referenced id must resolve — a dangling idref announces nothing.
  expect(nodes.every(Boolean)).toBe(true);
  expect(nodes.some((n) => n?.getAttribute("role") === "alert")).toBe(true);
  expect(text).toMatch(expected);
}

function expectNoAssociation(field: HTMLElement) {
  expect(field).not.toHaveAttribute("aria-invalid");
  expect(field).not.toHaveAttribute("aria-describedby");
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("LoginForm field errors", () => {
  const renderForm = () => {
    const onSubmit = vi.fn();
    render(<LoginForm onSubmit={onSubmit} isLoading={false} />);
    return {
      onSubmit,
      email: screen.getByLabelText("auth.emailAddress"),
      password: screen.getByLabelText("auth.password"),
      submit: screen.getByRole("button", { name: "auth.signIn" }),
    };
  };

  it("starts clean, with no invalid state or description", () => {
    const { email, password } = renderForm();
    expectNoAssociation(email);
    expectNoAssociation(password);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("associates both errors on an empty submit without signing in", async () => {
    const user = userEvent.setup();
    const { onSubmit, email, password, submit } = renderForm();

    await user.click(submit);

    await waitFor(() => expectAssociatedError(email, /required/i));
    expectAssociatedError(password, /required/i);
    // Local validation must not reach the sign-in mutation.
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("associates an invalid email with its own message", async () => {
    const user = userEvent.setup();
    const { onSubmit, email, submit } = renderForm();

    await user.type(email, "not-an-email");
    await user.click(submit);

    await waitFor(() => expectAssociatedError(email, /emailInvalid/i));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("clears the association once the field is corrected", async () => {
    const user = userEvent.setup();
    const { email, password, submit } = renderForm();

    await user.click(submit);
    await waitFor(() => expectAssociatedError(email, /required/i));

    await user.type(email, "qa@example.com");
    await user.tab();

    await waitFor(() => expectNoAssociation(email));
    // The still-empty password keeps its own association.
    expectAssociatedError(password, /required/i);
  });

  it("forwards the attributes through PasswordInput to the real input", async () => {
    const user = userEvent.setup();
    const { password, submit } = renderForm();

    await user.click(submit);

    await waitFor(() => expect(password.tagName).toBe("INPUT"));
    expectAssociatedError(password, /required/i);
  });

  it("keeps the visibility toggle working while an error is shown", async () => {
    const user = userEvent.setup();
    const { password, submit } = renderForm();

    await user.click(submit);
    await waitFor(() => expectAssociatedError(password, /required/i));

    await user.click(screen.getByRole("button", { name: "auth.showPassword" }));
    expect(password).toHaveAttribute("type", "text");
    expectAssociatedError(password, /required/i);
  });
});

describe("ForgotPasswordForm field errors", () => {
  it("associates the email error on blur without sending a reset link", async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);
    const email = screen.getByLabelText("auth.emailAddress");

    expectNoAssociation(email);
    await user.click(email);
    await user.tab();

    await waitFor(() => expectAssociatedError(email, /.+/));
    expect(sendForgotPasswordLink).not.toHaveBeenCalled();
  });

  it("clears the stale message once a valid address is entered", async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordForm />);
    const email = screen.getByLabelText("auth.emailAddress");

    await user.click(email);
    await user.tab();
    await waitFor(() => expectAssociatedError(email, /.+/));

    await user.type(email, "qa@example.com");
    await user.tab();

    await waitFor(() => expectNoAssociation(email));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(sendForgotPasswordLink).not.toHaveBeenCalled();
  });
});

describe("RegisterForm field errors", () => {
  const renderForm = () => {
    const onSubmit = vi.fn();
    render(
      <RegisterForm
        onSubmit={onSubmit}
        isLoading={false}
        defaultUsername="qa-user"
      />,
    );
    return {
      onSubmit,
      email: screen.getByLabelText("auth.emailAddress"),
      password: screen.getByLabelText("auth.password"),
      confirm: screen.getByLabelText("auth.confirmPassword"),
      username: screen.getByLabelText("auth.username"),
      submit: screen.getByRole("button", { name: "auth.createAccount" }),
    };
  };

  it("associates all three errors on an empty submit without registering", async () => {
    const user = userEvent.setup();
    const { onSubmit, email, password, confirm, submit } = renderForm();

    await user.click(submit);

    await waitFor(() => expectAssociatedError(email, /required/i));
    expectAssociatedError(password, /required/i);
    expectAssociatedError(confirm, /confirmPasswordRequired/i);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("keeps Username's persistent hint through a failed submit", async () => {
    const user = userEvent.setup();
    const { username, submit } = renderForm();

    expect(describedBy(username).ids).toEqual(["username-hint"]);
    await user.click(submit);

    await waitFor(() =>
      expect(screen.getAllByRole("alert").length).toBeGreaterThanOrEqual(3),
    );
    // The hint is guidance, not an error: it must survive validation.
    expect(describedBy(username).ids).toContain("username-hint");
    expect(describedBy(username).nodes.every(Boolean)).toBe(true);
  });

  it("associates a mismatched confirmation with its own message", async () => {
    const user = userEvent.setup();
    const { confirm, password, submit } = renderForm();

    await user.type(
      screen.getByLabelText("auth.emailAddress"),
      "qa@example.com",
    );
    await user.type(password, "Abcdefgh1!");
    await user.type(confirm, "Abcdefgh2!");
    await user.click(submit);

    await waitFor(() => expectAssociatedError(confirm, /.+/));
  });

  it("associates the optional name fields when they are invalid", async () => {
    const user = userEvent.setup();
    const { submit } = renderForm();
    const firstName = screen.getByLabelText("auth.firstName");

    await user.type(firstName, "a".repeat(51));
    await user.click(submit);

    await waitFor(() => expectAssociatedError(firstName, /.+/));
  });

  it("clears the association once the field is corrected", async () => {
    const user = userEvent.setup();
    const { email, submit } = renderForm();

    await user.click(submit);
    await waitFor(() => expectAssociatedError(email, /required/i));

    await user.type(email, "qa@example.com");
    await user.tab();

    await waitFor(() => expectNoAssociation(email));
  });
});
