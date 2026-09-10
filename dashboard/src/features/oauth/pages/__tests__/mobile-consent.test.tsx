import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MobileOAuthConsentPage, { submitMobileGrant } from "../mobile-consent";

const state = vi.hoisted(() => ({
  uid: "interaction-1",
  scope: "openid offline_access ledger.read ledger.write ledger.admin",
  screenHint: undefined as "signup" | undefined,
  initialState: { step: "continue" as const, email: "ada@example.test" },
  submit: vi.fn(),
}));

vi.mock("@apollo/client/react", () => ({
  useApolloClient: () => ({
    resetStore: vi.fn(),
    clearStore: vi.fn(),
  }),
  useMutation: () => [vi.fn()],
}));

vi.mock("@tanstack/react-router", () => ({
  getRouteApi: () => ({
    useSearch: () => ({
      uid: state.uid,
      scope: state.scope,
      screen_hint: state.screenHint,
    }),
    useLoaderData: () => ({ initialState: state.initialState }),
  }),
}));

vi.mock("@/features/auth/hooks/use-login-form", () => ({
  useLoginForm: () => ({
    onSubmit: vi.fn(),
    isLoading: false,
    serverError: "",
  }),
}));
vi.mock("@/features/auth/hooks/use-register-form", () => ({
  useRegisterForm: () => ({
    onSubmit: vi.fn(),
    isLoading: false,
    serverError: "",
    defaultUsername: "ada",
  }),
}));
vi.mock("@/features/auth/hooks/use-otp-form", () => ({
  useOtpForm: () => ({ onSubmit: vi.fn(), isLoading: false, serverError: "" }),
}));
vi.mock("@/features/auth/components/login-form", () => ({
  LoginForm: () => <div>login-form</div>,
}));
vi.mock("@/features/auth/components/register-form", () => ({
  RegisterForm: () => <div>register-form</div>,
}));
vi.mock("@/features/auth/components/otp-form", () => ({
  OtpForm: () => <div>otp-form</div>,
}));
vi.mock("@/features/auth/components/forgot-password-form", () => ({
  ForgotPasswordForm: () => <div>forgot-form</div>,
}));
vi.mock("@/features/auth/components/auth-page-layout", () => ({
  AuthPageLayout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

describe("submitMobileGrant", () => {
  beforeEach(() => {
    state.submit.mockReset();
    document.body.innerHTML = "";
  });

  it("posts decision=approve with the interaction scope", () => {
    const submit = vi
      .spyOn(HTMLFormElement.prototype, "submit")
      .mockImplementation(() => undefined);
    submitMobileGrant({ uid: state.uid, scope: state.scope });
    const form = document.querySelector("form");
    expect(form).not.toBeNull();
    expect(form?.getAttribute("method")?.toLowerCase()).toBe("post");
    expect(form?.getAttribute("action")).toBe(
      `/oauth/mobile-consent?${new URLSearchParams({
        uid: state.uid,
        scope: state.scope,
      })}`,
    );
    expect(Object.fromEntries(new FormData(form!))).toEqual({
      scope: state.scope,
      decision: "approve",
    });
    expect(submit).toHaveBeenCalledTimes(1);
    submit.mockRestore();
  });
});

describe("MobileOAuthConsentPage", () => {
  beforeEach(() => {
    state.screenHint = undefined;
    state.initialState = { step: "continue", email: "ada@example.test" };
    document.body.innerHTML = "";
  });

  it("posts the grant once when Continue as is tapped", () => {
    const submit = vi
      .spyOn(HTMLFormElement.prototype, "submit")
      .mockImplementation(() => undefined);
    render(<MobileOAuthConsentPage />);
    expect(screen.queryByText(/Allow Beancount Mobile/i)).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: /Continue as ada@example.test/i }),
    );
    expect(
      screen.getByRole("heading", { name: /Returning to Beancount/i }),
    ).toBeTruthy();
    expect(submit).toHaveBeenCalledTimes(1);
    submit.mockRestore();
  });

  it("shows retry after a failed grant submit and preserves uid/scope", () => {
    const submit = vi
      .spyOn(HTMLFormElement.prototype, "submit")
      .mockImplementation(() => {
        throw new Error("offline");
      });
    render(<MobileOAuthConsentPage />);
    fireEvent.click(
      screen.getByRole("button", { name: /Continue as ada@example.test/i }),
    );
    expect(screen.getByText(/Could not return to the app/i)).toBeTruthy();
    submit.mockImplementation(() => undefined);
    fireEvent.click(screen.getByRole("button", { name: /Try again/i }));
    expect(submit).toHaveBeenCalled();
    const form = document.querySelector("form");
    expect(form?.getAttribute("action")).toContain(`uid=${state.uid}`);
    expect(form?.getAttribute("action")).toContain("scope=");
    submit.mockRestore();
  });
});
