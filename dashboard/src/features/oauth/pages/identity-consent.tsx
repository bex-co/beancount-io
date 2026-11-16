import { useState } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { Button } from "@/common/components/ui/button";
import { useTranslations } from "@/common/hooks/use-translations";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";
import { AuthPageLayout } from "@/features/auth/components/auth-page-layout";
import {
  ConsentLoginStep,
  ConsentOtpStep,
  ConsentRegisterStep,
} from "@/features/oauth/components/consent-steps";

const routeApi = getRouteApi("/oauth/identity-consent");

// "otp" variant requires sessionId + email; "login"/"register"/"approve" are simple.
// Unlike the MCP consent page (features/oauth/pages/consent.tsx), there is no
// ledger-selection step — this provider proves identity only (see
// backend-v2/src/features/oauth/api/identity-oidc-route.ts).
type IdentityOAuthState =
  | { step: "login" | "forgot_password" | "register" | "approve" }
  | { step: "otp"; sessionId: string; email: string };

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

  if (state.step === "approve") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm space-y-6 rounded-xl border bg-card p-6 shadow-sm">
          <div className="text-xl font-bold">Beancount</div>
          <ApproveStep uid={uid} email={approvedEmail} />
        </div>
      </div>
    );
  }

  return (
    <AuthPageLayout>
      <div className="space-y-8">
        {state.step === "login" && (
          <ConsentLoginStep
            onSuccess={() => setState({ step: "approve" })}
            onForgotPasswordClick={() => setState({ step: "forgot_password" })}
            onRegisterClick={() => setState({ step: "register" })}
            titleKey="auth.oauthSignInToContinue"
            descriptionKey="auth.oauthIdentityWantsAccess"
          />
        )}
        {state.step === "forgot_password" && (
          <ForgotPasswordForm
            onBackToSignIn={() => setState({ step: "login" })}
          />
        )}
        {state.step === "register" && (
          <ConsentRegisterStep
            onSuccess={(sessionId, email) =>
              setState({ step: "otp", sessionId, email })
            }
            onSignedIn={(email) => {
              setApprovedEmail(email);
              setState({ step: "approve" });
            }}
            onSignInClick={() => setState({ step: "login" })}
            withDefaultLedger={false}
            titleKey="auth.oauthRegisterToContinue"
            descriptionKey="auth.oauthIdentityWantsAccess"
          />
        )}
        {state.step === "otp" && (
          <ConsentOtpStep
            sessionId={state.sessionId}
            email={state.email}
            onSuccess={() => {
              setApprovedEmail(state.email);
              setState({ step: "approve" });
            }}
            onBack={() => setState({ step: "register" })}
          />
        )}
      </div>
    </AuthPageLayout>
  );
}
