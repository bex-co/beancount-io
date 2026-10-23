import { useQuery } from "@apollo/client/react";
import { Button } from "@/common/components/ui/button";
import { User, Palette, CreditCard, Clock, AlertCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Skeleton } from "@/common/components/ui/skeleton";
import {
  GetCurrentUserDocument,
  type GetCurrentUserQuery,
} from "@/graphql/definitions";
import { UserProfileSection } from "./user-profile-section";
import { AppearanceSection } from "./appearance-section";
import { BillingSummaryLink } from "./billing-summary-link";
import { SessionSection } from "./session-section";
import { useQueryRetry } from "@/common/hooks/use-query-retry";
import { useTranslations } from "@/common/hooks/use-translations";
import { getErrorMessageKey } from "@/common/lib/errors/error-message";
import { useReactNativeContext } from "@/common/providers/react-native-bridge-provider/react-native-bridge-context";
import { PageSEO } from "@/common/components/seo/page-seo";

/**
 * Loading state component
 * Displays skeleton loaders while fetching user data
 */
function GeneralSettingsSkeleton() {
  const { t } = useTranslations();
  const { isReactNative } = useReactNativeContext();
  return (
    <div className="space-y-6">
      {/* User Profile Skeleton */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            <h2>{t("userSettings.userProfile")}</h2>
          </CardTitle>
          <CardDescription>
            {t("userSettings.loadingAccountInformation")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appearance Skeleton */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            <h2>{t("userSettings.appearance")}</h2>
          </CardTitle>
          <CardDescription>
            {t("userSettings.loadingThemePreferences")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>

      {/* Subscription Skeleton - Hidden in React Native */}
      {!isReactNative && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              <h2>{t("userSettings.subscription")}</h2>
            </CardTitle>
            <CardDescription>
              {t("userSettings.loadingSubscriptionDetails")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      )}

      {/* Session Skeleton */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <h2>{t("userSettings.session")}</h2>
          </CardTitle>
          <CardDescription>
            {t("userSettings.loadingSessionInformation")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Error state component
 * Displays error message when failed to load user data
 */
function GeneralSettingsError({
  error,
  retrying,
  onRetry,
}: {
  error: unknown;
  retrying: boolean;
  onRetry: () => void;
}) {
  const { t } = useTranslations();
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            <h2>{t("common.settings")}</h2>
          </CardTitle>
          <CardDescription>
            {t("userSettings.errorLoadingSettings")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                {t("userSettings.failedToLoadSettings")}
              </h3>
              <p className="text-muted-foreground">
                {error ? t(getErrorMessageKey(error)) : null}
              </p>
              {/* Re-run this page's own read in place (w4/257). */}
              <Button
                type="button"
                variant="outline"
                className="mt-4"
                onClick={onRetry}
                disabled={retrying}
                loading={retrying}
              >
                {t("common.tryAgain")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * General settings page component
 * Manage user profile, theme and language preferences, subscriptions, and security
 */
export default function GeneralSettingsPage() {
  const { t } = useTranslations();
  const { data, loading, error, refetch } = useQuery<GetCurrentUserQuery>(
    GetCurrentUserDocument,
    {
      fetchPolicy: "cache-and-network", // Fetch fresh data but show stale while fetching
      ssr: false, // Don't run during SSR (user-specific data)
    },
  );
  const { isReactNative } = useReactNativeContext();
  const { failure, retrying, retry } = useQueryRetry(error, refetch);

  return (
    <>
      <PageSEO
        titleKey="seo.settingsGeneral.title"
        descriptionKey="seo.settingsGeneral.description"
        noIndex
      />
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">{t("userSettings.general")}</h1>
        {failure ? (
          <GeneralSettingsError
            error={failure}
            retrying={retrying}
            onRetry={retry}
          />
        ) : loading ? (
          <GeneralSettingsSkeleton />
        ) : (
          <div className="space-y-4">
            {!isReactNative && <BillingSummaryLink />}
            <UserProfileSection userData={data} />
            <AppearanceSection />
            <SessionSection />
          </div>
        )}
      </div>
    </>
  );
}
