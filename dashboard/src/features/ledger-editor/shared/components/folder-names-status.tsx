import { Button } from "@/common/components/ui/button";
import { useTranslations } from "@/common/hooks/use-translations";

/**
 * Says that a form's clash check is still waiting on the folder's names, or
 * that reading them failed, with Try Again for that read alone (w4/1036).
 */
export function FolderNamesStatus({
  id,
  checking,
  failure,
  retrying,
  onRetry,
}: {
  id: string;
  /** A write is waiting on the names. */
  checking: boolean;
  failure: unknown;
  retrying: boolean;
  onRetry: () => void;
}) {
  const { t } = useTranslations();
  if (failure) {
    return (
      <div
        id={id}
        role="alert"
        className="flex flex-wrap items-center gap-2 text-sm text-destructive"
      >
        <span>{t("ledgerEditor.folderNamesFailed")}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          loading={retrying}
        >
          {t("common.tryAgain")}
        </Button>
      </div>
    );
  }
  if (!checking) return null;
  return (
    <p id={id} role="status" className="text-sm text-muted-foreground">
      {t("ledgerEditor.folderNamesChecking")}
    </p>
  );
}
