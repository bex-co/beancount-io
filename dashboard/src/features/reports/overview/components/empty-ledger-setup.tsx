import { BookOpen, ListChecks } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { ReportEmptyState } from "@/common/components/state-components";
import { useTranslations } from "@/common/hooks/use-translations";
import {
  NEW_TRANSACTION_ACTION_SEARCH,
  OPEN_ACCOUNT_ACTION_SEARCH,
} from "@/common/lib/ledger-action-search";

interface EmptyLedgerSetupProps {
  ledgerOwner: string;
  ledgerName: string;
  entryFile: string;
  canWrite: boolean;
}

export function EmptyLedgerSetup({
  ledgerOwner,
  ledgerName,
  entryFile,
  canWrite,
}: EmptyLedgerSetupProps) {
  const { t } = useTranslations();
  const ledgerParams = { ledgerOwner, ledgerName };
  const fileParams = {
    ...ledgerParams,
    branch: "main",
    _splat: entryFile,
  };

  if (!canWrite) {
    return (
      <ReportEmptyState
        Icon={BookOpen}
        title={t("page.overview.emptyLedgerReadOnlyTitle")}
        message={t("page.overview.emptyLedgerReadOnlyDescription")}
      >
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm">
          <Link
            to="/ledger/$ledgerOwner/$ledgerName/accounts"
            params={ledgerParams}
            className="text-primary underline underline-offset-4 hover:text-primary/80"
          >
            {t("page.accounts.accounts")}
          </Link>
          <Link
            to="/ledger/$ledgerOwner/$ledgerName/journal"
            params={ledgerParams}
            className="text-primary underline underline-offset-4 hover:text-primary/80"
          >
            {t("journal.journal")}
          </Link>
          <Link
            to="/ledger/$ledgerOwner/$ledgerName/files/blob/$branch/$"
            params={fileParams}
            className="text-primary underline underline-offset-4 hover:text-primary/80"
          >
            {t("ledgerEditor.files")}
          </Link>
        </div>
      </ReportEmptyState>
    );
  }

  return (
    <ReportEmptyState
      Icon={ListChecks}
      title={t("page.overview.emptyLedgerTitle")}
      message={t("page.overview.emptyLedgerDescription")}
    >
      <ol className="mx-auto max-w-md space-y-5 text-left">
        <li className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-2">
          <span className="text-sm font-medium text-muted-foreground">1.</span>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold">
              {t("page.overview.emptyLedgerOpenAccountStep")}
            </h4>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {t("page.overview.emptyLedgerOpenAccountDescription")}
            </p>
            <Link
              to="/ledger/$ledgerOwner/$ledgerName/accounts"
              params={ledgerParams}
              search={OPEN_ACCOUNT_ACTION_SEARCH}
              className="mt-2 inline-block text-sm text-primary underline underline-offset-4 hover:text-primary/80"
            >
              {t("page.overview.emptyLedgerOpenAccountAction")}
            </Link>
          </div>
        </li>
        <li className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-2">
          <span className="text-sm font-medium text-muted-foreground">2.</span>
          <div className="min-w-0">
            <h4 className="text-sm font-semibold">
              {t("page.overview.emptyLedgerAddEntryStep")}
            </h4>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {t("page.overview.emptyLedgerAddEntryDescription")}
            </p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <Link
                to="/ledger/$ledgerOwner/$ledgerName/journal"
                params={ledgerParams}
                search={NEW_TRANSACTION_ACTION_SEARCH}
                className="text-primary underline underline-offset-4 hover:text-primary/80"
              >
                {t("page.overview.emptyLedgerAddEntryAction")}
              </Link>
              <Link
                to="/ledger/$ledgerOwner/$ledgerName/files/blob/$branch/$"
                params={fileParams}
                search={{ editMode: true }}
                className="text-primary underline underline-offset-4 hover:text-primary/80"
              >
                {t("page.overview.emptyLedgerEditFileAction")}
              </Link>
            </div>
          </div>
        </li>
      </ol>
    </ReportEmptyState>
  );
}
