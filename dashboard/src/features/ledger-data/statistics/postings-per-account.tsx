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
import { Database, AlertCircle } from "lucide-react";
import {
  GetLedgerPostingsPerAccountDocument,
  type GetLedgerPostingsPerAccountQuery,
  type GetLedgerPostingsPerAccountQueryVariables,
} from "@/graphql/definitions";
import { Link, useParams } from "@tanstack/react-router";
import { useLedgerSearchParams } from "@/common/hooks/use-ledger-search-params";
import { useTranslations } from "@/common/hooks/use-translations";
import { useErrorMessage } from "@/common/lib/errors/error-message";
import { useFormatNumber } from "@/common/hooks/use-format-number";

/**
 * Loading state component for postings per account query
 */
function PostingsPerAccountLoadingState() {
  const { t } = useTranslations();
  return (
    <div>
      <h3 className="flex items-center gap-2 text-lg font-semibold mb-2">
        <Database className="h-5 w-5" />
        {t("page.statistics.postingsPerAccount", {
          account: t("component.searchControls.account"),
        })}
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        {t("page.statistics.loadingQueryResults")}
      </p>
      <div className="overflow-hidden w-full">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="whitespace-nowrap px-2 sm:px-3 py-1.5 sm:py-2 text-muted-foreground text-xs sm:text-sm">
                  {t("component.searchControls.account")}
                </TableHead>
                <TableHead className="text-right whitespace-nowrap px-2 sm:px-3 py-1.5 sm:py-2 text-muted-foreground text-xs sm:text-sm">
                  {t("page.statistics.count")}
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
                    <Skeleton className="h-3 sm:h-4 w-12 sm:w-16 ml-auto" />
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
 * Error state component for postings per account
 */
function PostingsPerAccountErrorState({ message }: { message: string }) {
  const { t } = useTranslations();
  return (
    <div>
      <h3 className="flex items-center gap-2 text-lg font-semibold mb-2">
        <AlertCircle className="h-5 w-5" />
        {t("page.statistics.error")}
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        {t("page.statistics.failedToLoadPostingsData")}
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
 * Postings per account table — filtered Statistics report stream counts.
 */
function PostingsPerAccountTable({
  data,
}: {
  data: GetLedgerPostingsPerAccountQuery;
}) {
  const { t } = useTranslations();
  const formatNum = useFormatNumber();
  const rows = data.getLedgerPostingsPerAccount;
  const { ledgerOwner, ledgerName } = useParams({
    from: "/ledger/$ledgerOwner/$ledgerName/statistics",
  });
  const totalRows = rows.length;

  if (totalRows === 0) {
    return (
      <div>
        <h3 className="flex items-center gap-2 text-lg font-semibold mb-2">
          <Database className="h-5 w-5" />
          {t("page.statistics.postingsPerAccount", {
            account: t("component.searchControls.account"),
          })}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          {t("page.statistics.noDataAvailableForQuery")}
        </p>
        <div className="flex items-center justify-center py-12 border rounded-md">
          <p className="text-muted-foreground">
            {t("page.statistics.noResultsFromQuery")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="flex items-center gap-2 text-lg font-semibold mb-2">
        <Database className="h-5 w-5" />
        {t("page.statistics.postingsPerAccount", {
          account: t("component.searchControls.account"),
        })}
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        {t("page.statistics.entryCountPerAccount")} ({totalRows}{" "}
        {t("journal.accounts")})
      </p>
      <div className="overflow-hidden w-full">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="whitespace-nowrap px-2 sm:px-3 py-1.5 sm:py-2 text-muted-foreground text-xs sm:text-sm">
                  {t("component.searchControls.account")}
                </TableHead>
                <TableHead className="text-right whitespace-nowrap px-2 sm:px-3 py-1.5 sm:py-2 text-muted-foreground text-xs sm:text-sm">
                  {t("page.statistics.count")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.account}>
                  <TableCell className="font-medium font-mono text-xs sm:text-sm break-all max-w-[200px] sm:max-w-none px-2 sm:px-3 py-1.5 sm:py-2">
                    <Link
                      to="/ledger/$ledgerOwner/$ledgerName/account/$accountName"
                      params={{
                        ledgerOwner,
                        ledgerName,
                        accountName: row.account,
                      }}
                      className="text-primary hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                    >
                      {row.account}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs sm:text-sm whitespace-nowrap px-2 sm:px-3 py-1.5 sm:py-2">
                    {formatNum(row.count)}
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
 * Postings per Account Component
 * Self-contained component that fetches and displays postings count per account
 * for the active ledger search filters.
 */
export function PostingsPerAccount({ ledgerId }: { ledgerId: string }) {
  const ledgerFilters = useLedgerSearchParams();
  const formatError = useErrorMessage();

  const { data, loading, error } = useQuery<
    GetLedgerPostingsPerAccountQuery,
    GetLedgerPostingsPerAccountQueryVariables
  >(GetLedgerPostingsPerAccountDocument, {
    variables: {
      ledgerId: ledgerId,
      time: ledgerFilters.searchParams.time,
      filter: ledgerFilters.searchParams.filter,
      account: ledgerFilters.searchParams.account,
    },
    skip: !ledgerId,
  });

  if (loading) {
    return <PostingsPerAccountLoadingState />;
  }

  if (error) {
    return <PostingsPerAccountErrorState message={formatError(error)} />;
  }

  if (!data) {
    return null;
  }

  return <PostingsPerAccountTable data={data} />;
}
