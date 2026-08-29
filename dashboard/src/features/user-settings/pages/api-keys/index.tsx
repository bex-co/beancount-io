import { useQuery } from "@apollo/client/react";
import { AlertCircle, KeyRound, Loader2, Plus } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/common/components/ui/alert";
import { Button } from "@/common/components/ui/button";
import { Card, CardContent } from "@/common/components/ui/card";
import { PageSEO } from "@/common/components/seo/page-seo";
import { useTranslations } from "@/common/hooks/use-translations";
import { ApiKeysDocument } from "@/graphql/definitions";
import { ApiKeyCard } from "./api-key-card";
import { ApiKeyCreateDialog } from "./api-key-create-dialog";

export default function ApiKeysSettingsPage() {
  const { t } = useTranslations();
  const { data, loading, error, refetch } = useQuery(ApiKeysDocument, {
    fetchPolicy: "cache-and-network",
    ssr: false,
  });
  const apiKeys = data?.apiKeys ?? [];

  return (
    <>
      <PageSEO titleKey="userSettings.apiKeys" noIndex />
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">
              {t("userSettings.apiKeys")}
            </h1>
            <p className="mt-1 max-w-2xl text-muted-foreground">
              {t("userSettings.apiKeysDescription")}
            </p>
          </div>
          <ApiKeyCreateDialog>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t("userSettings.apiKeyNew")}
            </Button>
          </ApiKeyCreateDialog>
        </div>

        {loading && !data ? (
          <Card>
            <CardContent className="flex items-center justify-center gap-3 py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              {t("userSettings.apiKeysLoading")}
            </CardContent>
          </Card>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("userSettings.apiKeysLoadFailed")}</AlertTitle>
            <AlertDescription className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>{t("userSettings.apiKeysLoadFailedDescription")}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void refetch()}
              >
                {t("userSettings.apiKeysRetry")}
              </Button>
            </AlertDescription>
          </Alert>
        ) : apiKeys.length > 0 ? (
          <div className="space-y-4">
            {apiKeys.map((apiKey) => (
              <ApiKeyCard key={apiKey.id} apiKey={apiKey} />
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <div className="mb-4 rounded-full bg-muted p-4">
                <KeyRound className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-medium">
                {t("userSettings.apiKeysEmpty")}
              </h2>
              <p className="mt-2 max-w-md text-muted-foreground">
                {t("userSettings.apiKeysEmptyDescription")}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
