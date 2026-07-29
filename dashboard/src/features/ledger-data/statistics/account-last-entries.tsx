import { type ReactNode } from "react";
import { useQuery } from "@apollo/client/react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table";
import { Skeleton } from "@/common/components/ui/skeleton";
import { Activity, AlertCircle } from "lucide-react";
import {
  GetLedgerAccountLastEntriesDocument,
  type GetLedgerAccountLastEntriesQuery,
  type GetLedgerAccountLastEntriesQueryVariables,
} from "@/graphql/definitions";
import { formatDateISO } from "@/common/lib/format/format-date-iso";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useLedgerSearchParams } from "@/common/hooks/use-ledger-search-params";
import { useTranslations } from "@/common/hooks/use-translations";
import { useErrorMessage } from "@/common/lib/errors/error-message";
import { useFormatNumber } from "@/common/hooks/use-format-number";

/**
 * Format balance object to display string
 */
function formatBalance(
  balance: Record<string, unknown> | null,
  formatNum: (v: number) => string,
): ReactNode {
  if (!balance) return "N/A";

  const entries = Object.entries(balance);
  if (entries.length === 0) return "0";

  return entries.map(([currency, amount]) => (
    <span
      key={currency}
      className="block"
    >{`${formatNum(Number(amount))} ${currency}`}</span>
  ));
}

/**
 * Loading state component for account last entries table
 */
function AccountLastEntriesLoadingState() {
  const { t } = useTranslations();
  return (
    <div>
      <h3 className="flex items-center gap-2 text-lg font-semibold mb-2">
        <Activity className="h-5 w-5" />
        {t("page.statistics.accountLastEntries")}
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        {t("common.loadingData")}
      </p>
      <div className="overflow-hidden w-full">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="whitespace-nowrap px-2 sm:px-3 py-1.5 sm:py-2 text-muted-foreground text-xs sm:text-sm">
                  {t("component.searchControls.account")}
                </TableHead>
                <TableHead className="whitespace-nowrap px-2 sm:px-3 py-1.5 sm:py-2 text-muted-foreground text-xs sm:text-sm">
                  {t("page.statistics.lastEntryDate")}
                </TableHead>
                <TableHead className="text-right whitespace-nowrap px-2 sm:px-3 py-1.5 sm:py-2 text-muted-foreground text-xs sm:text-sm">
                  {t("journal.balance")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-3 sm:h-4 w-32 sm:w-48" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-3 sm:h-4 w-20 sm:w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-3 sm:h-4 w-20 sm:w-24 ml-auto" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

/**
 * Error state component for account last entries
 */
function AccountLastEntriesErrorState({ message }: { message: string }) {
  const { t } = useTranslations();
  return (
    <div>
      <h3 className="flex items-center gap-2 text-lg font-semibold mb-2">
        <AlertCircle className="h-5 w-5" />
        {t("page.statistics.error")}
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        {t("page.statistics.failedToLoadAccountEntries")}
      </p>
      <div className="flex items-center justify-center py-12 border rounded-md">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            {t("common.failedToLoadData")}
          </h3>
          <p className="text-muted-foreground">{message}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Account last entries table component
 */
function AccountLastEntriesTable({
  data,
}: {
  data: GetLedgerAccountLastEntriesQuery;
}) {
  const { t } = useTranslations();
  const formatNum = useFormatNumber();
  const navigate = useNavigate();
  const { ledgerOwner, ledgerName } = useParams({
    from: "/ledger/$ledgerOwner/$ledgerName/statistics",
  });
  const entries = data.getLedgerAccountLastEntries;

  return (
    <div>
      <h3 className="flex items-center gap-2 text-lg font-semibold mb-2">
        <Activity className="h-5 w-5" />
        {t("page.statistics.accountLastEntries")}
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        {t("page.statistics.accountLastEntriesDescription", {
          count: entries.length,
          accounts: t("journal.accounts"),
        })}
      </p>
      <div className="overflow-hidden w-full">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="whitespace-nowrap px-2 sm:px-3 py-1.5 sm:py-2 text-muted-foreground text-xs sm:text-sm">
                  {t("component.searchControls.account")}
                </TableHead>
                <TableHead className="whitespace-nowrap px-2 sm:px-3 py-1.5 sm:py-2 text-muted-foreground text-xs sm:text-sm">
                  {t("page.statistics.lastEntryDate")}
                </TableHead>
                <TableHead className="text-right whitespace-nowrap px-2 sm:px-3 py-1.5 sm:py-2 text-muted-foreground text-xs sm:text-sm">
                  {t("journal.balance")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.account}>
                  <TableCell
                    className="font-medium font-mono text-xs sm:text-sm break-all max-w-[200px] sm:max-w-none text-primary hover:text-primary/80 cursor-pointer px-2 sm:px-3 py-1.5 sm:py-2"
                    onClick={() => {
                      void navigate({
                        to: "/ledger/$ledgerOwner/$ledgerName/account/$accountName",
                        params: {
                          ledgerOwner: ledgerOwner,
                          ledgerName: ledgerName,
                          accountName: entry.account,
                        },
                      });
                    }}
                  >
                    {entry.account}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs sm:text-sm whitespace-nowrap px-2 sm:px-3 py-1.5 sm:py-2">
                    {formatDateISO(entry.date) || "N/A"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs sm:text-sm whitespace-nowrap px-2 sm:px-3 py-1.5 sm:py-2">
                    {formatBalance(entry.balance, formatNum)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

/**
 * Account Last Entries Component
 * Self-contained component that fetches and displays account last entry information
 */
export function AccountLastEntries({ ledgerId }: { ledgerId: string }) {
  const ledgerFilters = useLedgerSearchParams();
  const formatError = useErrorMessage();

  const { data, loading, error } = useQuery<
    GetLedgerAccountLastEntriesQuery,
    GetLedgerAccountLastEntriesQueryVariables
  >(GetLedgerAccountLastEntriesDocument, {
    variables: {
      ledgerId: ledgerId,
      time: ledgerFilters.searchParams.time,
      filter: ledgerFilters.searchParams.filter,
      account: ledgerFilters.searchParams.account,
    },
    skip: !ledgerId,
  });

  if (loading) {
    return <AccountLastEntriesLoadingState />;
  }

  if (error) {
    return <AccountLastEntriesErrorState message={formatError(error)} />;
  }

  if (!data) {
    return null;
  }

  return <AccountLastEntriesTable data={data} />;
}
