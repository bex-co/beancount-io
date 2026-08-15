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
} from "@/graphql/definitions";
import { DeviceAuthCard } from "./device-auth-card";
import { useErrorMessage } from "@/common/lib/errors/error-message";
import { useTranslations } from "@/common/hooks/use-translations";

interface CliAuthPendingViewProps {
  sessionId: string;
  onComplete: () => void;
}

export function CliAuthPendingView({
  sessionId,
  onComplete,
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
      await confirmSession({ variables: { sessionId } });
      onComplete();
    } catch (err: unknown) {
      setError(formatError(err));
    }
  };

  const handleDeny = async () => {
    try {
      setError("");
      await denySession({ variables: { sessionId } });
      onComplete();
    } catch (err: unknown) {
      setError(formatError(err));
    }
  };

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
          <p className="text-sm font-medium">
            {t("auth.cliAuthPermissionsIntro")}
          </p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>{t("auth.cliAuthPermissionLedgers")}</li>
            <li>{t("auth.cliAuthPermissionAccount")}</li>
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
