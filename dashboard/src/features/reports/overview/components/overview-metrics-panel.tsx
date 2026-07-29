import { Card, CardHeader, CardTitle } from "@/common/components/ui/card";
import { getChartColors } from "@/common/lib/chart/color";
import { useTranslations } from "@/common/hooks/use-translations";
import { type DataSeries } from "../lib/overview-utils";
import { OverviewStatCard } from "./overview-stat-card";

export function OverviewMetricsPanel({
  assetsData,
  liabilitiesData,
  incomeData,
  expensesData,
  currency,
  inverted,
}: {
  assetsData: DataSeries;
  liabilitiesData: DataSeries;
  incomeData: DataSeries;
  expensesData: DataSeries;
  currency: string;
  inverted: boolean;
}) {
  const { t } = useTranslations();
  const [, c1, c2, c3, c4] = getChartColors();

  return (
    <Card className="h-full gap-0 overflow-hidden py-0">
      <CardHeader className="border-b py-5">
        <CardTitle>{t("page.accounts.accounts")}</CardTitle>
      </CardHeader>
      <div className="grid flex-1 divide-y divide-border">
        <OverviewStatCard
          variant="row"
          dotColor={c1}
          label={t("common.assets")}
          dataSeries={assetsData}
          currency={currency}
        />
        <OverviewStatCard
          variant="row"
          dotColor={c2}
          label={t("common.liabilities")}
          dataSeries={liabilitiesData}
          currency={currency}
          inverted={inverted}
        />
        <OverviewStatCard
          variant="row"
          dotColor={c3}
          label={t("common.income")}
          dataSeries={incomeData}
          currency={currency}
          inverted={inverted}
        />
        <OverviewStatCard
          variant="row"
          dotColor={c4}
          label={t("common.expenses")}
          dataSeries={expensesData}
          currency={currency}
        />
      </div>
    </Card>
  );
}
