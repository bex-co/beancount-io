import { PageSEO } from "@/common/components/seo/page-seo";
import { useTranslations } from "@/common/hooks/use-translations";
import { useRegisterForm } from "@/features/auth/hooks/use-register-form";
import { RegisterForm } from "@/features/auth/components/register-form";
import { AuthFeaturePanel } from "@/features/auth/components/auth-feature-panel";
import { useDeploymentInfo } from "@/common/hooks/use-deployment-info";

type RegisterPageProps = {
  withDefaultLedger?: boolean;
  inviteSrc?: string;
  inviteBy?: string;
  onSuccess: (sessionId: string, email: string) => void;
  onSignedIn: (accessToken: string) => void | Promise<void>;
};

export default function RegisterPage({
  withDefaultLedger = false,
  inviteSrc,
  inviteBy,
  onSuccess,
  onSignedIn,
}: RegisterPageProps) {
  const { t } = useTranslations();
  const { selfHost } = useDeploymentInfo();

  const { onSubmit, isLoading, serverError, defaultUsername } = useRegisterForm(
    { withDefaultLedger, inviteSrc, inviteBy, onSuccess, onSignedIn },
  );

  return (
    <>
      <PageSEO
        titleKey="seo.signUp.title"
        descriptionKey="seo.signUp.description"
      />
      <div className="min-h-screen flex bg-background">
        <main className="flex-1 flex items-center justify-center py-12 px-6 lg:px-8">
          <div className="w-full max-w-md space-y-8">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-foreground">
                {t("auth.createYourAccount")}
              </h1>
              <p className="text-muted-foreground">
                {t("auth.enterDetailsToGetStarted")}
              </p>
            </div>
            <RegisterForm
              onSubmit={onSubmit}
              isLoading={isLoading}
              serverError={serverError}
              defaultUsername={defaultUsername}
              showLegalLinks={!selfHost}
            />
          </div>
        </main>

        <AuthFeaturePanel />
      </div>
    </>
  );
}
