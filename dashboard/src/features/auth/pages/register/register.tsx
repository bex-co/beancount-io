import { Lock, BarChart3, Heart } from "lucide-react";
import { PageSEO } from "@/common/components/seo/page-seo";
import { useTranslations } from "@/common/hooks/use-translations";
import { useNavigate } from "@tanstack/react-router";
import { useDashboardOAuthRegister } from "@/features/auth/hooks/use-dashboard-oauth-auth";
import { RegisterForm } from "@/features/auth/components/register-form";
import { Alert, AlertDescription } from "@/common/components/ui/alert";

type RegisterPageProps = {
  interactionUid: string;
  next?: string;
  withDefaultLedger?: boolean;
  interactionExpired?: boolean;
  onSuccess: (sessionId: string, email: string) => void;
};

export default function RegisterPage({
  interactionUid,
  next,
  withDefaultLedger = false,
  interactionExpired = false,
  onSuccess,
}: RegisterPageProps) {
  const { t } = useTranslations();
  const navigate = useNavigate();

  const { onSubmit, isLoading, serverError, defaultUsername } =
    useDashboardOAuthRegister({
      uid: interactionUid,
      next,
      withDefaultLedger,
      onSuccess,
    });

  const features = [
    {
      icon: Lock,
      title: t("auth.secureAccess"),
      description: t("auth.secureAccessDescription"),
      iconColor: "text-chart-1",
      iconBg: "bg-chart-1/10",
    },
    {
      icon: BarChart3,
      title: t("auth.realTimeInsights"),
      description: t("auth.realTimeInsightsDescription"),
      iconColor: "text-chart-2",
      iconBg: "bg-chart-2/10",
    },
    {
      icon: Heart,
      title: t("auth.lovedByUsers"),
      description: t("auth.lovedByUsersDescription"),
      iconColor: "text-chart-4",
      iconBg: "bg-chart-4/10",
    },
  ];

  return (
    <>
      <PageSEO
        titleKey="seo.signUp.title"
        descriptionKey="seo.signUp.description"
      />
      <div className="min-h-screen flex bg-background">
        <div className="flex-1 flex items-center justify-center py-12 px-6 lg:px-8">
          <div className="w-full max-w-md space-y-8">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-foreground">
                {t("auth.createYourAccount")}
              </h1>
              <p className="text-muted-foreground">
                {t("auth.enterDetailsToGetStarted")}
              </p>
            </div>
            {interactionExpired && (
              <Alert>
                <AlertDescription>
                  {t("auth.sessionExpiredMessage")}
                </AlertDescription>
              </Alert>
            )}
            <RegisterForm
              onSubmit={onSubmit}
              isLoading={isLoading}
              serverError={serverError}
              defaultUsername={defaultUsername}
              onSignInClick={() =>
                void navigate({
                  to: "/auth/login",
                  search: {
                    interaction: interactionUid,
                    next,
                    reason: interactionExpired
                      ? "interaction_expired"
                      : undefined,
                  },
                })
              }
            />
          </div>
        </div>

        <div className="hidden lg:flex flex-1 items-center justify-center bg-muted/30 py-12 px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-md space-y-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="space-y-4">
                  <div
                    className={`w-16 h-16 rounded-full ${feature.iconBg} flex items-center justify-center`}
                  >
                    <Icon className={`w-8 h-8 ${feature.iconColor}`} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-foreground">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
