import { CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Card } from "@/common/components/ui/card";
import { Alert, AlertDescription } from "@/common/components/ui/alert";
import { useTranslations } from "@/common/hooks/use-translations";
import type { ImportResult } from "../../../types";

type FinishStepProps = {
  importResult: ImportResult;
  onFinish: () => void;
  onImportMore: () => void;
};

/**
 * Final step showing import success or error state
 */
export function FinishStep({
  importResult,
  onFinish,
  onImportMore,
}: FinishStepProps) {
  const { t } = useTranslations();

  if (importResult.success) {
    return (
      <Card className="p-8">
        <div className="flex flex-col items-center space-y-6 text-center">
          {/* Green success icon */}
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>

          {/* Success message */}
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-green-600 dark:text-green-400">
              {t("importer.finish.successTitle")}
            </h3>
            <p className="text-base text-muted-foreground">
              {t("importer.finish.successMessage", {
                count: importResult.successCount,
              })}
            </p>
            {importResult.failureCount > 0 && (
              <p className="text-sm text-orange-600 dark:text-orange-400">
                Note:{" "}
                {t("importer.finish.partialFailure", {
                  count: importResult.failureCount,
                })}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button onClick={onFinish}>
              {t("importer.finish.viewJournal")}
            </Button>
            <Button variant="outline" onClick={onImportMore}>
              {t("importer.finish.importMore")}
            </Button>
          </div>

          {/* Error details if partial failure */}
          {importResult.failureCount > 0 && importResult.errors && (
            <div className="w-full mt-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-semibold">
                      {t("importer.finish.failedTransactions")}
                    </p>
                    <ul className="list-disc list-inside text-xs space-y-1">
                      {importResult.errors.slice(0, 5).map((err, idx) => (
                        <li key={idx}>
                          {err.index >= 0
                            ? `${t("importer.finish.rowPrefix")} ${err.index + 1}: `
                            : ""}
                          {err.message}
                        </li>
                      ))}
                      {importResult.errors.length > 5 && (
                        <li>
                          ...and {importResult.errors.length - 5}{" "}
                          {t("importer.finish.moreErrors")}
                        </li>
                      )}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>
      </Card>
    );
  }

  // Error state
  return (
    <Card className="p-8">
      <div className="flex flex-col items-center space-y-6 text-center">
        {/* Red error icon */}
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <XCircle className="w-10 h-10 text-destructive" />
        </div>

        {/* Error message */}
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-destructive">
            {t("importer.finish.failedTitle")}
          </h3>
          <p className="text-base text-muted-foreground">
            {importResult.message || t("importer.finish.failedMessage")}
          </p>
        </div>

        {/* Error details */}
        {importResult.errors && importResult.errors.length > 0 && (
          <Alert variant="destructive" className="w-full">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold">
                  {t("importer.finish.errorDetails")}
                </p>
                <ul className="list-disc list-inside text-xs space-y-1">
                  {importResult.errors.map((err, idx) => (
                    <li key={idx}>
                      {err.index >= 0
                        ? `${t("importer.finish.rowPrefix")} ${err.index + 1}: `
                        : ""}
                      {err.message}
                    </li>
                  ))}
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button onClick={onImportMore}>
            {t("importer.finish.startOver")}
          </Button>
        </div>
      </div>
    </Card>
  );
}
