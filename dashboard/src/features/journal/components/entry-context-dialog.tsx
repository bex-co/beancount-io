import { useId, useRef, useState, type RefObject } from "react";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/common/components/ui/dialog";
import { Button } from "@/common/components/ui/button";
import { Alert, AlertDescription } from "@/common/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table";
import type {
  JournalDirectiveType,
  JournalTransaction,
} from "@/common/types/journal";
import { useTranslations } from "@/common/hooks/use-translations";
import { restoreFocusOnDialogClose } from "@/common/lib/focus/restore-focus-on-dialog-close";
import { EntryContextPanel } from "@/features/journal/components/entry-context-panel";
import { hasActiveMonacoWidget } from "@/features/journal/components/entry-editor-escape";
import { Amount } from "@/common/components/amount";

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
  const postingsHeadingId = useId();
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
        <h3 id={postingsHeadingId} className="text-sm font-semibold">
          {t("journal.postings")}
        </h3>
        <Table aria-labelledby={postingsHeadingId}>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">{t("common.accountColumn")}</TableHead>
              <TableHead scope="col" className="text-end">
                {t("journal.unitsHeader")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {postings.map((posting, index) => (
              <TableRow
                key={`${posting.account}-${index}`}
                className="border-border"
              >
                <TableCell className="font-mono text-sm py-2">
                  {posting.account}
                </TableCell>
                <TableCell className="font-mono text-sm text-end py-2">
                  {posting.units && (
                    <Amount>{`${posting.units.number} ${posting.units.currency}`}</Amount>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/** The date, payee and narration a reader would recognise the entry by. */
function describeEntry(entry: JournalDirectiveType | null): string {
  if (!entry) return "";
  const parts = [entry.date];
  if ("payee" in entry && entry.payee) parts.push(entry.payee);
  if ("narration" in entry && entry.narration) parts.push(entry.narration);
  return parts.filter(Boolean).join(" · ");
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
  const entryLabel = describeEntry(entry);
  // Unsaved source edits, and the exit waiting on "Discard" while they exist.
  // The panel remounts per entry and reports its own state, so only an open
  // dialog's report counts.
  const [dirty, setDirty] = useState(false);
  const [pendingLeave, setPendingLeave] = useState<(() => void) | null>(null);
  // A save or delete in flight holds the dialog: its completion closes the
  // draft it was sent from, never one opened after it (w4/m49).
  const [writing, setWriting] = useState(false);

  const requestLeave = (leave: () => void) => {
    if (writing) return;
    if (open && dirty) setPendingLeave(() => leave);
    else leave();
  };

  return (
    <Dialog
      open={open}
      // Close, Escape and an outside click all arrive here.
      onOpenChange={(next) =>
        next ? onOpenChange(true) : requestLeave(() => onOpenChange(false))
      }
    >
      <DialogContent
        // An active Monaco Find / Go to Line widget owns Escape: preventing
        // the dialog dismissal lets Monaco close the widget, and a later
        // bare Escape leaves through requestLeave as usual (w4/1062).
        onEscapeKeyDown={(event) => {
          const content = event.currentTarget as unknown as ParentNode | null;
          if (content && hasActiveMonacoWidget(content)) {
            event.preventDefault();
          }
        }}
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
        // Without an entry there is nothing to describe; say so explicitly
        // rather than leave Radix pointing at a missing description.
        {...(entryLabel ? {} : { "aria-describedby": undefined })}
      >
        <VisuallyHidden>
          <DialogTitle>{t("journal.entryContext")}</DialogTitle>
          {entryLabel && (
            <DialogDescription>
              {t("journal.entryContextDescription", { entry: entryLabel })}
            </DialogDescription>
          )}
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
              onDirtyChange={setDirty}
              onPendingChange={setWriting}
              confirmLeave={requestLeave}
              onSuccess={() => {
                onOpenChange(false);
                onSuccess?.();
              }}
            />
          )}
        </div>
        <Dialog
          open={pendingLeave !== null}
          onOpenChange={(next) => !next && setPendingLeave(null)}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("journal.discardEntryEditTitle")}</DialogTitle>
              <DialogDescription>
                {t("journal.discardEntryEditDescription")}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button variant="outline" onClick={() => setPendingLeave(null)}>
                {t("journal.keepEditing")}
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  const leave = pendingLeave;
                  setPendingLeave(null);
                  setDirty(false);
                  leave?.();
                }}
              >
                {t("journal.discardEntryEdit")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
