import { useNavigate, useSearch } from "@tanstack/react-router";
import { useApolloClient } from "@apollo/client/react";
import { Lock, BarChart3, Heart } from "lucide-react";
import { PageSEO } from "@/common/components/seo/page-seo";
import { decodeLedgerId } from "@/common/lib/utils/encode";
import { getUserDefaultLedger } from "@/common/lib/utils/ledger-utils";
import { getSafeRedirectPath } from "@/common/lib/auth/auth";
import { useTranslations } from "@/common/hooks/use-translations";
import { useLoginForm } from "@/features/auth/hooks/use-login-form";
import { LoginForm } from "@/features/auth/components/login-form";
import { Alert, AlertDescription } from "@/common/components/ui/alert";

export default function LoginPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth/login/" });
  const { t } = useTranslations();
  const client = useApolloClient();

  const { onSubmit, isLoading, serverError } = useLoginForm({
    onSuccess: async (token) => {
      if (typeof window !== "undefined") {
        window.postMessage(
          JSON.stringify({ authToken: token.accessToken }),
          "*",
        );
      }
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
        titleKey="seo.login.title"
        descriptionKey="seo.login.description"
      />
      <div className="min-h-screen flex bg-background">
        <div className="flex-1 flex items-center justify-center py-12 px-6 lg:px-8">
          <div className="w-full max-w-md space-y-8">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-foreground">
                {t("auth.welcomeBack")}
              </h1>
              <p className="text-muted-foreground">
                {t("auth.signInToAccount")}
              </p>
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
