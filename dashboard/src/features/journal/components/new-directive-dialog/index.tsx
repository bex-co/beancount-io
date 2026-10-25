import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/common/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/common/components/ui/tabs";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { TransactionForm } from "@/features/journal/components/new-directive-dialog/transaction-form";
import { BalanceForm } from "@/features/journal/components/new-directive-dialog/balance-form";
import { NoteForm } from "@/features/journal/components/new-directive-dialog/note-form";
import { OpenAccountForm } from "@/features/journal/components/new-directive-dialog/open-account-form";
import { useApolloCacheClear } from "@/common/hooks/use-apollo-cache";
import { useWriteOutcome } from "@/common/hooks/use-write-outcome";
import { useTranslations } from "@/common/hooks/use-translations";
import type { JournalDirectiveAction } from "@/common/lib/ledger-action-search";
import { useEffect, useRef, useState, type RefObject } from "react";
import { restoreFocusOnDialogClose } from "@/common/lib/focus/restore-focus-on-dialog-close";

const TABS = [
  { value: "transaction", label: "journal.transaction" },
  { value: "balance", label: "journal.balance" },
  { value: "note", label: "journal.note" },
  { value: "account", label: "journal.account" },
] as const;

interface NewDirectiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ledgerId: string;
  activeTab: JournalDirectiveAction;
  onActiveTabChange: (tab: JournalDirectiveAction) => void;
  /** `leftErrors`: the write succeeded but the ledger now fails validation. */
  onSuccess?: (outcome: { leftErrors: boolean }) => void;
  /**
   * Where focus lands when the dialog closes. The dialog is opened by a route
   * link (and by the sidebar or Overview, which may be unmounted by then), so
   * Radix has no trigger to return to and would drop focus on the body.
   */
  returnFocusRef?: RefObject<HTMLElement | null>;
}

/**
 * Dialog component for creating new directives
 * Contains tabs for transaction, balance, note, and account directives
 */
export function NewDirectiveDialog({
  open,
  onOpenChange,
  ledgerId,
  activeTab,
  onActiveTabChange,
  onSuccess,
  returnFocusRef,
}: NewDirectiveDialogProps) {
  const { t } = useTranslations();
  const clearCache = useApolloCacheClear();
  const writeOutcome = useWriteOutcome(ledgerId);

  // While a form's write is in flight the dialog keeps that draft in front:
  // no dismissal and no tab switch, which would unmount it (w4/m33).
  const [pending, setPending] = useState(false);

  // Each opening is its own draft session. A write completes for the session
  // it was submitted from, so a late success cannot close a later draft.
  const [session, setSession] = useState(0);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setSession((current) => current + 1);
  }
  const liveSession = useRef<number | null>(open ? session : null);
  useEffect(() => {
    liveSession.current = open ? session : null;
  }, [open, session]);

  // Each form submits with the handler of the render it submitted from, so
  // `session` here is the session that write belongs to.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleSuccess = async () => {
    // Read before the cache clear below drops it: the pre-write errors.
    const before = writeOutcome.snapshot();
    if (liveSession.current === session) onOpenChange(false);
    clearCache();
    const outcome = { leftErrors: await writeOutcome.report(before) };
    // The reader may have left while the outcome was read; a late
    // completion must not act on a page they have already left, nor on a
    // newer dialog session (w4/1078). A null live session is this write's
    // own close above, which still completes normally.
    if (!mountedRef.current) return;
    if (liveSession.current !== null && liveSession.current !== session) {
      return;
    }
    onSuccess?.(outcome);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        busy={pending}
        className="!max-w-full sm:!max-w-[600px] lg:!max-w-[1000px] top-[2%] sm:top-[10%] translate-y-0 max-h-[96vh] sm:max-h-[85vh] flex flex-col"
        onCloseAutoFocus={(event) => {
          restoreFocusOnDialogClose(event, returnFocusRef?.current);
        }}
      >
        <VisuallyHidden>
          <DialogDescription className="text-left">
            {t("journal.createNewJournalEntry")}
          </DialogDescription>
        </VisuallyHidden>

        <Tabs
          value={activeTab}
          onValueChange={(value) =>
            onActiveTabChange(value as JournalDirectiveAction)
          }
          className="w-full flex flex-col flex-1 min-h-0"
        >
          {/* Every form stays mounted while the dialog is open and the
              inactive ones are hidden, so switching type — by pointer or the
              tablist's arrow keys — keeps each unsaved draft (w4/256).
              Closing the dialog still discards them all. */}
          <div className="mb-4 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <DialogTitle className="min-w-0 shrink-0 text-left sm:shrink">
              {t("journal.newEntry")}
            </DialogTitle>
            <TabsList className="grid w-full grid-cols-4 sm:w-auto sm:shrink-0">
              {TABS.map(({ value, label }) => (
                <TabsTrigger key={value} value={value} disabled={pending}>
                  {t(label)}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent
            value="transaction"
            forceMount
            hidden={activeTab !== "transaction"}
            className="flex-1 overflow-y-auto min-h-0"
          >
            <TransactionForm
              ledgerId={ledgerId}
              onSuccess={handleSuccess}
              onPendingChange={setPending}
            />
          </TabsContent>

          <TabsContent
            value="balance"
            forceMount
            hidden={activeTab !== "balance"}
            className="flex-1 overflow-y-auto min-h-0"
          >
            <BalanceForm
              ledgerId={ledgerId}
              onSuccess={handleSuccess}
              onPendingChange={setPending}
            />
          </TabsContent>

          <TabsContent
            value="note"
            forceMount
            hidden={activeTab !== "note"}
            className="flex-1 overflow-y-auto min-h-0"
          >
            <NoteForm
              ledgerId={ledgerId}
              onSuccess={handleSuccess}
              onPendingChange={setPending}
            />
          </TabsContent>

          <TabsContent
            value="account"
            forceMount
            hidden={activeTab !== "account"}
            className="flex-1 overflow-y-auto min-h-0"
          >
            <OpenAccountForm
              ledgerId={ledgerId}
              onSuccess={handleSuccess}
              onPendingChange={setPending}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
