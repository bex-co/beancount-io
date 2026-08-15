import { useSearch } from "@tanstack/react-router";
import { useQuery } from "@apollo/client/react";
import { CheckCircle, XCircle } from "lucide-react";
import { CardContent } from "@/common/components/ui/card";
import {
  CliAuthStatus,
  GetCliAuthSessionDocument,
} from "@/graphql/definitions";
import { useTranslations } from "@/common/hooks/use-translations";
import { getErrorMessageKey } from "@/common/lib/errors/error-message";
import { DeviceAuthCard } from "./device-auth-card";
import { CliAuthPendingView } from "./cli-auth-pending-view";

export default function DeviceAuthPage() {
  const { t } = useTranslations();
  const search = useSearch({ from: "/auth/login/device" });
  const { data, loading, error, refetch } = useQuery(
    GetCliAuthSessionDocument,
    {
      variables: { sessionId: search.session_id },
    },
  );

  if (loading) return <DeviceAuthCard loading />;
  if (error) return <DeviceAuthCard error={t(getErrorMessageKey(error))} />;

  const status = data?.getCliAuthSession?.status;

  if (status === CliAuthStatus.Expired) {
    return <DeviceAuthCard error={t("auth.cliAuthSessionExpired")} />;
  }

  if (
    status === CliAuthStatus.Authorized ||
    status === CliAuthStatus.Consumed
  ) {
    return (
      <DeviceAuthCard>
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <div>
            <p className="text-lg font-semibold">
              {t("auth.cliAuthSuccessTitle")}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {t("auth.cliAuthSuccessDescription")}
            </p>
          </div>
        </CardContent>
      </DeviceAuthCard>
    );
  }

  if (status === CliAuthStatus.Denied) {
    return (
      <DeviceAuthCard>
        <CardContent className="pt-8 pb-8 text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <XCircle className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <p className="text-lg font-semibold">
              {t("auth.cliAuthDeniedTitle")}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {t("auth.cliAuthDeniedDescription")}
            </p>
          </div>
        </CardContent>
      </DeviceAuthCard>
    );
  }

  return (
    <CliAuthPendingView sessionId={search.session_id} onComplete={refetch} />
  );
}
