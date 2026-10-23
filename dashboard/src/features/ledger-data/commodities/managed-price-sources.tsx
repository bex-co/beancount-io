import { useApolloClient, useMutation, useQuery } from "@apollo/client/react";
import { RefreshCw, Rss } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/common/components/ui/alert";
import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { usePendingAction } from "@/common/hooks/use-pending-action";
import { useTranslations } from "@/common/hooks/use-translations";
import { formatDateTime } from "@/common/lib/format";
import {
  GetLedgerCommoditiesDocument,
  GetLedgerManagedPricesDocument,
  RefreshLedgerManagedPricesDocument,
  type ManagedPriceSourceFieldsFragment,
} from "@/graphql/definitions";
import { commodityPairLabel } from "./commodity-pair-label";

type Freshness = "recent" | "stale" | "unavailable";

const FRESHNESS_BADGE: Record<
  Freshness,
  { variant: "secondary" | "outline" | "destructive"; label: string }
> = {
  recent: { variant: "secondary", label: "page.commodities.freshness.recent" },
  stale: { variant: "outline", label: "page.commodities.freshness.stale" },
  unavailable: {
    variant: "destructive",
    label: "page.commodities.freshness.unavailable",
  },
};

// `freshness` is a plain string on the wire; anything unexpected reads as the
// state that asks the user to look, never as "up to date".
function freshnessOf(source: ManagedPriceSourceFieldsFragment): Freshness {
  return source.freshness in FRESHNESS_BADGE
    ? (source.freshness as Freshness)
    : "unavailable";
}

function ManagedPriceSourceRow({
  source,
}: {
  source: ManagedPriceSourceFieldsFragment;
}) {
  const { t } = useTranslations();
  const badge = FRESHNESS_BADGE[freshnessOf(source)];
  const pair =
    source.commodity && source.quote
      ? commodityPairLabel({ base: source.commodity, quote: source.quote })
      : source.alias;
  const observed = formatDateTime(source.observedAt);
  const nextRefresh = formatDateTime(source.nextRefreshAt);

  return (
    <li className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{pair}</span>
        <Badge variant={badge.variant}>{t(badge.label)}</Badge>
        {source.source && (
          <span className="text-muted-foreground text-xs">{source.source}</span>
        )}
      </div>
      <div className="text-muted-foreground flex flex-wrap gap-x-4 text-xs">
        <span>
          {observed
            ? t("page.commodities.observedAt", { time: observed })
            : t("page.commodities.neverObserved")}
        </span>
        {nextRefresh && (
          <span>
            {t("page.commodities.nextRefreshAt", { time: nextRefresh })}
          </span>
        )}
      </div>
      {source.error && (
        <p className="text-destructive text-xs break-words">
          {t("page.commodities.lastError", { error: source.error })}
        </p>
      )}
    </li>
  );
}

/**
 * Prices the ledger includes from a managed feed (ADR 015): each source's
 * freshness, when it was last observed and next refreshes, and a refresh
 * action for writers. Renders nothing for a ledger with no managed include,
 * and nothing while loading or on error — it is an annotation on the price
 * charts below, which report their own failures.
 */
export function ManagedPriceSources({
  ledgerId,
  canWrite,
}: {
  ledgerId: string;
  canWrite: boolean;
}) {
  const { t } = useTranslations();
  const client = useApolloClient();
  const { data } = useQuery(GetLedgerManagedPricesDocument, {
    variables: { ledgerId },
    skip: !ledgerId,
  });
  const [refresh] = useMutation(RefreshLedgerManagedPricesDocument, {
    variables: { ledgerId },
    // The mutation returns the status records themselves; the records carry
    // no id, so write them into the status query rather than refetch it.
    update: (cache, { data: result }) => {
      if (!result) return;
      cache.writeQuery({
        query: GetLedgerManagedPricesDocument,
        variables: { ledgerId },
        data: { getLedgerManagedPrices: result.refreshLedgerManagedPrices },
      });
    },
  });
  // A new revision changes the prices the charts plot, not just the status.
  // Reading them again is a separate step: awaited inside the refresh, a
  // failed read reported the acknowledged refresh as failed (w4/332). The
  // charts keep what they show, and Reload charts repeats only that read.
  const [chartsReloadFailed, setChartsReloadFailed] = useState(false);
  const { run: runReload, pending: reloading } = usePendingAction();
  const { run: runRefresh, pending: refreshing } = usePendingAction();
  const refreshButton = useRef<HTMLButtonElement>(null);
  const reloadCharts = () =>
    client
      .query({
        query: GetLedgerCommoditiesDocument,
        variables: { ledgerId },
        fetchPolicy: "network-only",
      })
      .then(
        () => {
          setChartsReloadFailed(false);
          return true;
        },
        () => {
          setChartsReloadFailed(true);
          return false;
        },
      );

  const sources = data?.getLedgerManagedPrices ?? [];
  if (sources.length === 0) return null;

  // One refresh at a time. The button stays on the card, so whatever the
  // refresh ends in, it gets focus back for the next action (w4/992).
  const onRefresh = () =>
    runRefresh(async () => {
      try {
        await refresh();
      } catch {
        toast.error(t("page.commodities.refreshPricesFailed"));
        return;
      }
      await reloadCharts();
    });

  // Reload charts leaves with its alert; hand focus to the card's action.
  const onReloadCharts = () =>
    runReload(async () => {
      const landed = await reloadCharts();
      if (landed) refreshButton.current?.focus();
      return landed;
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rss className="h-4 w-4" />
          {t("page.commodities.managedSources")}
        </CardTitle>
        <CardDescription>
          {t("page.commodities.managedSourcesDescription")}
        </CardDescription>
        {canWrite && (
          <CardAction>
            <Button
              ref={refreshButton}
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={refreshing ? "animate-spin" : undefined} />
              {refreshing
                ? t("page.commodities.refreshingPrices")
                : t("page.commodities.refreshPrices")}
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {chartsReloadFailed && (
          <Alert>
            <AlertDescription className="flex flex-wrap items-center gap-2">
              <span>{t("page.commodities.chartsReloadFailed")}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={onReloadCharts}
                disabled={reloading}
              >
                <RefreshCw className={reloading ? "animate-spin" : undefined} />
                {t("page.commodities.reloadCharts")}
              </Button>
            </AlertDescription>
          </Alert>
        )}
        <ul className="divide-y">
          {sources.map((source) => (
            <ManagedPriceSourceRow key={source.url} source={source} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
