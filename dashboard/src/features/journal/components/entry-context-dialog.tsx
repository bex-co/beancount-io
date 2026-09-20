import { useRef, type RefObject } from "react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/common/components/ui/dialog";
import { Alert, AlertDescription } from "@/common/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/common/components/ui/table";
import type {
  JournalDirectiveType,
  JournalTransaction,
} from "@/common/types/journal";
import { useTranslations } from "@/common/hooks/use-translations";
import { restoreFocusOnDialogClose } from "@/common/lib/focus/restore-focus-on-dialog-close";
import { EntryContextPanel } from "@/features/journal/components/entry-context-panel";

interface EntryContextDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: JournalDirectiveType | null;
  ledgerId: string;
  onSuccess?: () => void;
  /** Originating row/control that opened this dialog. */
  returnFocusRef?: RefObject<HTMLElement | null>;
  /** Used when the opener unmounts after a successful edit/delete. */
  fallbackFocusRef?: RefObject<HTMLElement | null>;
}

/**
 * Flags the report generates rather than reads from a source directive. `P`
 * comes from a `pad`; `S` and `C` are produced when an account journal is
 * clamped to a time range — the opening balance carried in, and the conversion
 * that clears the residual cost balance. None of them exists in the ledger
 * text, so none has a source line to fetch, edit or delete, and asking for one
 * is what produced "The requested resource could not be found."
 *
 * Only these three are claimed. An unknown flag still takes the ordinary path,
 * so a genuinely missing source is still reported as missing.
 */
const GENERATED_FLAGS = {
  P: "journal.generatedEntryExplanation",
  S: "journal.generatedOpeningExplanation",
  C: "journal.generatedConversionExplanation",
} as const;

type GeneratedFlag = keyof typeof GENERATED_FLAGS;

/** Narrowed to transactions — only `JournalTransaction` carries `flag`. */
function isGeneratedEntry(
  entry: JournalDirectiveType | null,
): entry is JournalTransaction & { flag: GeneratedFlag } {
  return (
    entry !== null &&
    "flag" in entry &&
    typeof entry.flag === "string" &&
    entry.flag in GENERATED_FLAGS
  );
}

/**
 * Read-only panel for a generated entry, built from the journal row the caller
 * already has. No source, edit, or delete actions exist for generated entries.
 */
function GeneratedEntryPanel({
  entry,
}: {
  entry: JournalTransaction & { flag: GeneratedFlag };
}) {
  const { t } = useTranslations();
  const postings = entry.postings ?? [];
  return (
    <div className="space-y-4">
      <Alert>
        <AlertDescription>{t(GENERATED_FLAGS[entry.flag])}</AlertDescription>
      </Alert>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">
          {t("journal.generatedEntryTitle")}
        </h3>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">{t("journal.date")}</span>
          <span className="font-mono">{entry.date}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">
            {t("journal.narration")}
          </span>
          <span>{entry.narration || "—"}</span>
        </div>
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold">{t("journal.postings")}</h3>
        <Table>
          <TableBody>
            {postings.map((posting, index) => (
              <TableRow
                key={`${posting.account}-${index}`}
                className="border-border"
              >
                <TableCell className="font-mono text-sm py-2">
                  {posting.account}
                </TableCell>
                <TableCell className="font-mono text-sm text-right py-2">
                  {posting.units
                    ? `${posting.units.number} ${posting.units.currency}`
                    : ""}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/**
 * Dialog component for viewing and editing entry context
 * Shows location, content, and allows editing of entry source
 */
export function EntryContextDialog({
  open,
  onOpenChange,
  entry,
  ledgerId,
  onSuccess,
  returnFocusRef,
  fallbackFocusRef,
}: EntryContextDialogProps) {
  const { t } = useTranslations();
  const generatedEntry = isGeneratedEntry(entry) ? entry : null;
  const entryHash = entry?.entry_hash ?? "";
  const skipFocusRestoreRef = useRef(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[95vw] sm:w-[90vw] md:min-w-[600px] md:max-w-2xl lg:min-w-[800px] lg:max-w-4xl max-h-[80vh] overflow-hidden flex flex-col"
        onCloseAutoFocus={(event) => {
          if (skipFocusRestoreRef.current) {
            skipFocusRestoreRef.current = false;
            event.preventDefault();
            return;
          }
          restoreFocusOnDialogClose(
            event,
            returnFocusRef?.current,
            fallbackFocusRef?.current,
          );
        }}
      >
        <VisuallyHidden>
          <DialogTitle>{t("journal.entryContext")}</DialogTitle>
        </VisuallyHidden>
        <div className="flex-1 overflow-y-auto">
          {generatedEntry ? (
            <GeneratedEntryPanel entry={generatedEntry} />
          ) : (
            <EntryContextPanel
              key={`${ledgerId}:${entryHash}`}
              entryHash={entryHash}
              ledgerId={ledgerId}
              entry={entry}
              skip={!open || !entryHash}
              onSourceNavigate={() => {
                skipFocusRestoreRef.current = true;
              }}
              onSuccess={() => {
                onOpenChange(false);
                onSuccess?.();
              }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
