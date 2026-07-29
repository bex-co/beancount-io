import { ArrowDown, ArrowUp, RotateCcw, Settings2 } from "lucide-react";
import { Button } from "@/common/components/ui/button";
import { Label } from "@/common/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/common/components/ui/sheet";
import { Switch } from "@/common/components/ui/switch";
import { useTranslations } from "@/common/hooks/use-translations";
import type {
  DashboardLayout,
  DashboardWidgetId,
} from "../hooks/use-dashboard-layout";

function useWidgetLabels(): Record<DashboardWidgetId, string> {
  const { t } = useTranslations();
  return {
    "financial-position": t("page.overview.financialPosition"),
    "money-movement": t("page.overview.moneyMovement"),
    "recent-activity": t("page.overview.recentActivity"),
    "income-expenses": t("page.reports.incomeVsExpenses"),
    "balance-sheet": t("common.balanceSheet"),
    "cash-flow": t("page.overview.cashFlow"),
    readme: t("page.overview.ledgerNotes"),
  };
}

export function DashboardCustomizer({
  layout,
  setVisible,
  move,
  reset,
}: {
  layout: DashboardLayout;
  setVisible: (id: DashboardWidgetId, visible: boolean) => void;
  move: (id: DashboardWidgetId, direction: -1 | 1) => void;
  reset: () => void;
}) {
  const { t } = useTranslations();
  const labels = useWidgetLabels();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-full">
          <Settings2 className="size-4" />
          {t("page.overview.customize")}
        </Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-md">
        <SheetHeader className="border-b pr-12">
          <SheetTitle>{t("page.overview.customize")}</SheetTitle>
          <SheetDescription>
            {t("page.overview.customizeDescription")}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-2 overflow-y-auto px-4">
          {layout.order.map((id, index) => {
            const visible = !layout.hidden.includes(id);
            return (
              <div
                key={id}
                className="flex items-center gap-3 rounded-xl border bg-card p-3"
              >
                <Switch
                  id={`dashboard-widget-${id}`}
                  checked={visible}
                  onCheckedChange={(checked) => setVisible(id, checked)}
                  aria-label={`${t("page.overview.showWidget")}: ${labels[id]}`}
                />
                <Label
                  htmlFor={`dashboard-widget-${id}`}
                  className="min-w-0 flex-1 cursor-pointer truncate"
                >
                  {labels[id]}
                </Label>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    disabled={index === 0}
                    onClick={() => move(id, -1)}
                    aria-label={`${t("page.overview.moveUp")}: ${labels[id]}`}
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    disabled={index === layout.order.length - 1}
                    onClick={() => move(id, 1)}
                    aria-label={`${t("page.overview.moveDown")}: ${labels[id]}`}
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <SheetFooter className="border-t">
          <Button type="button" variant="outline" onClick={reset}>
            <RotateCcw className="size-4" />
            {t("page.overview.resetLayout")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
