import { useId, useState } from "react";
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

export function CommodityPriceHistory({
  commodity,
}: {
  commodity: CommodityPairWithPrices;
}) {
  const { t } = useTranslations();
  const [open, setOpen] = useState(false);
  const tableId = useId();
  const pairLabel = `${commodity.base}/${commodity.quote}`;

  return (
    <div className="mt-3 space-y-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-expanded={open}
        aria-controls={tableId}
        onClick={() => setOpen((value) => !value)}
      >
        {open
          ? t("page.commodities.hidePriceHistory", { pair: pairLabel })
          : t("page.commodities.showPriceHistory", { pair: pairLabel })}
      </Button>
      {open ? (
        <div id={tableId} className="max-h-56 overflow-auto rounded-md border">
          <Table>
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
                    {price.value}
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
