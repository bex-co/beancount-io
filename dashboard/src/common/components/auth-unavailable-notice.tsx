import { useRouter } from "@tanstack/react-router";
import { usePendingAction } from "@/common/hooks/use-pending-action";
import { useTranslations } from "@/common/hooks/use-translations";
import { ReportErrorState } from "./state-components";

export function AuthUnavailableNotice() {
  const { t } = useTranslations();
  const router = useRouter();
  const { pending, run } = usePendingAction();

  return (
    <ReportErrorState
      title={t("common.errorTitle")}
      message={t("common.errors.serviceUnavailable")}
      onRetry={() => void run(() => router.invalidate().catch(() => undefined))}
      retrying={pending}
    />
  );
}
