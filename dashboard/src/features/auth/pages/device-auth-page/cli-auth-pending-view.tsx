import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import { Terminal } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import {
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Alert, AlertDescription } from "@/common/components/ui/alert";
import {
  ConfirmCliAuthSessionDocument,
  DenyCliAuthSessionDocument,
  type GetCliAuthRequestQuery,
} from "@/graphql/definitions";
import { DeviceAuthCard } from "./device-auth-card";
import { useErrorMessage } from "@/common/lib/errors/error-message";
import { useTranslations } from "@/common/hooks/use-translations";

type CliAuthClient = GetCliAuthRequestQuery["getCliAuthRequest"]["client"];

interface CliAuthPendingViewProps {
  userCode: string;
  client: CliAuthClient;
  onAuthorized: () => void;
  onDenied: () => void;
}

/**
 * The consent screen.
 *
 * It names the device that is asking, because "a CLI wants access" is a prompt
 * nobody can refuse intelligently — the whole question is whether *this* is the
 * terminal you just typed a command into. The details are what the requester
 * reported about itself, so the screen says so rather than presenting them as
 * verified facts.
 */
export function CliAuthPendingView({
  userCode,
  client,
  onAuthorized,
  onDenied,
}: CliAuthPendingViewProps) {
  const { t } = useTranslations();
  const formatError = useErrorMessage();
  const [error, setError] = useState("");

  const [confirmSession, { loading: confirming }] = useMutation(
    ConfirmCliAuthSessionDocument,
  );
  const [denySession, { loading: denying }] = useMutation(
    DenyCliAuthSessionDocument,
  );

  const handleAuthorize = async () => {
    try {
      setError("");
      await confirmSession({ variables: { userCode } });
      onAuthorized();
    } catch (err: unknown) {
      setError(formatError(err));
    }
  };

  const handleDeny = async () => {
    try {
      setError("");
      await denySession({ variables: { userCode } });
      onDenied();
    } catch (err: unknown) {
      setError(formatError(err));
    }
  };

  const details: Array<[string, string | null]> = [
    [t("auth.cliAuthClientLabel"), clientLabel(client)],
    [t("auth.cliAuthDeviceLabel"), client.deviceLabel],
    [t("auth.cliAuthPlatformLabel"), client.platform],
    [t("auth.cliAuthIpLabel"), client.ipAddress],
  ];

  return (
    <DeviceAuthCard>
      <CardHeader className="text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Terminal className="w-8 h-8 text-primary" />
        </div>
        <div>
          <CardTitle className="text-xl">{t("auth.cliAuthTitle")}</CardTitle>
          <CardDescription className="mt-2">
            {t("auth.cliAuthDescription")}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
          <p className="text-sm font-medium">{t("auth.cliAuthRequestedBy")}</p>
          <dl className="text-sm space-y-1">
            {details.map(([label, value]) =>
              value ? (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-mono text-right break-all">{value}</dd>
                </div>
              ) : null,
            )}
          </dl>
          <p className="text-xs text-muted-foreground">
            {t("auth.cliAuthSelfReported")}
          </p>
        </div>
        <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
          <p className="text-sm font-medium">
            {t("auth.cliAuthPermissionsIntro")}
          </p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>{t("auth.cliAuthPermissionLedgers")}</li>
            <li>{t("auth.cliAuthPermissionAccount")}</li>
            <li>{t("auth.cliAuthPermissionExpiry")}</li>
          </ul>
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={handleDeny}
          disabled={confirming || denying}
        >
          {denying ? t("auth.cliAuthDenying") : t("auth.cliAuthDeny")}
        </Button>
        <Button
          className="flex-1"
          onClick={handleAuthorize}
          disabled={confirming || denying}
        >
          {confirming
            ? t("auth.cliAuthAuthorizing")
            : t("auth.cliAuthAuthorize")}
        </Button>
      </CardFooter>
    </DeviceAuthCard>
  );
}

function clientLabel(client: CliAuthClient): string {
  return client.version ? `${client.name} ${client.version}` : client.name;
}
