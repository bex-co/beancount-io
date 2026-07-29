import { Button } from "@/common/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/common/components/ui/dialog";
import { Download } from "lucide-react";
import { useState } from "react";
import { useLazyQuery } from "@apollo/client/react";
import {
  GetLedgerPlaintextJournalDocument,
  type GetLedgerPlaintextJournalQuery,
  type GetLedgerPlaintextJournalQueryVariables,
} from "@/graphql/definitions";
import { toast } from "sonner";
import { useTranslations } from "@/common/hooks/use-translations";

interface ExportJournalButtonProps {
  ledgerId: string;
  account?: string | null;
  filter?: string | null;
  time?: string | null;
}

/**
 * Export journal button component
 * Downloads the journal as a beancount file
 */
export function ExportJournalButton({
  ledgerId,
  account,
  filter,
  time,
}: ExportJournalButtonProps) {
  const { t } = useTranslations();
  const [isExporting, setIsExporting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [getPlaintextJournal] = useLazyQuery<
    GetLedgerPlaintextJournalQuery,
    GetLedgerPlaintextJournalQueryVariables
  >(GetLedgerPlaintextJournalDocument);

  const handleExport = async () => {
    try {
      setIsExporting(true);

      const { data } = await getPlaintextJournal({
        variables: {
          ledgerId,
          query: {
            account: account || undefined,
            filter: filter || undefined,
            time: time || undefined,
          },
        },
      });

      if (!data?.getLedgerPlaintextJournal?.content) {
        toast.error(t("journal.failedToExportJournal"));
        return;
      }

      // Create filename with timestamp
      const now = new Date();
      const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, -1);
      const filename = `journal_${timestamp}.beancount`;

      // Create blob and download
      const blob = new Blob([data.getLedgerPlaintextJournal.content], {
        type: "text/plain",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(t("journal.journalExportedSuccess"));
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Failed to export journal:", error);
      toast.error(t("journal.failedToExportJournal"));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        className="flex items-center gap-2"
        onClick={() => setIsDialogOpen(true)}
        disabled={isExporting}
        aria-label={isExporting ? t("journal.exporting") : t("journal.export")}
      >
        <Download className="h-4 w-4" />
        <span className="hidden sm:inline">
          {isExporting ? t("journal.exporting") : t("journal.export")}
        </span>
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("journal.exportJournal")}</DialogTitle>
            <DialogDescription>
              {t("journal.downloadFilteredEntries")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isExporting}
            >
              {t("common.cancel")}
            </Button>
            <Button onClick={handleExport} loading={isExporting}>
              {t("journal.export")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
