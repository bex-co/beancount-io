import { useRef, useState } from "react";
import {
  Link,
  useBlocker,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/common/components/page-header";
import { Button } from "@/common/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/common/components/ui/dialog";
import { useLedger } from "@/common/hooks/use-ledger";
import { useTranslations } from "@/common/hooks/use-translations";
import { createLedgerId } from "@/common/lib/utils/encode";
import { restoreFocusOnDialogClose } from "@/common/lib/focus/restore-focus-on-dialog-close";
import { EntryContextPanel } from "@/features/journal/components/entry-context-panel";

/**
 * Canonical destination for native Share/Copy entry URLs
 * (`/ledger/<owner>/<ledger>/entry/<hash>`). Reuses journal entry-context
 * presentation without paging the whole journal.
 */
export default function EntryPage() {
  const { t } = useTranslations();
  const navigate = useNavigate();
  const { ledgerOwner, ledgerName, entryHash } = useParams({
    from: "/ledger/$ledgerOwner/$ledgerName/entry/$entryHash",
  });
  const ledgerId = createLedgerId(ledgerOwner, ledgerName);
  const { ledgerName: ledgerDisplayName } = useLedger();

  // Unsaved source edits guard every exit from this page — Back to journal,
  // the source-file action, any other link — as the Journal dialog does
  // (w4/250). A completed delete leaves without asking.
  const [dirty, setDirty] = useState(false);
  const leavingRef = useRef(false);
  const editorRegionRef = useRef<HTMLDivElement | null>(null);
  const keepEditingRef = useRef(false);
  // A save or delete in flight holds the page without asking: its own exit
  // (the saved entry's address, or the Journal after a delete) is the one
  // that leaves, so it never lands on a page or draft opened after it (w4/m49).
  const [writing, setWriting] = useState(false);
  useBlocker({
    shouldBlockFn: () => writing && !leavingRef.current,
    enableBeforeUnload: () => writing,
  });
  const blocker = useBlocker({
    shouldBlockFn: () => dirty && !writing && !leavingRef.current,
    enableBeforeUnload: () => dirty,
    withResolver: true,
  });

  const journalHref = {
    to: "/ledger/$ledgerOwner/$ledgerName/journal" as const,
    params: { ledgerOwner, ledgerName },
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title={t("journal.entryPageTitle")}
          description={t("journal.entryPageDescription", {
            ledgerName: ledgerDisplayName ?? ledgerName,
          })}
        />
        <Button variant="outline" size="sm" className="self-start" asChild>
          <Link {...journalHref}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("journal.backToJournal")}
          </Link>
        </Button>
      </div>

      <div
        ref={editorRegionRef}
        className="overflow-hidden rounded-xl border bg-card p-4 shadow-sm sm:p-6"
      >
        <EntryContextPanel
          key={`${ledgerId}:${entryHash}`}
          entryHash={entryHash}
          ledgerId={ledgerId}
          onDirtyChange={setDirty}
          onPendingChange={setWriting}
          // The saved source has a new hash; the old address no longer
          // names it. Move there as the save's own exit (w4/251).
          onSaved={async (savedHash) => {
            if (savedHash === entryHash) return;
            leavingRef.current = true;
            try {
              await navigate({
                to: "/ledger/$ledgerOwner/$ledgerName/entry/$entryHash",
                params: { ledgerOwner, ledgerName, entryHash: savedHash },
                replace: true,
              });
            } finally {
              leavingRef.current = false;
            }
          }}
          onDeleted={() => {
            leavingRef.current = true;
            void navigate(journalHref);
          }}
        />
      </div>

      <Dialog
        open={blocker.status === "blocked"}
        onOpenChange={(open) => {
          if (open) return;
          keepEditingRef.current = true;
          blocker.reset?.();
        }}
      >
        <DialogContent
          className="sm:max-w-md"
          // Keep editing cancels the departure: return focus to the retained
          // editor instead of the body/skip link (w4/1079). Discard's
          // navigation owns the destination's focus.
          onCloseAutoFocus={(event) => {
            if (!keepEditingRef.current) return;
            keepEditingRef.current = false;
            restoreFocusOnDialogClose(
              event,
              editorRegionRef.current?.querySelector<HTMLElement>(
                "textarea, [role='textbox']",
              ),
            );
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("journal.discardEntryEditTitle")}</DialogTitle>
            <DialogDescription>
              {t("journal.discardEntryEditDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => {
                keepEditingRef.current = true;
                blocker.reset?.();
              }}
            >
              {t("journal.keepEditing")}
            </Button>
            <Button variant="destructive" onClick={() => blocker.proceed?.()}>
              {t("journal.discardEntryEdit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
