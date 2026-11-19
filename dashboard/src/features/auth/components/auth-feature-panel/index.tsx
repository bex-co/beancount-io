import { BarChart3, FileText, Heart, Lock, Server } from "lucide-react";
import type en from "@/i18n/locales/en";
import { useTranslations } from "@/common/hooks/use-translations";
import { useDeploymentInfo } from "@/common/hooks/use-deployment-info";

type TranslationKey = keyof typeof en;

type Feature = {
  icon: typeof Lock;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  iconColor: string;
  iconBg: string;
};

const INSIGHTS: Feature = {
  icon: BarChart3,
  titleKey: "auth.realTimeInsights",
  descriptionKey: "auth.realTimeInsightsDescription",
  iconColor: "text-chart-2",
  iconBg: "bg-chart-2/10",
};

// The hosted service's own claims: how Beancount.io guards its servers, and
// how many people use it.
const MANAGED_FEATURES: Feature[] = [
  {
    icon: Lock,
    titleKey: "auth.secureAccess",
    descriptionKey: "auth.secureAccessDescription",
    iconColor: "text-chart-1",
    iconBg: "bg-chart-1/10",
  },
  INSIGHTS,
  {
    icon: Heart,
    titleKey: "auth.lovedByUsers",
    descriptionKey: "auth.lovedByUsersDescription",
    iconColor: "text-chart-4",
    iconBg: "bg-chart-4/10",
  },
];

// A self-hosted copy is not Beancount.io's to vouch for, so it says what holds
// on every one: who runs it, and that the books are plain text in Git.
const SELF_HOST_FEATURES: Feature[] = [
  {
    icon: Server,
    titleKey: "auth.selfHosted",
    descriptionKey: "auth.selfHostedDescription",
    iconColor: "text-chart-1",
    iconBg: "bg-chart-1/10",
  },
  INSIGHTS,
  {
    icon: FileText,
    titleKey: "auth.plainTextBooks",
    descriptionKey: "auth.plainTextBooksDescription",
    iconColor: "text-chart-4",
    iconBg: "bg-chart-4/10",
  },
];

/** The complementary column beside the sign-in, sign-up and consent forms. */
export function AuthFeaturePanel() {
  const { t } = useTranslations();
  const { selfHost } = useDeploymentInfo();
  const features = selfHost ? SELF_HOST_FEATURES : MANAGED_FEATURES;

  return (
    <aside className="hidden lg:flex flex-1 items-center justify-center bg-muted/30 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <div key={feature.titleKey} className="space-y-4">
              <div
                className={`w-16 h-16 rounded-full ${feature.iconBg} flex items-center justify-center`}
              >
                <Icon className={`w-8 h-8 ${feature.iconColor}`} />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-foreground">
                  {t(feature.titleKey)}
                </h2>
                <p className="text-muted-foreground">
                  {t(feature.descriptionKey)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
