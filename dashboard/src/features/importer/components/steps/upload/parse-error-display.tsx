import { Card, CardContent } from "@/common/components/ui/card";
import { Button } from "@/common/components/ui/button";
import { AlertCircle, Download, Sparkles, FileText } from "lucide-react";
import { useTranslations } from "@/common/hooks/use-translations";
import { useHidesBilling } from "@/common/hooks/use-hides-billing";
import { useUserLimits } from "@/common/hooks/use-user-limits";
import { UpgradePromptLink } from "@/common/components/upgrade-prompt-link";
import { getNextTier } from "@/common/lib/subscription/tier-config";
import { isPremiumRequired } from "../../../utils/is-premium-required";
import {
  CsvEmptyError,
  CsvEncodingError,
} from "../../../utils/decode-csv-bytes";
import type { FileFormat } from "../../../types";

interface ParseErrorDisplayProps {
  error: unknown;
  fileFormat: FileFormat;
  onReset: () => void;
}

interface ErrorLayoutProps {
  onReset: () => void;
  children: React.ReactNode;
}

/**
 * Shared error layout with icon, content area, and reset button
 */
function ErrorLayout({ onReset, children }: ErrorLayoutProps) {
  const { t } = useTranslations();

  return (
    <Card>
      <CardContent className="py-2">
        <div className="flex flex-col items-center text-center space-y-6 max-w-md mx-auto">
          {/* Icon */}
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>

          {/* Content */}
          {children}

          {/* Actions */}
          <div className="flex gap-2 w-full">
            <Button
              variant="outline"
              className="flex-1"
              size="sm"
              onClick={onReset}
            >
              {t("importer.error.uploadDifferentFile")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Premium required error component
 * Displays upgrade options and CSV alternative
 */
function PremiumRequiredError({
  onReset,
  fileFormat,
}: {
  onReset: () => void;
  fileFormat: FileFormat;
}) {
  const { t } = useTranslations();
  const { tier } = useUserLimits();
  const hidesBilling = useHidesBilling();
  // A Premium user who spent the AI allowance needs Growth, so the heading
  // names whatever plan the button recommends.
  const next = getNextTier(tier);
  // A CSV only reaches AI parsing because the user chose it, so name the
  // spent quota rather than a file type that "requires" AI.
  const isCsv = fileFormat === "csv";

  return (
    <ErrorLayout onReset={onReset}>
      {/* Title */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">
          {isCsv
            ? t("importer.error.aiQuotaReached")
            : t("importer.error.premiumRequired")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {isCsv
            ? t("importer.error.aiQuotaReachedCsv")
            : t("importer.error.premiumRequiredDescription")}
        </p>
      </div>

      {/* Solutions */}
      <div className="w-full space-y-3">
        {/* Premium Option */}
        {!hidesBilling && (
          <div className="bg-linear-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <p className="text-sm font-medium">
                {next
                  ? t("importer.error.upgradeToPlan", {
                      plan: t(next.labelKey),
                    })
                  : t("importer.error.upgradePlan")}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("importer.error.upgradeDescription")}
            </p>
            <Button asChild className="w-full" size="sm">
              <UpgradePromptLink surface="importer_paywall" plan={next}>
                {t("importer.error.upgradeNow")}
              </UpgradePromptLink>
            </Button>
          </div>
        )}

        {/* Alternative: CSV */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              {t("importer.error.or")}
            </span>
          </div>
        </div>

        <div className="border rounded-lg p-4 space-y-3">
          {/* A CSV uploader already read the free path in the description;
              they need the example, not "use CSV format". */}
          {!isCsv && (
            <>
              <div className="flex items-center justify-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm font-medium">
                  {t("importer.error.useCsvFormat")}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("importer.error.csvFreeAccess")}
              </p>
            </>
          )}
          <a
            href="/lgasset/csv_transactions.csv"
            download="example_transactions.csv"
            className="block"
          >
            <Button variant="outline" className="w-full" size="sm">
              <Download className="w-3 h-3 mr-2" />
              {t("importer.error.downloadCsvExample")}
            </Button>
          </a>
        </div>
      </div>
    </ErrorLayout>
  );
}

/**
 * Server error component
 * Displays server-side error with retry suggestion
 */
function ServerError({ onReset }: { onReset: () => void }) {
  const { t } = useTranslations();

  return (
    <ErrorLayout onReset={onReset}>
      {/* Title */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">
          {t("importer.error.failedToParse")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t("importer.error.serverError")}
        </p>
      </div>
    </ErrorLayout>
  );
}

/**
 * A CSV whose bytes are not UTF-8: say how to re-save it rather than import
 * changed text (w4/278).
 */
function EncodingError({ onReset }: { onReset: () => void }) {
  const { t } = useTranslations();

  return (
    <ErrorLayout onReset={onReset}>
      <div role="alert" className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">
          {t("importer.error.notUtf8")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t("importer.error.notUtf8Description")}
        </p>
      </div>
    </ErrorLayout>
  );
}

/**
 * An empty CSV, such as a failed export: nothing to read, with or without AI
 * (w2/128).
 */
function EmptyFileError({ onReset }: { onReset: () => void }) {
  const { t } = useTranslations();

  return (
    <ErrorLayout onReset={onReset}>
      <div role="alert" className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">
          {t("importer.error.emptyFile")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t("importer.error.emptyFileDescription")}
        </p>
      </div>
    </ErrorLayout>
  );
}

/**
 * Parent component that routes to appropriate error display
 * based on error type
 */
export function ParseErrorDisplay({
  error,
  fileFormat,
  onReset,
}: ParseErrorDisplayProps) {
  // Detect if error is premium-related using GraphQL extensions.code
  const isPremiumRequiredError = isPremiumRequired(error);

  if (error instanceof CsvEncodingError) {
    return <EncodingError onReset={onReset} />;
  }

  if (error instanceof CsvEmptyError) {
    return <EmptyFileError onReset={onReset} />;
  }

  if (isPremiumRequiredError) {
    return <PremiumRequiredError onReset={onReset} fileFormat={fileFormat} />;
  }

  return <ServerError onReset={onReset} />;
}
