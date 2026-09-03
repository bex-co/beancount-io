import { useNavigate } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { Alert, AlertDescription } from "@/common/components/ui/alert";
import { PageSEO } from "@/common/components/seo/page-seo";
import { useTranslations } from "@/common/hooks/use-translations";
import { useOtpForm } from "@/features/auth/hooks/use-otp-form";
import { OtpForm } from "@/features/auth/components/otp-form";
import { getSafeRedirectPath } from "@/common/lib/auth/auth";
import { hardNavigate } from "@/common/lib/navigation/hard-navigate";
import { postLegacyMobileAuthToken } from "@/common/providers/react-native-bridge-provider/legacy-auth-bridge";

type SignUpOtpPageProps = {
  sessionId: string;
  email: string;
  /** Post-signup destination from `?next=`; validated before use. */
  next?: string;
  onSuccess?: () => void;
  onBack?: () => void;
};

export default function SignUpOtpPage({
  sessionId,
  email,
  next,
  onSuccess,
  onBack,
}: SignUpOtpPageProps) {
  const { t } = useTranslations();
  const navigate = useNavigate();

  const { onSubmit, isLoading, serverError } = useOtpForm({
    sessionId,
    onSuccess: async (token) => {
      postLegacyMobileAuthToken(token.accessToken, "otp");
      onSuccess?.();
      const safeNext = getSafeRedirectPath(next);
      if (safeNext) {
        // `next` may target a cross-app page (the marketing site's /pricing),
        // which this router has no route for — a hard navigation is required.
        hardNavigate(safeNext);
        return;
      }
      void navigate({ to: "/auth/welcome" });
    },
  });

  if (!sessionId) {
    return (
      <>
        <PageSEO
          titleKey="seo.signUpOtp.title"
          descriptionKey="seo.signUpOtp.description"
          noIndex
        />
        <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-md">
            <Card>
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold text-center">
                  {t("auth.sessionExpired")}
                </CardTitle>
                <CardDescription className="text-center">
                  {t("auth.sessionExpiredDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert variant="destructive">
                  <AlertDescription>
                    {t("auth.sessionExpiredMessage")}
                  </AlertDescription>
                </Alert>
                <div className="mt-4 text-center">
                  {onBack ? (
                    <Button
                      variant="link"
                      onClick={onBack}
                      className="text-sm font-medium text-muted-foreground hover:text-primary/80"
                    >
                      {t("auth.backToSignUp")}
                    </Button>
                  ) : (
                    <Button
                      variant="link"
                      onClick={() => navigate({ to: "/auth/sign-up" })}
                      className="text-sm font-medium text-muted-foreground hover:text-primary/80"
                    >
                      {t("auth.backToSignUp")}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageSEO
        titleKey="seo.signUpOtp.title"
        descriptionKey="seo.signUpOtp.description"
        noIndex
      />
      <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <Card>
            <CardContent className="pt-6">
              <OtpForm
                email={email}
                onSubmit={onSubmit}
                isLoading={isLoading}
                serverError={serverError}
                onBack={onBack ?? (() => navigate({ to: "/auth/sign-up" }))}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
