import { useNavigate, useSearch } from "@tanstack/react-router";
import { PageSEO } from "@/common/components/seo/page-seo";
import { useTranslations } from "@/common/hooks/use-translations";
import { useDashboardOAuthLogin } from "@/features/auth/hooks/use-dashboard-oauth-auth";
import { LoginForm } from "@/features/auth/components/login-form";
import { AuthPageLayout } from "@/features/auth/components/auth-page-layout";
import { Alert, AlertDescription } from "@/common/components/ui/alert";

export default function LoginPage() {
  const search = useSearch({ from: "/auth/login/" });
  const { t } = useTranslations();
  const navigate = useNavigate();

  const { onSubmit, isLoading, serverError } = useDashboardOAuthLogin(
    search.interaction ?? "",
    search.next,
  );

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
          {(search.reason === "expired" ||
            search.reason === "interaction_expired") && (
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
            onRegisterClick={() =>
              void navigate({
                to: "/auth/sign-up",
                search: {
                  interaction: search.interaction ?? "",
                  next: search.next,
                  reason:
                    search.reason === "interaction_expired"
                      ? search.reason
                      : undefined,
                },
              })
            }
          />
        </div>
      </AuthPageLayout>
    </>
  );
}
