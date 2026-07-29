import {
  ShieldCheck,
  Zap,
  Lock,
  ArrowRight,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { useTranslations } from "@/common/hooks/use-translations";
import { usePlaidConnection } from "../hooks/use-plaid-connection";

function BenefitCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card className="relative overflow-hidden transition-all hover:shadow-md">
      <CardHeader>
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
          {icon}
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-base leading-relaxed">
          {description}
        </CardDescription>
      </CardContent>
    </Card>
  );
}

function GetStartedButton({ ledgerId }: { ledgerId: string }) {
  const { t } = useTranslations();
  const { connect, isLoading, isSuccess, loadingMessage } = usePlaidConnection({
    ledgerId,
  });

  return (
    <Button
      onClick={connect}
      disabled={isLoading || isSuccess}
      variant={isSuccess ? "default" : "default"}
      size="lg"
      className="w-full lg:w-auto"
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {loadingMessage}
        </>
      ) : isSuccess ? (
        <>{t("plaid.connectedSuccessfully")}</>
      ) : (
        <>
          <span className="mr-2">{t("plaid.onboarding.getStarted")}</span>
          <ArrowRight className="h-4 w-4" />
        </>
      )}
    </Button>
  );
}

export function PlaidOnboardingState({ ledgerId }: { ledgerId: string }) {
  const { t } = useTranslations();

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          {t("plaid.onboarding.title")}
        </h1>
        <p className="text-lg text-muted-foreground">
          {t("plaid.onboarding.subtitle")}
        </p>
      </div>

      {/* Hero Section */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
        <CardContent className="p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-4 lg:max-w-2xl">
              <h2 className="text-2xl font-semibold">
                {t("plaid.onboarding.hero.title")}
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                {t("plaid.onboarding.hero.description")}
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>{t("plaid.onboarding.hero.institutionsCount")}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>{t("plaid.onboarding.hero.bankLevelSecurity")}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>{t("plaid.onboarding.hero.realTimeSync")}</span>
                </div>
              </div>
            </div>
            <div className="shrink-0">
              <GetStartedButton ledgerId={ledgerId} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Benefits Grid */}
      <div>
        <h2 className="mb-6 text-xl font-semibold">
          {t("plaid.onboarding.benefits.title")}
        </h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <BenefitCard
            icon={<Zap className="h-6 w-6 text-primary" />}
            title={t("plaid.onboarding.benefits.automaticImport.title")}
            description={t(
              "plaid.onboarding.benefits.automaticImport.description",
            )}
          />
          <BenefitCard
            icon={<ShieldCheck className="h-6 w-6 text-primary" />}
            title={t("plaid.onboarding.benefits.bankLevelSecurity.title")}
            description={t(
              "plaid.onboarding.benefits.bankLevelSecurity.description",
            )}
          />
          <BenefitCard
            icon={<Lock className="h-6 w-6 text-primary" />}
            title={t("plaid.onboarding.benefits.privacyFirst.title")}
            description={t(
              "plaid.onboarding.benefits.privacyFirst.description",
            )}
          />
        </div>
      </div>

      {/* How It Works Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            {t("plaid.onboarding.howItWorks.title")}
          </CardTitle>
          <CardDescription>
            {t("plaid.onboarding.howItWorks.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                1
              </div>
              <div>
                <h3 className="font-semibold">
                  {t("plaid.onboarding.howItWorks.step1.title")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("plaid.onboarding.howItWorks.step1.description")}
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                2
              </div>
              <div>
                <h3 className="font-semibold">
                  {t("plaid.onboarding.howItWorks.step2.title")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("plaid.onboarding.howItWorks.step2.description")}
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                3
              </div>
              <div>
                <h3 className="font-semibold">
                  {t("plaid.onboarding.howItWorks.step3.title")}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t("plaid.onboarding.howItWorks.step3.description")}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
