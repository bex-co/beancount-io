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
import { BarChart3, AlertCircle } from "lucide-react";
import {
  GetLedgerEntriesCountPerTypeDocument,
  type GetLedgerEntriesCountPerTypeQuery,
  type GetLedgerEntriesCountPerTypeQueryVariables,
} from "@/graphql/definitions";
import { useLedgerSearchParams } from "@/common/hooks/use-ledger-search-params";
import { useTranslations } from "@/common/hooks/use-translations";
import { useErrorMessage } from "@/common/lib/errors/error-message";
import { useFormatNumber } from "@/common/hooks/use-format-number";

/**
 * Loading state component for entries count table
 */
function EntriesCountLoadingState() {
  const { t } = useTranslations();
  return (
    <div>
      <h3 className="flex items-center gap-2 text-lg font-semibold mb-2">
        <BarChart3 className="h-5 w-5" />
        {t("page.statistics.entriesCountByType")}
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        {t("page.statistics.loadingEntryStatistics")}
      </p>
      <div className="overflow-hidden w-full">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="whitespace-nowrap px-2 sm:px-3 py-1.5 sm:py-2 text-muted-foreground text-xs sm:text-sm">
                  {t("page.statistics.entryType")}
                </TableHead>
                <TableHead className="text-right whitespace-nowrap px-2 sm:px-3 py-1.5 sm:py-2 text-muted-foreground text-xs sm:text-sm">
                  {t("page.statistics.count")}
                </TableHead>
                <TableHead className="text-right whitespace-nowrap px-2 sm:px-3 py-1.5 sm:py-2 text-muted-foreground text-xs sm:text-sm">
                  {t("page.statistics.percentage")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-3 sm:h-4 w-24 sm:w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-3 sm:h-4 w-12 sm:w-16 ml-auto" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-3 sm:h-4 w-10 sm:w-12 ml-auto" />
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
 * Error state component for entries count
 */
function EntriesCountErrorState({ message }: { message: string }) {
  const { t } = useTranslations();
  return (
    <div>
      <h3 className="flex items-center gap-2 text-lg font-semibold mb-2">
        <AlertCircle className="h-5 w-5" />
        {t("page.statistics.error")}
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        {t("page.statistics.failedToLoadEntriesStatistics")}
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
 * Entries count per type table component
 */
function EntriesCountTable({
  data,
}: {
  data: GetLedgerEntriesCountPerTypeQuery;
}) {
  const { t } = useTranslations();
  const formatNum = useFormatNumber();
  const entries = data.getLedgerEntriesCountPerType;
  const totalCount = entries.reduce((sum, entry) => sum + entry.number, 0);

  return (
    <div>
      <h3 className="flex items-center gap-2 text-lg font-semibold mb-2">
        <BarChart3 className="h-5 w-5" />
        {t("page.statistics.entriesCountByType")}
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        {t("page.statistics.total")} {formatNum(totalCount)}{" "}
        {t("page.statistics.entriesAcrossTypes")} {entries.length}{" "}
        {t("page.statistics.types")}
      </p>
      <div className="overflow-hidden w-full">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="whitespace-nowrap px-2 sm:px-3 py-1.5 sm:py-2 text-muted-foreground text-xs sm:text-sm">
                  {t("page.statistics.entryType")}
                </TableHead>
                <TableHead className="text-right whitespace-nowrap px-2 sm:px-3 py-1.5 sm:py-2 text-muted-foreground text-xs sm:text-sm">
                  {t("page.statistics.count")}
                </TableHead>
                <TableHead className="text-right whitespace-nowrap px-2 sm:px-3 py-1.5 sm:py-2 text-muted-foreground text-xs sm:text-sm">
                  {t("page.statistics.percentage")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => {
                const percentage = ((entry.number / totalCount) * 100).toFixed(
                  1,
                );
                return (
                  <TableRow key={entry.type}>
                    <TableCell className="font-medium text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2">
                      {entry.type}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs sm:text-sm whitespace-nowrap px-2 sm:px-3 py-1.5 sm:py-2">
                      {formatNum(entry.number)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-xs sm:text-sm whitespace-nowrap px-2 sm:px-3 py-1.5 sm:py-2">
                      {percentage}%
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

/**
 * Entries Count by Type Component
 * Self-contained component that fetches and displays entry type statistics
 */
export function EntriesCountByType({ ledgerId }: { ledgerId: string }) {
  const ledgerFilters = useLedgerSearchParams();
  const formatError = useErrorMessage();

  const { data, loading, error } = useQuery<
    GetLedgerEntriesCountPerTypeQuery,
    GetLedgerEntriesCountPerTypeQueryVariables
  >(GetLedgerEntriesCountPerTypeDocument, {
    variables: {
      ledgerId: ledgerId,
      time: ledgerFilters.searchParams.time,
      filter: ledgerFilters.searchParams.filter,
      account: ledgerFilters.searchParams.account,
    },
    skip: !ledgerId,
  });

  if (loading) {
    return <EntriesCountLoadingState />;
  }

  if (error) {
    return <EntriesCountErrorState message={formatError(error)} />;
  }

  if (!data) {
    return null;
  }

  return <EntriesCountTable data={data} />;
}
