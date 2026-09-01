import { useNavigate, useSearch } from "@tanstack/react-router";
import { useApolloClient } from "@apollo/client/react";
import { PageSEO } from "@/common/components/seo/page-seo";
import { decodeLedgerId } from "@/common/lib/utils/encode";
import { getUserDefaultLedger } from "@/common/lib/utils/ledger-utils";
import { getSafeRedirectPath } from "@/common/lib/auth/auth";
import { useTranslations } from "@/common/hooks/use-translations";
import { useLoginForm } from "@/features/auth/hooks/use-login-form";
import { LoginForm } from "@/features/auth/components/login-form";
import { AuthPageLayout } from "@/features/auth/components/auth-page-layout";
import { Alert, AlertDescription } from "@/common/components/ui/alert";
import { postLegacyMobileAuthToken } from "@/common/providers/react-native-bridge-provider/legacy-auth-bridge";

export default function LoginPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth/login/" });
  const { t } = useTranslations();
  const client = useApolloClient();

  const { onSubmit, isLoading, serverError } = useLoginForm({
    onSuccess: async (token) => {
      postLegacyMobileAuthToken(token.accessToken, "password");
      const defaultLedger = await getUserDefaultLedger(client);
      if (defaultLedger) {
        const { ledgerOwner, ledgerName } = decodeLedgerId(defaultLedger.id);
        void navigate({ to: `/ledger/${ledgerOwner}/${ledgerName}` });
      } else {
        void navigate({
          to: getSafeRedirectPath(search.next) ?? "/auth/welcome",
        });
      }
    },
  });

  return (
    <>
      <PageSEO
        titleKey="seo.login.title"
        descriptionKey="seo.login.description"
      />
      <AuthPageLayout>
        <div className="space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">
              {t("auth.welcomeBack")}
            </h1>
            <p className="text-muted-foreground">{t("auth.signInToAccount")}</p>
          </div>
          {search.reason === "expired" && (
            <Alert>
              <AlertDescription>
                {t("auth.loginSessionExpiredMessage")}
              </AlertDescription>
            </Alert>
          )}
          <LoginForm
            onSubmit={onSubmit}
            isLoading={isLoading}
            serverError={serverError}
          />
        </div>
      </AuthPageLayout>
    </>
  );
}
