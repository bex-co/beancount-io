/**
 * Credential forms must not be submittable before the client takes over.
 *
 * A server-rendered `<form>` has no React handler yet. Without an explicit
 * method the native default is GET, so a submission puts every field —
 * password included — into the URL, and from there into history, the referrer
 * and any log that records request lines.
 *
 * These assert the *server* output, because that is the markup a reader has
 * while scripts are loading or after they fail. All fixtures are synthetic.
 */
import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "../login-form";
import { RegisterForm } from "../register-form";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, ...props }: { children: React.ReactNode }) => (
    <a {...props}>{children}</a>
  ),
}));

const loginProps = {
  onSubmit: vi.fn(),
  isLoading: false,
  serverError: "",
};

const registerProps = {
  onSubmit: vi.fn(),
  isLoading: false,
  serverError: "",
};

/** The markup a reader holds before any JavaScript runs. */
const serverMarkup = {
  login: () => renderToString(<LoginForm {...loginProps} />),
  register: () => renderToString(<RegisterForm {...registerProps} />),
};

describe.each(["login", "register"] as const)(
  "%s form, before hydration",
  (which) => {
    it("never declares a GET form", () => {
      const html = serverMarkup[which]();
      // React omits `method` entirely when it is not set, and the native
      // default is then GET — which is the defect.
      expect(html).toContain('method="post"');
      expect(html).not.toContain('method="get"');
    });

    it("renders its submit button disabled", () => {
      const html = serverMarkup[which]();
      const submit = /<button[^>]*type="submit"[^>]*>/.exec(html)?.[0] ?? "";
      expect(submit).not.toBe("");
      // The *attribute*, not the class list — the button's Tailwind classes
      // contain `disabled:pointer-events-none`, so a substring check on
      // "disabled" passes even with no attribute at all.
      expect(submit).toMatch(/\sdisabled=""/);
    });

    it("says why it cannot be used without scripts", () => {
      const html = serverMarkup[which]();
      expect(html).toContain("<noscript>");
      expect(html).toContain("needs JavaScript");
    });

    it("still carries its password field, so the risk is real", () => {
      // If this ever stops being true the other assertions are vacuous.
      expect(serverMarkup[which]()).toContain('type="password"');
    });
  },
);

describe("once hydrated", () => {
  it("enables the login submit button", async () => {
    cleanup();
    render(<LoginForm {...loginProps} />);
    expect(
      await screen.findByRole("button", { name: "Sign In" }),
    ).toBeEnabled();
  });

  it("submits through the client rather than the browser", async () => {
    cleanup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<LoginForm {...loginProps} onSubmit={onSubmit} />);

    await user.type(
      screen.getByLabelText("Email address"),
      "qa-fixture@example.invalid",
    );
    await user.type(screen.getByLabelText("Password"), "NotARealSecret-000");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    // The client handler received the values, so nothing was left to the
    // browser's native submission.
    expect(onSubmit).toHaveBeenCalled();
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      email: "qa-fixture@example.invalid",
      password: "NotARealSecret-000",
    });
  });

  it("keeps an empty submit on the page", async () => {
    cleanup();
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<LoginForm {...loginProps} onSubmit={onSubmit} />);
    await user.click(screen.getByRole("button", { name: "Sign In" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(await screen.findAllByRole("alert")).not.toHaveLength(0);
  });
});
