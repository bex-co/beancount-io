import { PageHeader } from "@/common/components/page-header";
import { RelatedLinks } from "@/common/components/related-links";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { TrendingUp } from "lucide-react";
import { ReactECharts } from "@/common/components/react-echarts";
import { defaultSplitLine } from "@/common/components/react-echarts/utils";
import type { EChartsOption, TooltipComponentOption } from "echarts";
import { useParams } from "@tanstack/react-router";
import { useQuery } from "@apollo/client/react";
import { GetLedgerCommoditiesDocument } from "@/graphql/definitions";
import type { CommodityPairWithPrices } from "@/graphql/definitions";
import { getPrimaryColor, opacity } from "@/common/lib/chart/color";
import { formatDateISO } from "@/common/lib/format/format-date-iso";
import { formatDateAxis } from "@/common/lib/chart/chart";
import { createLedgerId } from "@/common/lib/utils/encode";
import { useTranslations } from "@/common/hooks/use-translations";
import { EmptyState } from "@/common/components/empty-state";
import { QueryView } from "@/common/components/query-view";
import { useLedger } from "@/common/hooks/use-ledger";
import { LedgerPageSEO } from "@/common/components/seo/ledger-page-seo";
import { Skeleton } from "@/common/components/ui/skeleton";

/**
 * Commodity chart component
 * Displays a line chart for a single commodity pair
 */
function CommodityChart({ commodity }: { commodity: CommodityPairWithPrices }) {
  // Extract dates as strings for category axis
  const dates = commodity.prices.map((point) => point.date);

  // Prepare chart data as [date, value] pairs
  const chartData = commodity.prices.map((point) => [
    point.date,
    parseFloat(point.value),
  ]);

  const tooltip: TooltipComponentOption = {
    trigger: "axis" as const,
    formatter: function (params) {
      const data = Array.isArray(params) ? params[0] : params;

      if (!data) {
        return "";
      }

      // With category type, the date is in the name property
      const dateStr = data.name as string;
      if (!dateStr) {
        return "";
      }

      // Extract price value
      let price: number;
      if (Array.isArray(data.value) && data.value.length >= 2) {
        price =
          typeof data.value[1] === "number"
            ? data.value[1]
            : parseFloat(data.value[1] as string);
      } else if (typeof data.value === "number") {
        price = data.value;
      } else {
        return "";
      }

      const date = formatDateISO(dateStr);
      const value = price.toFixed(2);
      const expr = `${commodity.base}/${commodity.quote}`;
      return `${date}<br/>${expr}: ${value}`;
    },
  };

  const primaryColor = getPrimaryColor();

  const option: EChartsOption = {
    tooltip,
    xAxis: {
      type: "category" as const,
      data: dates,
      axisLabel: {
        formatter: function (value: string) {
          return formatDateAxis(value, "monthly");
        },
      },
      axisPointer: {
        snap: true,
      },
    },
    yAxis: {
      type: "value" as const,
      axisLabel: {
        formatter: function (value: number) {
          return value.toFixed(2);
        },
      },
      min: ({ min }) => (min > 0 ? min * 0.8 : min * 1.1),
      max: ({ max }) => (max > 0 ? max * 1.1 : max * 0.9),
      splitLine: defaultSplitLine,
    },
    series: [
      {
        name: `${commodity.base}/${commodity.quote}`,
        type: "line" as const,
        data: chartData,
        showSymbol: false,
        smooth: true,
        lineStyle: {
          width: 2,
        },
        itemStyle: {
          // color: "#3b82f6",
          color: primaryColor,
        },
        areaStyle: {
          color: {
            type: "linear" as const,
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              {
                offset: 0,
                color: opacity(primaryColor, 0.3),
              },
              {
                offset: 1,
                color: opacity(primaryColor, 0.05),
              },
            ],
          },
        },
      },
    ],
    grid: {
      top: "10px",
      left: "0%",
      right: "0%",
      bottom: "5px",
      containLabel: true,
    },
  };

  return (
    <div className={"h-[250px]"}>
      <ReactECharts option={option} style={{ height: "100%" }} />
    </div>
  );
}

/**
 * Commodities page component
 * This page shows commodity information and prices
 */
export default function LedgerCommoditiesPage() {
  const { t } = useTranslations();
  const { ledgerOwner, ledgerName } = useParams({
    from: "/ledger/$ledgerOwner/$ledgerName/commodities",
  });
  const ledgerId = createLedgerId(ledgerOwner, ledgerName);
  const { ledgerName: ledgerDisplayName } = useLedger();
  const {
    data,
    loading: isLoading,
    error,
  } = useQuery(GetLedgerCommoditiesDocument, {
    variables: {
      ledgerId: ledgerId,
    },
    skip: !ledgerId,
  });

  const commodities = data?.getLedgerCommodities;

  return (
    <div className="space-y-4">
      <LedgerPageSEO seoKey="ledgerCommodities" />
      <PageHeader
        title={t("page.commodities.commodities")}
        description={t("common.pageDescription.commodities", {
          ledgerName: ledgerDisplayName ?? ledgerName,
        })}
      />
      <QueryView
        loading={isLoading}
        error={error}
        data={commodities}
        loadingSlot={
          <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-[250px] w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        }
        errorMessage={t("page.commodities.failedToLoadCommodities")}
        isEmpty={(c) => c.length === 0}
        emptySlot={
          <EmptyState
            iconName="Coins"
            title={t("page.commodities.noCommoditiesFound")}
            description={t("page.commodities.noCommoditiesFoundDescription")}
          />
        }
      >
        {(c) => (
          <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
            {c.map((commodity, index) => (
              <Card key={`${commodity.base}-${commodity.quote}-${index}`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    {commodity.base}/{commodity.quote}
                  </CardTitle>
                  <CardDescription>
                    {t("page.commodities.priceHistoryDataPoints", {
                      count: commodity.prices.length,
                    })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CommodityChart commodity={commodity} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </QueryView>

      <RelatedLinks
        links={[
          {
            label: t("common.relatedLinks.holdings"),
            to: `/ledger/${ledgerOwner}/${ledgerName}/holdings`,
          },
          {
            label: t("common.relatedLinks.statistics"),
            to: `/ledger/${ledgerOwner}/${ledgerName}/statistics`,
          },
          {
            label: t("common.relatedLinks.overview"),
            to: `/ledger/${ledgerOwner}/${ledgerName}`,
          },
        ]}
      />
    </div>
  );
}
