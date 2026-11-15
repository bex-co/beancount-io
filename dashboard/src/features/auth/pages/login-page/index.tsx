import { useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { useApolloClient } from "@apollo/client/react";
import { PageSEO } from "@/common/components/seo/page-seo";
import { decodeLedgerId } from "@/common/lib/utils/encode";
import { getUserDefaultLedger } from "@/common/lib/utils/ledger-utils";
import { getSafeRedirectPath } from "@/common/lib/auth/auth";
import { hardNavigate } from "@/common/lib/navigation/hard-navigate";
import { useTranslations } from "@/common/hooks/use-translations";
import { useLoginForm } from "@/features/auth/hooks/use-login-form";
import { useDeploymentInfo } from "@/features/auth/hooks/use-deployment-info";
import { LoginForm } from "@/features/auth/components/login-form";
import { SignInRecovery } from "@/features/auth/components/sign-in-recovery";
import { AuthPageLayout } from "@/features/auth/components/auth-page-layout";
import { Alert, AlertDescription } from "@/common/components/ui/alert";
import { postLegacyMobileAuthToken } from "@/common/providers/react-native-bridge-provider/legacy-auth-bridge";
import type { Token } from "@/common/types/token";

export default function LoginPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth/login/" });
  const { t } = useTranslations();
  const client = useApolloClient();
  const { signUpOpen } = useDeploymentInfo();
  const [recoveryEmail, setRecoveryEmail] = useState<string>();
  const recovering = Boolean(search.recovery) || recoveryEmail !== undefined;
  const safeNext = getSafeRedirectPath(search.next);

  const onSuccess = async (token: Token) => {
    postLegacyMobileAuthToken(token.accessToken, "password");
    // An explicit `?next=` states the visitor's intent (e.g. the marketing
    // /pricing page mid-checkout, or requireAuth's original destination) and
    // outranks the default-ledger convenience jump. It may target a
    // cross-app page this router has no route for, so navigate the document.
    if (safeNext) {
      hardNavigate(safeNext);
      return;
    }
    const defaultLedger = await getUserDefaultLedger(client);
    if (defaultLedger) {
      const { ledgerOwner, ledgerName } = decodeLedgerId(defaultLedger.id);
      void navigate({ to: `/ledger/${ledgerOwner}/${ledgerName}` });
    } else {
      void navigate({ to: "/auth/welcome" });
    }
  };
  const { onSubmit, isLoading, serverError, isRateLimited } = useLoginForm({
    onSuccess,
  });

  return (
    <>
      <PageSEO
        titleKey="seo.login.title"
        descriptionKey="seo.login.description"
        noIndex={Boolean(search.recovery)}
      />
      {search.recovery ? <meta name="referrer" content="no-referrer" /> : null}
      <AuthPageLayout>
        <div className="space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">
              {t(recovering ? "auth.recoveryTitle" : "auth.welcomeBack")}
            </h1>
            <p className="text-muted-foreground">
              {t(
                recovering
                  ? "auth.recoveryDescription"
                  : "auth.signInToAccount",
              )}
            </p>
          </div>
          {search.reason === "expired" && (
            <Alert>
              <AlertDescription>
                {t("auth.loginSessionExpiredMessage")}
              </AlertDescription>
            </Alert>
          )}
          {recovering ? (
            <SignInRecovery
              key={search.recovery ?? "request"}
              challengeId={search.recovery}
              initialEmail={recoveryEmail}
              returnTo={safeNext}
              onSuccess={onSuccess}
              onBack={() => {
                setRecoveryEmail(undefined);
                if (search.recovery)
                  void navigate({
                    to: "/auth/login",
                    search: { next: safeNext, reason: search.reason },
                    replace: true,
                  });
              }}
            />
          ) : (
            <LoginForm
              onSubmit={onSubmit}
              isLoading={isLoading}
              serverError={serverError}
              onRecoveryClick={isRateLimited ? setRecoveryEmail : undefined}
              showSignUpLink={signUpOpen}
            />
          )}
        </div>
      </AuthPageLayout>
    </>
  );
}
