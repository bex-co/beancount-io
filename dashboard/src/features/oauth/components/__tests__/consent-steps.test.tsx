import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ConsentLoginStep,
  ConsentOtpStep,
  ConsentRegisterStep,
} from "../consent-steps";

const state = vi.hoisted(() => ({
  resetStore: vi.fn(),
  loginOptions: null as { onSuccess: () => void } | null,
  registerArgs: null as {
    withDefaultLedger: boolean;
    onSuccess: (sessionId: string, email: string) => void;
    onSignedIn: (email: string) => void;
  } | null,
  otpOptions: null as { sessionId: string; onSuccess: () => void } | null,
  loginFormProps: null as Record<string, unknown> | null,
  registerFormProps: null as Record<string, unknown> | null,
  otpFormProps: null as Record<string, unknown> | null,
}));

vi.mock("@apollo/client/react", () => ({
  useApolloClient: () => ({ resetStore: state.resetStore }),
}));

vi.mock("@/features/auth/hooks/use-login-form", () => ({
  useLoginForm: (options: { onSuccess: () => void }) => {
    state.loginOptions = options;
    return { onSubmit: vi.fn(), isLoading: false, serverError: "" };
  },
}));

vi.mock("@/features/oauth/hooks/use-consent-register-form", () => ({
  useConsentRegisterForm: (args: {
    withDefaultLedger: boolean;
    onSuccess: (sessionId: string, email: string) => void;
    onSignedIn: (email: string) => void;
  }) => {
    state.registerArgs = args;
    return {
      onSubmit: vi.fn(),
      isLoading: false,
      serverError: "",
      defaultUsername: "generated-name",
    };
  },
}));

vi.mock("@/features/auth/hooks/use-otp-form", () => ({
  useOtpForm: (options: { sessionId: string; onSuccess: () => void }) => {
    state.otpOptions = options;
    return { onSubmit: vi.fn(), isLoading: false, serverError: "" };
  },
}));

vi.mock("@/features/auth/components/login-form", () => ({
  LoginForm: (props: Record<string, unknown>) => {
    state.loginFormProps = props;
    return <div data-testid="login-form" />;
  },
}));

vi.mock("@/features/auth/components/register-form", () => ({
  RegisterForm: (props: Record<string, unknown>) => {
    state.registerFormProps = props;
    return <div data-testid="register-form" />;
  },
}));

vi.mock("@/features/auth/components/otp-form", () => ({
  OtpForm: (props: Record<string, unknown>) => {
    state.otpFormProps = props;
    return <div data-testid="otp-form" />;
  },
}));

beforeEach(() => {
  state.resetStore.mockClear();
  state.loginOptions = null;
  state.registerArgs = null;
  state.otpOptions = null;
  state.loginFormProps = null;
  state.registerFormProps = null;
  state.otpFormProps = null;
});

describe("ConsentLoginStep", () => {
  it("renders the page's title and description copy", () => {
    render(
      <ConsentLoginStep
        onSuccess={vi.fn()}
        onForgotPasswordClick={vi.fn()}
        onRegisterClick={vi.fn()}
        titleKey="auth.oauthSignInToContinue"
        descriptionKey="auth.oauthAppWantsAccess"
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Sign in to continue" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("An app wants to access your Beancount ledger."),
    ).toBeInTheDocument();
  });

  it("renders a bare title when the page has no description", () => {
    render(
      <ConsentLoginStep
        onSuccess={vi.fn()}
        onForgotPasswordClick={vi.fn()}
        onRegisterClick={vi.fn()}
        titleKey="auth.oauthMobileSignInTitle"
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Sign in to Beancount" }),
    ).toBeInTheDocument();
  });

  it("resets the store before reporting a finished sign-in", async () => {
    const onSuccess = vi.fn();
    render(
      <ConsentLoginStep
        onSuccess={onSuccess}
        onForgotPasswordClick={vi.fn()}
        onRegisterClick={vi.fn()}
        titleKey="auth.oauthSignInToContinue"
      />,
    );
    await state.loginOptions!.onSuccess();
    expect(state.resetStore).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("forwards the sign-up link visibility to the form", () => {
    render(
      <ConsentLoginStep
        onSuccess={vi.fn()}
        onForgotPasswordClick={vi.fn()}
        onRegisterClick={vi.fn()}
        titleKey="auth.oauthSignInToContinue"
        showSignUpLink={false}
      />,
    );
    expect(state.loginFormProps?.["showSignUpLink"]).toBe(false);
  });
});

describe("ConsentRegisterStep", () => {
  it("renders the page's title and passes the ledger flag to the hook", () => {
    render(
      <ConsentRegisterStep
        onSuccess={vi.fn()}
        onSignedIn={vi.fn()}
        onSignInClick={vi.fn()}
        withDefaultLedger={false}
        titleKey="auth.oauthRegisterToContinue"
        descriptionKey="auth.oauthIdentityWantsAccess"
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Create an account to continue" }),
    ).toBeInTheDocument();
    expect(state.registerArgs?.withDefaultLedger).toBe(false);
    expect(state.registerFormProps?.["defaultUsername"]).toBe("generated-name");
  });

  it("forwards the mobile username and legal-link display choices", () => {
    render(
      <ConsentRegisterStep
        onSuccess={vi.fn()}
        onSignedIn={vi.fn()}
        onSignInClick={vi.fn()}
        withDefaultLedger={true}
        titleKey="auth.oauthMobileRegisterTitle"
        hideUsername={true}
        showLegalLinks={false}
      />,
    );
    expect(state.registerArgs?.withDefaultLedger).toBe(true);
    expect(state.registerFormProps?.["hideUsername"]).toBe(true);
    expect(state.registerFormProps?.["showLegalLinks"]).toBe(false);
  });
});

describe("ConsentOtpStep", () => {
  it("renders the verification heading and wires the code form", async () => {
    const onSuccess = vi.fn();
    render(
      <ConsentOtpStep
        sessionId="session-1"
        email="ada@example.com"
        onSuccess={onSuccess}
        onBack={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Verify your email to continue" }),
    ).toBeInTheDocument();
    expect(state.otpOptions?.sessionId).toBe("session-1");
    expect(state.otpFormProps?.["email"]).toBe("ada@example.com");

    await state.otpOptions!.onSuccess();
    expect(state.resetStore).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });
});
