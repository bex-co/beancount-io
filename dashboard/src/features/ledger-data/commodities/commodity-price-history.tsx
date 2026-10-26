import { useId } from "react";
import { Button } from "@/common/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table";
import type { CommodityPairWithPrices } from "@/graphql/definitions";
import { useTranslations } from "@/common/hooks/use-translations";
import { Amount } from "@/common/components/amount";
import { commodityPairLabel } from "./commodity-pair-label";

/**
 * A pair's dated prices behind a disclosure. Whether it is open belongs to
 * the Commodities page, above the loading branch that replaces these cards
 * while a refresh reads, so an opened history stays open (w4/1097).
 */
export function CommodityPriceHistory({
  commodity,
  open,
  onOpenChange,
}: {
  commodity: CommodityPairWithPrices;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslations();
  const tableId = useId();
  const pairLabel = commodityPairLabel(commodity);

  return (
    <div className="mt-3 space-y-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        // The label carries the full pair name, which is long enough to exceed a
        // narrow card. Let it wrap instead of forcing the card wider than its
        // column; `size="sm"` pins `h-8`, so the height has to come from padding.
        className="h-auto max-w-full min-h-8 py-1.5 text-left break-words whitespace-normal"
        aria-expanded={open}
        aria-controls={tableId}
        onClick={() => onOpenChange(!open)}
      >
        {open
          ? t("page.commodities.hidePriceHistory", { pair: pairLabel })
          : t("page.commodities.showPriceHistory", { pair: pairLabel })}
      </Button>
      {open ? (
        <div id={tableId} className="max-h-56 overflow-auto rounded-md border">
          {/* `tableId` above names the disclosure's region, not the table. */}
          <Table aria-label={pairLabel}>
            <TableHeader>
              <TableRow>
                <TableHead>{t("page.commodities.priceHistoryDate")}</TableHead>
                <TableHead className="text-right">
                  {t("page.commodities.priceHistoryPrice", {
                    quote: commodity.quote,
                  })}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commodity.prices.map((price) => (
                <TableRow key={`${price.date}-${price.value}`}>
                  <TableCell className="font-mono text-xs tabular-nums">
                    {price.date}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs tabular-nums">
                    {/* Sign before digits on a right-to-left page (w4/1055). */}
                    <Amount>{price.value}</Amount>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}
    </div>
  );
}
