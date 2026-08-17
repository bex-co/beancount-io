import { useRef, useState } from "react";
import {
  ChevronDown,
  FileSpreadsheet,
  FileText,
  FileOutput,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/common/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/common/components/ui/dropdown-menu";
import {
  track,
  type ReportExportFailure,
  type ReportExportFormat,
} from "@/common/analytics/events";
import { useTranslations } from "@/common/hooks/use-translations";
import { exportStatementCSV } from "./csv";
import { exportStatementMarkdown } from "./markdown";
import {
  hasStatementExportData,
  refreshStatementGenerationTime,
  type StatementExportDocument,
} from "./model";
import { PrintableStatement } from "./printable-statement";

const FAILURE_CATEGORY: Record<ReportExportFormat, ReportExportFailure> = {
  csv: "csv_generation",
  markdown: "markdown_generation",
  print: "print_dialog",
};

function trackSafely(action: () => void) {
  try {
    action();
  } catch {
    // Analytics must never block an export, its feedback, or its cleanup.
  }
}

export function StatementExportMenu({
  document,
}: {
  document: StatementExportDocument;
}) {
  const { t, i18n } = useTranslations();
  const actionInProgress = useRef(false);
  const [isBusy, setIsBusy] = useState(false);
  const [printDocument, setPrintDocument] = useState(document);
  const hasData = hasStatementExportData(document);

  const runAction = async (
    format: ReportExportFormat,
    action: (currentDocument: StatementExportDocument) => void | Promise<void>,
  ) => {
    if (actionInProgress.current) return;

    actionInProgress.current = true;
    setIsBusy(true);
    trackSafely(() =>
      track("report_export_started", {
        report_type: document.kind,
        format,
      }),
    );

    let succeeded = false;
    try {
      const currentDocument = refreshStatementGenerationTime(document);
      await action(currentDocument);
      succeeded = true;
    } catch {
      // Failure feedback and analytics are emitted below, outside the action
      // try/catch, so UI/telemetry errors cannot produce both outcomes.
    }

    try {
      if (succeeded) {
        trackSafely(() =>
          track("report_export_completed", {
            report_type: document.kind,
            format,
          }),
        );
        toast.success(t("reports.export.completed"));
      } else {
        trackSafely(() =>
          track("report_export_failed", {
            report_type: document.kind,
            format,
            failure_category: FAILURE_CATEGORY[format],
          }),
        );
        toast.error(t("reports.export.failed"));
      }
    } finally {
      actionInProgress.current = false;
      setIsBusy(false);
    }
  };

  const handleCSV = () =>
    runAction("csv", (currentDocument) => {
      exportStatementCSV(currentDocument);
    });

  const handleMarkdown = () =>
    runAction("markdown", (currentDocument) => {
      exportStatementMarkdown(currentDocument, {
        locale: i18n.language,
        t: (key, params) => t(key, params),
      });
    });

  const handlePrint = () =>
    runAction("print", async (currentDocument) => {
      setPrintDocument(currentDocument);
      // Give React a frame to commit the action-time generation timestamp before
      // the browser captures the print tree. Same-window printing avoids popup
      // blockers and lets users choose their installed PDF destination.
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
      window.print();
    });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={isBusy || !hasData}
            aria-label={t("reports.export.action")}
          >
            <FileOutput />
            <span>{t("reports.export.action")}</span>
            <ChevronDown aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            disabled={isBusy || !hasData}
            onSelect={() => void handleCSV()}
          >
            <FileSpreadsheet />
            {t("reports.export.csv")}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isBusy || !hasData}
            onSelect={() => void handleMarkdown()}
          >
            <FileText />
            {t("reports.export.markdown")}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isBusy || !hasData}
            onSelect={() => void handlePrint()}
          >
            <Printer />
            {t("reports.export.printSavePdf")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <PrintableStatement document={printDocument} />
    </>
  );
}
