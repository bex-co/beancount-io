import { useState } from "react";
import { useQuery } from "@apollo/client/react";
import { CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { CardContent, CardFooter } from "@/common/components/ui/card";
import {
  CliAuthStatus,
  GetCliAuthRequestDocument,
} from "@/graphql/definitions";
import { useTranslations } from "@/common/hooks/use-translations";
import { getErrorMessageKey } from "@/common/lib/errors/error-message";
import { DeviceAuthCard } from "./device-auth-card";
import { CliAuthCodeEntryView } from "./cli-auth-code-entry-view";
import { CliAuthPendingView } from "./cli-auth-pending-view";

type Outcome = "authorized" | "denied";

/**
 * The browser half of the CLI device-authorization ceremony.
 *
 * Nothing arrives in the URL: the page starts by asking for the code the
 * person's own terminal printed, then shows what that code names before anyone
 * approves it. The value typed here identifies a request and never redeems the
 * credential — that takes the device code, which stays in the CLI.
 */
export default function DeviceAuthPage() {
  const { t } = useTranslations();
  const [userCode, setUserCode] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  if (!userCode) {
    return <CliAuthCodeEntryView onSubmit={setUserCode} />;
  }

  if (outcome) {
    return <OutcomeCard outcome={outcome} />;
  }

  return (
    <CliAuthRequest
      userCode={userCode}
      onOutcome={setOutcome}
      onRestart={() => setUserCode(null)}
      restartLabel={t("auth.cliAuthUseAnotherCode")}
    />
  );
}

function CliAuthRequest({
  userCode,
  onOutcome,
  onRestart,
  restartLabel,
}: {
  userCode: string;
  onOutcome: (outcome: Outcome) => void;
  onRestart: () => void;
  restartLabel: string;
}) {
  const { t } = useTranslations();
  const { data, loading, error } = useQuery(GetCliAuthRequestDocument, {
    variables: { userCode },
    // The code is spent against a per-user attempt budget, so this asks once.
    fetchPolicy: "network-only",
  });

  if (loading) return <DeviceAuthCard loading />;

  if (error) {
    return (
      <DeviceAuthCard error={t(getErrorMessageKey(error))}>
        <RestartFooter onRestart={onRestart} label={restartLabel} />
      </DeviceAuthCard>
    );
  }

  const request = data?.getCliAuthRequest;

  // Anything already decided is shown as spent, not offered for approval again.
  if (!request || request.status !== CliAuthStatus.Pending) {
    return (
      <DeviceAuthCard error={t("auth.cliAuthSessionExpired")}>
        <RestartFooter onRestart={onRestart} label={restartLabel} />
      </DeviceAuthCard>
    );
  }

  return (
    <CliAuthPendingView
      userCode={userCode}
      client={request.client}
      onAuthorized={() => onOutcome("authorized")}
      onDenied={() => onOutcome("denied")}
    />
  );
}

function RestartFooter({
  onRestart,
  label,
}: {
  onRestart: () => void;
  label: string;
}) {
  return (
    <CardFooter>
      <Button variant="outline" className="w-full" onClick={onRestart}>
        {label}
      </Button>
    </CardFooter>
  );
}

function OutcomeCard({ outcome }: { outcome: Outcome }) {
  const { t } = useTranslations();
  const authorized = outcome === "authorized";

  return (
    <DeviceAuthCard>
      <CardContent className="pt-8 pb-8 text-center space-y-4">
        <div
          className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${
            authorized ? "bg-green-500/10" : "bg-muted"
          }`}
        >
          {authorized ? (
            <CheckCircle className="w-8 h-8 text-green-500" />
          ) : (
            <XCircle className="w-8 h-8 text-muted-foreground" />
          )}
        </div>
        <div>
          <p className="text-lg font-semibold">
            {authorized
              ? t("auth.cliAuthSuccessTitle")
              : t("auth.cliAuthDeniedTitle")}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {authorized
              ? t("auth.cliAuthSuccessDescription")
              : t("auth.cliAuthDeniedDescription")}
          </p>
        </div>
      </CardContent>
    </DeviceAuthCard>
  );
}
