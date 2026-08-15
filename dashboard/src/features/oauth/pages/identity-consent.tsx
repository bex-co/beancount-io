import { useState } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { useApolloClient } from "@apollo/client/react";
import { Button } from "@/common/components/ui/button";
import { useTranslations } from "@/common/hooks/use-translations";
import { useLoginForm } from "@/features/auth/hooks/use-login-form";
import { useRegisterForm } from "@/features/auth/hooks/use-register-form";
import { useOtpForm } from "@/features/auth/hooks/use-otp-form";
import { LoginForm } from "@/features/auth/components/login-form";
import { RegisterForm } from "@/features/auth/components/register-form";
import { OtpForm } from "@/features/auth/components/otp-form";

const routeApi = getRouteApi("/oauth/identity-consent");

// "otp" variant requires sessionId + email; "login"/"register"/"approve" are simple.
// Unlike the MCP consent page (features/oauth/pages/consent.tsx), there is no
// ledger-selection step — this provider proves identity only (see
// backend-v2/src/features/oauth/api/identity-oidc-route.ts).
type IdentityOAuthState =
  | { step: "login" | "register" | "approve" }
  | { step: "otp"; sessionId: string; email: string };

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
      <div>
        <h2 className="text-lg font-semibold">
          {t("auth.oauthSignInToContinue")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("auth.oauthIdentityWantsAccess")}
        </p>
      </div>
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
    { withDefaultLedger: false, onSuccess },
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">
          {t("auth.oauthRegisterToContinue")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("auth.oauthIdentityWantsAccess")}
        </p>
      </div>
      <RegisterForm
        onSubmit={onSubmit}
        isLoading={isLoading}
        serverError={serverError}
        defaultUsername={defaultUsername}
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
      <div>
        <h2 className="text-lg font-semibold">
          {t("auth.oauthVerifyEmailToContinue")}
        </h2>
      </div>
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

function ApproveStep({ uid, email }: { uid: string; email?: string }) {
  const { t } = useTranslations();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">
          {t("auth.oauthIdentityApproveTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("auth.oauthIdentityApproveDescription")}
        </p>
      </div>
      {email && (
        <p className="text-xs text-muted-foreground">
          {t("auth.oauthIdentitySignedInAs", { email })}
        </p>
      )}
      <form method="POST" action={`/oauth/identity-consent?uid=${uid}`}>
        <Button type="submit" className="w-full">
          {t("auth.oauthApproveAccess")}
        </Button>
      </form>
    </div>
  );
}

export default function IdentityOAuthConsentPage() {
  const { uid } = routeApi.useSearch();
  const { initialStep, email: sessionEmail } = routeApi.useLoaderData();
  const [state, setState] = useState<IdentityOAuthState>({
    step: initialStep,
  });
  const [approvedEmail, setApprovedEmail] = useState(sessionEmail);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold">Beancount</span>
        </div>
        {state.step === "login" && (
          <LoginStep
            onSuccess={() => setState({ step: "approve" })}
            onRegisterClick={() => setState({ step: "register" })}
          />
        )}
        {state.step === "register" && (
          <RegisterStep
            onSuccess={(sessionId, email) =>
              setState({ step: "otp", sessionId, email })
            }
            onSignInClick={() => setState({ step: "login" })}
          />
        )}
        {state.step === "otp" && (
          <OtpStep
            sessionId={state.sessionId}
            email={state.email}
            onSuccess={() => {
              setApprovedEmail(state.email);
              setState({ step: "approve" });
            }}
            onBack={() => setState({ step: "register" })}
          />
        )}
        {state.step === "approve" && (
          <ApproveStep uid={uid} email={approvedEmail} />
        )}
      </div>
    </div>
  );
}
