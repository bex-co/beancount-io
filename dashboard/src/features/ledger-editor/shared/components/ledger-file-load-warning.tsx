import { TriangleAlert } from "lucide-react";
import { Alert, AlertDescription } from "@/common/components/ui/alert";
import { useTranslations } from "@/common/hooks/use-translations";

export function LedgerFileLoadWarning({
  paths,
  failedIncludePath,
}: {
  paths: readonly string[];
  failedIncludePath?: string;
}) {
  const { t } = useTranslations();
  if (paths.length === 0 && !failedIncludePath) return null;

  return (
    <Alert className="min-w-0 border-amber-600/40">
      <TriangleAlert />
      <AlertDescription className="min-w-0 wrap-anywhere">
        {failedIncludePath && (
          <p>
            {t("ledgerEditor.addIncludeFailed", {
              path: failedIncludePath,
              main: "main.bean",
            })}
          </p>
        )}
        {[...new Set(paths)].map((path) => (
          <p key={path}>{t("ledgerEditor.fileNotLoaded", { path })}</p>
        ))}
      </AlertDescription>
    </Alert>
  );
}
