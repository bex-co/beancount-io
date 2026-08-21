import { useEffect } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Home, ArrowLeft, AlertTriangle } from "lucide-react";
import { Button } from "@/common/components/ui/button.tsx";
import { useTranslations } from "@/common/hooks/use-translations.ts";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { PageSEO } from "@/common/components/seo/page-seo";
import { isUnauthenticatedError } from "@/common/apollo/links/auth-error-link";

/**
 * Global error page component
 * Displays a user-friendly error page when route validation or other errors occur
 *
 * This is also the single place that catches UNAUTHENTICATED errors thrown by
 * a route `loader` (e.g. `context.client.query(...) → throw`) before any page
 * component mounts — most commonly a hard page load/reload with an
 * expired/revoked token. Every route without its own `errorComponent` falls
 * back to this one, so redirecting to login here covers the whole app
 * instead of requiring each loader to handle auth errors itself.
 */
export default function ErrorPage({ error, reset }: ErrorComponentProps) {
  const { t } = useTranslations();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const unauthenticated = isUnauthenticatedError(error);

  useEffect(() => {
    if (!unauthenticated) return;
    void navigate({
      to: "/auth/login",
      search: { next: pathname, reason: "expired" },
    });
  }, [unauthenticated, pathname, navigate]);

  const handleGoBack = () => {
    window.history.back();
  };

  // Extract a user-friendly error message
  const errorMessage = error?.message || t("common.errorOccurred");

  // Check if it's a validation error (common for search params)
  const isValidationError =
    errorMessage.includes("validation") ||
    errorMessage.includes("invalid") ||
    errorMessage.includes("parse") ||
    error?.constructor?.name === "ZodError";

  return (
    <>
      <PageSEO
        titleKey="seo.error.title"
        descriptionKey="seo.error.description"
        noIndex
      />
      <div className="min-h-screen flex items-center justify-center bg-background px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-2xl text-center space-y-8">
          {/* Icon Section */}
          <div className="flex justify-center">
            <div className="rounded-full bg-destructive/10 p-6">
              <AlertTriangle className="h-16 w-16 text-destructive" />
            </div>
          </div>

          {/* Content Section */}
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
              {unauthenticated
                ? t("common.sessionExpiredTitle")
                : isValidationError
                  ? t("common.invalidParameters")
                  : t("common.errorTitle")}
            </h1>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              {unauthenticated
                ? t("common.sessionExpiredDescription")
                : isValidationError
                  ? t("common.invalidParametersDescription")
                  : t("common.errorDescription")}
            </p>
          </div>
          <div className="hidden">{error.message}</div>

          {/* Action Buttons */}
          {!unauthenticated && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button
                asChild
                variant="default"
                size="lg"
                className="min-w-[140px]"
              >
                <Link to="/">
                  <Home className="mr-2 h-4 w-4" />
                  {t("common.goHome")}
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={handleGoBack}
                className="min-w-[140px]"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("common.goBack")}
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={reset}
                className="min-w-[140px]"
              >
                {t("common.tryAgain")}
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
