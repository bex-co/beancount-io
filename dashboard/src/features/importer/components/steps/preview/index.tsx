import { Button } from "@/common/components/ui/button";
import { useTranslations } from "@/common/hooks/use-translations";
import { ImportPreviewTable } from "./import-preview-table";
import { EmptyRowsState } from "./empty-rows-state";
import type { CSVParseResult } from "../../../types";

type PreviewStepProps = {
  parseResult: CSVParseResult;
  onContinue: () => void;
  onBack: () => void;
  onResultChange: (result: CSVParseResult) => void;
};

/**
 * Step for previewing and editing parsed transactions
 */
export function PreviewStep({
  parseResult,
  onContinue,
  onBack,
  onResultChange,
}: PreviewStepProps) {
  const { t } = useTranslations();

  // Special case: File parsed successfully but contains no rows
  const hasNoRows = parseResult.rows.length === 0;

  return (
    <>
      {hasNoRows ? (
        <EmptyRowsState onRetry={onBack} />
      ) : (
        <ImportPreviewTable
          result={parseResult}
          onResultChange={onResultChange}
        />
      )}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          {t("importer.preview.uploadDifferentFile")}
        </Button>
        <Button onClick={onContinue} disabled={parseResult.validCount === 0}>
          {t("importer.preview.continueToConfig")}
        </Button>
      </div>
    </>
  );
}
