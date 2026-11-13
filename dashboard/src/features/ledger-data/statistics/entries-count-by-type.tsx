import { useQuery } from "@apollo/client/react";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table";
import { Skeleton } from "@/common/components/ui/skeleton";
import { BarChart3 } from "lucide-react";
import {
  GetLedgerEntriesCountPerTypeDocument,
  type GetLedgerEntriesCountPerTypeQuery,
  type GetLedgerEntriesCountPerTypeQueryVariables,
} from "@/graphql/definitions";
import { useLedgerSearchParams } from "@/common/hooks/use-ledger-search-params";
import { useTranslations } from "@/common/hooks/use-translations";
import { useFormatPercent } from "@/common/hooks/use-format-percent";
import { useErrorMessage } from "@/common/lib/errors/error-message";
import { useQueryRetry } from "@/common/hooks/use-query-retry";
import { useFormatNumber } from "@/common/hooks/use-format-number";
import { directiveTypeLabel } from "@/common/lib/beancount/directive-type-label";
import { StatisticsErrorState, StatisticsSection } from "./statistics-section";

/**
 * Loading state component for entries count table
 */
function EntriesCountLoadingState() {
  const { t } = useTranslations();
  return (
    <StatisticsSection
      icon={BarChart3}
      title={t("page.statistics.entriesCountByType")}
      description={t("page.statistics.loadingEntryStatistics")}
    >
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
    </StatisticsSection>
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
  const { t, i18n } = useTranslations();
  const formatNum = useFormatNumber();
  // Ordered by the name the reader sees, not the English type name.
  const collator = new Intl.Collator(i18n.language);
  const entries = data.getLedgerEntriesCountPerType
    .map((entry) => ({ ...entry, label: directiveTypeLabel(entry.type, t) }))
    .sort((a, b) => collator.compare(a.label, b.label));
  const totalCount = entries.reduce((sum, entry) => sum + entry.number, 0);
  const formatPercent = useFormatPercent();

  return (
    <StatisticsSection
      icon={BarChart3}
      title={t("page.statistics.entriesCountByType")}
      description={t("page.statistics.entriesByTypeSummary", {
        entries: formatNum(totalCount),
        // Both in the language's digits, not one of each (w2/125).
        types: formatNum(entries.length),
      })}
    >
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
          // An all-zero period (the ledger service zero-fills every
          // directive type) would divide by zero and render "NaN%".
          const percentage =
            totalCount === 0
              ? null
              : formatPercent(entry.number / totalCount, 1);
          return (
            <TableRow key={entry.type}>
              <TableCell className="font-medium text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2">
                {entry.label}
              </TableCell>
              <TableCell className="text-right font-mono text-xs sm:text-sm whitespace-nowrap px-2 sm:px-3 py-1.5 sm:py-2">
                {formatNum(entry.number)}
              </TableCell>
              <TableCell className="text-right text-muted-foreground text-xs sm:text-sm whitespace-nowrap px-2 sm:px-3 py-1.5 sm:py-2">
                {percentage === null ? (
                  <span
                    aria-label={t("page.statistics.percentageNotApplicable")}
                  >
                    —
                  </span>
                ) : (
                  percentage
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </StatisticsSection>
  );
}

/**
 * Entries Count by Type Component
 * Self-contained component that fetches and displays entry type statistics
 */
export function EntriesCountByType({ ledgerId }: { ledgerId: string }) {
  const { t } = useTranslations();
  const ledgerFilters = useLedgerSearchParams();
  const formatError = useErrorMessage();

  const { data, loading, error, refetch } = useQuery<
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

  const { failure, retrying, retry } = useQueryRetry(error, refetch);

  if (failure) {
    return (
      <StatisticsErrorState
        description={t("page.statistics.failedToLoadEntriesStatistics")}
        message={formatError(failure)}
        onRetry={retry}
        retrying={retrying}
      />
    );
  }
  if (loading) {
    return <EntriesCountLoadingState />;
  }

  if (!data) {
    return null;
  }

  return <EntriesCountTable data={data} />;
}
