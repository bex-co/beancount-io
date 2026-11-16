import { useReducer, useState } from "react";
import { useApolloClient, useMutation } from "@apollo/client/react";
import { getRouteApi } from "@tanstack/react-router";
import { Button } from "@/common/components/ui/button";
import { Alert, AlertDescription } from "@/common/components/ui/alert";
import { useTranslations } from "@/common/hooks/use-translations";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";
import { AuthPageLayout } from "@/features/auth/components/auth-page-layout";
import {
  ConsentLoginStep,
  ConsentOtpStep,
  ConsentRegisterStep,
} from "@/features/oauth/components/consent-steps";
import { LogoutDocument } from "@/graphql/definitions";
import { describeMobileScopes } from "@/features/oauth/funcs/mobile-scope-copy";
import {
  mobileOAuthConsentReducer,
  type MobileOAuthConsentAction,
} from "@/features/oauth/funcs/mobile-consent-state";

const routeApi = getRouteApi("/oauth/mobile-consent");

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
  alternative,
  onContinue,
  onSwitch,
}: {
  email: string;
  alternative: "register" | "login";
  onContinue: () => void;
  onSwitch: () => Promise<void>;
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
          label={
            alternative === "register"
              ? t("auth.oauthMobileCreateDifferentAccount")
              : t("auth.oauthUseAnotherAccount")
          }
          onSwitch={onSwitch}
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

  if (state.step === "choose_account" || state.step === "approve") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm space-y-6 rounded-xl border bg-card p-6 shadow-sm">
          <div className="text-xl font-bold">Beancount</div>
          {state.step === "choose_account" && (
            <ChooseAccountStep
              email={state.email}
              alternative={state.alternative}
              onContinue={() =>
                dispatch({ type: "authenticated", email: state.email })
              }
              onSwitch={() =>
                switchAccount({
                  type:
                    state.alternative === "register"
                      ? "show_register"
                      : "show_login",
                })
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

  return (
    <AuthPageLayout>
      <div className="space-y-8">
        {state.step === "login" && (
          <ConsentLoginStep
            onSuccess={() => dispatch({ type: "authenticated" })}
            onForgotPasswordClick={() =>
              dispatch({ type: "show_forgot_password" })
            }
            onRegisterClick={() => dispatch({ type: "show_register" })}
            titleKey="auth.oauthMobileSignInTitle"
          />
        )}
        {state.step === "forgot_password" && (
          <ForgotPasswordForm
            onBackToSignIn={() => dispatch({ type: "show_login" })}
          />
        )}
        {state.step === "register" && (
          <ConsentRegisterStep
            onSuccess={(sessionId, email) =>
              dispatch({ type: "registration_submitted", sessionId, email })
            }
            onSignedIn={(email) => dispatch({ type: "authenticated", email })}
            onSignInClick={() => dispatch({ type: "show_login" })}
            withDefaultLedger={true}
            titleKey="auth.oauthMobileRegisterTitle"
            // The generated username is submitted as-is; it can be changed in
            // settings later, and it is one field fewer to type on a phone.
            hideUsername={true}
          />
        )}
        {state.step === "otp" && (
          <ConsentOtpStep
            sessionId={state.sessionId}
            email={state.email}
            onSuccess={() => {
              dispatch({ type: "authenticated", email: state.email });
            }}
            onBack={() => dispatch({ type: "show_register" })}
          />
        )}
      </div>
    </AuthPageLayout>
  );
}
