import type { ReactNode } from "react";
import { BarChart3, Heart, Lock } from "lucide-react";
import { useTranslations } from "@/common/hooks/use-translations";

type AuthPageLayoutProps = {
  children: ReactNode;
};

export function AuthPageLayout({ children }: AuthPageLayoutProps) {
  const { t } = useTranslations();
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
    <div className="min-h-screen flex bg-background">
      <main className="flex-1 flex items-center justify-center py-12 px-6 lg:px-8">
        <div className="w-full max-w-md">{children}</div>
      </main>

      <aside className="hidden lg:flex flex-1 items-center justify-center bg-muted/30 py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="space-y-4">
                <div
                  className={`w-16 h-16 rounded-full ${feature.iconBg} flex items-center justify-center`}
                >
                  <Icon className={`w-8 h-8 ${feature.iconColor}`} />
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold text-foreground">
                    {feature.title}
                  </h2>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
