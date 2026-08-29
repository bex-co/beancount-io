import { Badge } from "@/common/components/ui/badge";
import { Card, CardContent } from "@/common/components/ui/card";
import { useTranslations } from "@/common/hooks/use-translations";
import { formatDateTime } from "@/common/lib/format";
import { ApiKeyRevokeDialog } from "./api-key-revoke-dialog";
import {
  getApiKeyStatus,
  type ApiKeyListItem,
  type ApiKeyStatus,
} from "./api-key-utils";

interface ApiKeyCardProps {
  apiKey: ApiKeyListItem;
}

const statusPresentation: Record<
  ApiKeyStatus,
  {
    variant: "default" | "secondary" | "destructive";
    labelKey:
      | "userSettings.apiKeyActive"
      | "userSettings.apiKeyExpired"
      | "userSettings.apiKeyRevoked";
  }
> = {
  active: { variant: "default", labelKey: "userSettings.apiKeyActive" },
  expired: { variant: "secondary", labelKey: "userSettings.apiKeyExpired" },
  revoked: { variant: "destructive", labelKey: "userSettings.apiKeyRevoked" },
};

export function ApiKeyCard({ apiKey }: ApiKeyCardProps) {
  const { t } = useTranslations();
  const status = getApiKeyStatus(apiKey);
  const presentation = statusPresentation[status];

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold">{apiKey.name}</h3>
              <Badge variant={presentation.variant}>
                {t(presentation.labelKey)}
              </Badge>
              <code className="rounded bg-muted px-2 py-0.5 text-xs">
                {apiKey.keyPrefix}…
              </code>
            </div>
            <div className="flex flex-wrap gap-2">
              {apiKey.scopes.map((scope) => (
                <Badge key={scope} variant="outline" className="font-mono">
                  {scope}
                </Badge>
              ))}
            </div>
            <dl className="grid gap-x-6 gap-y-2 text-sm text-muted-foreground sm:grid-cols-2">
              <div>
                <dt className="inline font-medium text-foreground">
                  {t("userSettings.apiKeyLedger")}:{" "}
                </dt>
                <dd className="inline font-mono">
                  {apiKey.ledgerScope ?? t("userSettings.apiKeyAllLedgers")}
                </dd>
              </div>
              <div>
                <dt className="inline font-medium text-foreground">
                  {t("userSettings.apiKeyCreatedAt")}:{" "}
                </dt>
                <dd className="inline">{formatDateTime(apiKey.createdAt)}</dd>
              </div>
              <div>
                <dt className="inline font-medium text-foreground">
                  {t("userSettings.apiKeyLastUsed")}:{" "}
                </dt>
                <dd className="inline">
                  {formatDateTime(apiKey.lastUsedAt) ??
                    t("userSettings.neverUsed")}
                </dd>
              </div>
              <div>
                <dt className="inline font-medium text-foreground">
                  {t("userSettings.apiKeyExpiresAt")}:{" "}
                </dt>
                <dd className="inline">
                  {formatDateTime(apiKey.expiresAt) ??
                    t("userSettings.apiKeyNoExpiration")}
                </dd>
              </div>
            </dl>
          </div>
          {status === "active" ? <ApiKeyRevokeDialog apiKey={apiKey} /> : null}
        </div>
      </CardContent>
    </Card>
  );
}
