import { useMemo } from "react";
import { useQuery } from "@apollo/client/react";
import { GetLedgerOverviewDocument } from "@/graphql/definitions";
import { Alert, AlertDescription } from "@/common/components/ui/alert";
import { useTranslations } from "@/common/hooks/use-translations";
import { getErrorMessageKey } from "@/common/lib/errors/error-message";
import type { AccountMetaMap } from "@/features/reports/cash-flow/lib/model";
import { overviewQueryDefaults } from "../constants";
import { dayBeforeTimeFilter, hierarchyChange } from "../lib/hierarchy-change";
import CashFlowSankey from "./cash-flow-sankey";

/**
 * Where the selected month's money went. The page's own read covers the whole
 * filtered range; this one asks for the month alone, so the flows answer for
 * the same month as the cards. It is Money movement's default view, so the
 * month's reads start with the page; a month read once is cached.
 *
 * Income and spending come back as the month's totals, but assets and
 * liabilities as its closing balances, everything before carried in. Their
 * month is the difference from the day before it began: what was bought or
 * borrowed, not everything held.
 */
export function MonthCashFlow({
  ledgerId,
  account,
  filter,
  time,
  primaryCurrency,
  accountMeta,
  accountMetaPending,
}: {
  ledgerId: string;
  account: string;
  filter: string;
  /** The selected month as a time filter, already narrowed to the page's. */
  time: string;
  primaryCurrency: string;
  accountMeta?: AccountMetaMap;
  accountMetaPending?: boolean;
}) {
  const { t } = useTranslations();
  const scope = { ledgerId, account, filter, ...overviewQueryDefaults };
  const month = useQuery(GetLedgerOverviewDocument, {
    variables: { ...scope, time },
    fetchPolicy: "cache-first",
  });
  const openingDay = dayBeforeTimeFilter(time);
  const opening = useQuery(GetLedgerOverviewDocument, {
    variables: { ...scope, time: openingDay ?? "" },
    skip: openingDay === null,
    fetchPolicy: "cache-first",
  });
  const closing = month.data?.getLedgerOverview;
  const before = openingDay ? opening.data?.getLedgerOverview : null;
  const moved = useMemo(
    () => ({
      assets: hierarchyChange(
        closing?.assetsHierarchyData,
        before?.assetsHierarchyData,
      ),
      liabilities: hierarchyChange(
        closing?.liabilitiesHierarchyData,
        before?.liabilitiesHierarchyData,
      ),
    }),
    [closing, before],
  );

  const error = month.error ?? opening.error;
  if (error && (!closing || (openingDay && !before))) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{t(getErrorMessageKey(error))}</AlertDescription>
      </Alert>
    );
  }
  // A month not read yet is not an empty month: hold the space.
  const loading = !closing || (openingDay !== null && !before);

  return (
    <CashFlowSankey
      incomeHierarchyData={closing?.incomeHierarchyData ?? undefined}
      expensesHierarchyData={closing?.expensesHierarchyData ?? undefined}
      assetsHierarchyData={moved.assets}
      liabilitiesHierarchyData={moved.liabilities}
      accountMeta={accountMeta}
      primaryCurrency={primaryCurrency}
      accountMetaPending={accountMetaPending || loading}
      pendingLabel={accountMetaPending ? undefined : t("page.overview.loading")}
    />
  );
}
