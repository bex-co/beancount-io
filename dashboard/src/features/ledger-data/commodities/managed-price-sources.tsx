import { useMutation, useQuery } from "@apollo/client/react";
import { RefreshCw, Rss } from "lucide-react";
import { toast } from "sonner";
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
import { useTranslations } from "@/common/hooks/use-translations";
import { formatDateTime } from "@/common/lib/format";
import {
  GetLedgerCommoditiesDocument,
  GetLedgerManagedPricesDocument,
  RefreshLedgerManagedPricesDocument,
  type ManagedPriceSourceFieldsFragment,
} from "@/graphql/definitions";

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
      ? `${source.commodity}/${source.quote}`
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
  const { data } = useQuery(GetLedgerManagedPricesDocument, {
    variables: { ledgerId },
    skip: !ledgerId,
  });
  const [refresh, { loading: refreshing }] = useMutation(
    RefreshLedgerManagedPricesDocument,
    {
      variables: { ledgerId },
      // A new revision changes the prices the charts plot, not just the status.
      refetchQueries: [
        { query: GetLedgerManagedPricesDocument, variables: { ledgerId } },
        { query: GetLedgerCommoditiesDocument, variables: { ledgerId } },
      ],
      awaitRefetchQueries: true,
    },
  );

  const sources = data?.getLedgerManagedPrices ?? [];
  if (sources.length === 0) return null;

  const onRefresh = async () => {
    try {
      await refresh();
    } catch {
      toast.error(t("page.commodities.refreshPricesFailed"));
    }
  };

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
      <CardContent>
        <ul className="divide-y">
          {sources.map((source) => (
            <ManagedPriceSourceRow key={source.url} source={source} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
