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
import { useTranslations } from "@/common/hooks/use-translations";
import type { JournalDirectiveAction } from "@/common/lib/ledger-action-search";

interface NewDirectiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ledgerId: string;
  activeTab: JournalDirectiveAction;
  onActiveTabChange: (tab: JournalDirectiveAction) => void;
  onSuccess?: () => void;
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
}: NewDirectiveDialogProps) {
  const { t } = useTranslations();
  const clearCache = useApolloCacheClear();

  const handleSuccess = () => {
    onSuccess?.();
    onOpenChange(false);
    clearCache();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-full sm:!max-w-[600px] lg:!max-w-[1000px] top-[2%] sm:top-[10%] translate-y-0 max-h-[96vh] sm:max-h-[85vh] flex flex-col">
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
          <div className="flex items-center gap-4 mb-4 shrink-0">
            <DialogTitle className="text-left">
              {t("journal.newEntry")}
            </DialogTitle>
            <TabsList className="grid grid-cols-4 shrink-0">
              <TabsTrigger value="transaction">
                {t("journal.transaction")}
              </TabsTrigger>
              <TabsTrigger value="balance">{t("journal.balance")}</TabsTrigger>
              <TabsTrigger value="note">{t("journal.note")}</TabsTrigger>
              <TabsTrigger value="account">{t("journal.account")}</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent
            value="transaction"
            className="flex-1 overflow-y-auto min-h-0"
          >
            <TransactionForm ledgerId={ledgerId} onSuccess={handleSuccess} />
          </TabsContent>

          <TabsContent
            value="balance"
            className="flex-1 overflow-y-auto min-h-0"
          >
            <BalanceForm ledgerId={ledgerId} onSuccess={handleSuccess} />
          </TabsContent>

          <TabsContent value="note" className="flex-1 overflow-y-auto min-h-0">
            <NoteForm ledgerId={ledgerId} onSuccess={handleSuccess} />
          </TabsContent>

          <TabsContent
            value="account"
            className="flex-1 overflow-y-auto min-h-0"
          >
            <OpenAccountForm ledgerId={ledgerId} onSuccess={handleSuccess} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
