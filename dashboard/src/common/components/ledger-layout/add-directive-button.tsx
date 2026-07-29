import { memo } from "react";
import { Plus } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { SidebarMenuAction } from "@/common/components/ui/sidebar.tsx";
import { useTranslations } from "@/common/hooks/use-translations.ts";
import { useLedgerPermission } from "@/common/hooks/use-ledger-permission";
import { decodeLedgerId } from "@/common/lib/utils/encode";
import { NEW_TRANSACTION_ACTION_SEARCH } from "@/common/lib/ledger-action-search";

interface AddDirectiveButtonProps {
  ledgerId: string;
}

/**
 * Add directive button component for ledger sidebar
 * Displays a plus icon for adding new directives
 * Links to the canonical journal entry action URL
 * Only visible for users with write permissions (push or admin)
 */
export const AddDirectiveButton = memo(
  ({ ledgerId }: AddDirectiveButtonProps) => {
    const { t } = useTranslations();
    const { canWrite } = useLedgerPermission();
    const { ledgerOwner, ledgerName } = decodeLedgerId(ledgerId);

    // Hide button if user doesn't have write permissions
    if (!canWrite) {
      return null;
    }

    return (
      <SidebarMenuAction asChild>
        <Link
          to="/ledger/$ledgerOwner/$ledgerName/journal"
          params={{ ledgerOwner, ledgerName }}
          search={NEW_TRANSACTION_ACTION_SEARCH}
          onClick={(event) => event.stopPropagation()}
          aria-label={t("journal.addNewJournalEntry")}
        >
          <Plus className="h-4 w-4" />
        </Link>
      </SidebarMenuAction>
    );
  },
);

AddDirectiveButton.displayName = "AddDirectiveButton";
