import { useReducer, useState } from "react";
import { useApolloClient, useMutation } from "@apollo/client/react";
import { getRouteApi } from "@tanstack/react-router";
import { Button } from "@/common/components/ui/button";
import { Alert, AlertDescription } from "@/common/components/ui/alert";
import { useTranslations } from "@/common/hooks/use-translations";
import { useLoginForm } from "@/features/auth/hooks/use-login-form";
import { useRegisterForm } from "@/features/auth/hooks/use-register-form";
import { useOtpForm } from "@/features/auth/hooks/use-otp-form";
import { LoginForm } from "@/features/auth/components/login-form";
import { RegisterForm } from "@/features/auth/components/register-form";
import { OtpForm } from "@/features/auth/components/otp-form";
import { LogoutDocument } from "@/graphql/definitions";
import { describeMobileScopes } from "@/features/oauth/funcs/mobile-scope-copy";
import {
  mobileOAuthConsentReducer,
  type MobileOAuthConsentAction,
} from "@/features/oauth/funcs/mobile-consent-state";

const routeApi = getRouteApi("/oauth/mobile-consent");

function LoginStep({
  onSuccess,
  onRegisterClick,
}: {
  onSuccess: () => void;
  onRegisterClick: () => void;
}) {
  const { t } = useTranslations();
  const client = useApolloClient();
  const { onSubmit, isLoading, serverError } = useLoginForm({
    onSuccess: async () => {
      await client.resetStore();
      onSuccess();
    },
  });

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">
        {t("auth.oauthMobileSignInTitle")}
      </h2>
      <LoginForm
        onSubmit={onSubmit}
        isLoading={isLoading}
        serverError={serverError}
        showForgotPasswordLink={false}
        showSignUpLink={true}
        onRegisterClick={onRegisterClick}
      />
    </div>
  );
}

function RegisterStep({
  onSuccess,
  onSignInClick,
}: {
  onSuccess: (sessionId: string, email: string) => void;
  onSignInClick: () => void;
}) {
  const { t } = useTranslations();
  const { onSubmit, isLoading, serverError, defaultUsername } = useRegisterForm(
    { withDefaultLedger: true, onSuccess },
  );

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">
        {t("auth.oauthMobileRegisterTitle")}
      </h2>
      <RegisterForm
        onSubmit={onSubmit}
        isLoading={isLoading}
        serverError={serverError}
        defaultUsername={defaultUsername}
        // The generated username is submitted as-is; it can be changed in
        // settings later, and it is one field fewer to type on a phone.
        hideUsername={true}
        showSignInLink={true}
        onSignInClick={onSignInClick}
      />
    </div>
  );
}

function OtpStep({
  sessionId,
  email,
  onSuccess,
  onBack,
}: {
  sessionId: string;
  email: string;
  onSuccess: () => void;
  onBack: () => void;
}) {
  const { t } = useTranslations();
  const client = useApolloClient();
  const { onSubmit, isLoading, serverError } = useOtpForm({
    sessionId,
    onSuccess: async () => {
      await client.resetStore();
      onSuccess();
    },
  });

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">
        {t("auth.oauthVerifyEmailToContinue")}
      </h2>
      <OtpForm
        email={email}
        onSubmit={onSubmit}
        isLoading={isLoading}
        serverError={serverError}
        onBack={onBack}
      />
    </div>
  );
}

/**
 * Signs the browser out and moves to another step. Logout can fail (offline,
 * expired session), so the failure is shown next to the button rather than
 * leaving the user on a page that silently did nothing.
 */
function SwitchAccountButton({
  label,
  onSwitch,
  variant = "ghost",
}: {
  label: string;
  onSwitch: () => Promise<void>;
  variant?: "ghost" | "outline";
}) {
  const { t } = useTranslations();
  const [error, setError] = useState("");

  return (
    <>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button
        type="button"
        variant={variant}
        className="w-full"
        onClick={() => {
          setError("");
          void onSwitch().catch(() =>
            setError(t("auth.oauthSwitchAccountFailed")),
          );
        }}
      >
        {label}
      </Button>
    </>
  );
}

function ChooseAccountStep({
  email,
  onContinue,
  onCreateDifferentAccount,
}: {
  email: string;
  onContinue: () => void;
  onCreateDifferentAccount: () => Promise<void>;
}) {
  const { t } = useTranslations();

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">
        {t("auth.oauthMobileChooseAccountTitle")}
      </h2>
      <div className="grid gap-2">
        <Button type="button" onClick={onContinue}>
          {t("auth.oauthMobileContinueAs", { email })}
        </Button>
        <SwitchAccountButton
          label={t("auth.oauthMobileCreateDifferentAccount")}
          onSwitch={onCreateDifferentAccount}
          variant="outline"
        />
      </div>
    </div>
  );
}

function ApproveStep({
  uid,
  email,
  scope,
  onSwitchAccount,
}: {
  uid: string;
  email?: string;
  scope: string;
  onSwitchAccount: () => Promise<void>;
}) {
  const { t } = useTranslations();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">
          {t("auth.oauthMobileAllowTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("auth.oauthMobileGrantDescription")}
        </p>
      </div>
      <ul className="list-disc space-y-1 pl-5 text-sm">
        {describeMobileScopes(scope, t).map((permission) => (
          <li key={permission}>{permission}</li>
        ))}
      </ul>
      {email && (
        <p className="text-xs text-muted-foreground">
          {t("auth.oauthIdentitySignedInAs", { email })}
        </p>
      )}
      <form
        method="POST"
        action={`/oauth/mobile-consent?${new URLSearchParams({ uid, scope })}`}
      >
        <input type="hidden" name="scope" value={scope} />
        <div className="grid gap-2">
          <Button type="submit" name="decision" value="approve">
            {t("auth.oauthApproveAccess")}
          </Button>
          <Button
            type="submit"
            name="decision"
            value="cancel"
            variant="outline"
          >
            {t("common.cancel")}
          </Button>
        </div>
      </form>
      <SwitchAccountButton
        label={t("auth.oauthUseAnotherAccount")}
        onSwitch={onSwitchAccount}
      />
    </div>
  );
}

export default function MobileOAuthConsentPage() {
  const { uid, scope } = routeApi.useSearch();
  const { initialState } = routeApi.useLoaderData();
  const [state, dispatch] = useReducer(mobileOAuthConsentReducer, initialState);
  const [logout] = useMutation(LogoutDocument);
  const client = useApolloClient();

  const switchAccount = async (next: MobileOAuthConsentAction) => {
    await logout();
    await client.clearStore();
    dispatch(next);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl border bg-card p-6 shadow-sm">
        <div className="text-xl font-bold">Beancount</div>
        {state.step === "login" && (
          <LoginStep
            onSuccess={() => dispatch({ type: "authenticated" })}
            onRegisterClick={() => dispatch({ type: "show_register" })}
          />
        )}
        {state.step === "register" && (
          <RegisterStep
            onSuccess={(sessionId, email) =>
              dispatch({ type: "registration_submitted", sessionId, email })
            }
            onSignInClick={() => dispatch({ type: "show_login" })}
          />
        )}
        {state.step === "otp" && (
          <OtpStep
            sessionId={state.sessionId}
            email={state.email}
            onSuccess={() => {
              dispatch({ type: "authenticated", email: state.email });
            }}
            onBack={() => dispatch({ type: "show_register" })}
          />
        )}
        {state.step === "choose_account" && (
          <ChooseAccountStep
            email={state.email}
            onContinue={() =>
              dispatch({ type: "authenticated", email: state.email })
            }
            onCreateDifferentAccount={() =>
              switchAccount({ type: "show_register" })
            }
          />
        )}
        {state.step === "approve" && (
          <ApproveStep
            uid={uid}
            email={state.email}
            scope={scope}
            onSwitchAccount={() => switchAccount({ type: "show_login" })}
          />
        )}
      </div>
    </div>
  );
}
