import type { ComponentProps, RefObject } from "react";
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

/** A button that opens the customizer; the header's one is its own trigger. */
export function CustomizeButton(props: ComponentProps<typeof Button>) {
  const { t } = useTranslations();
  return (
    <Button variant="outline" size="sm" className="rounded-full" {...props}>
      <Settings2 className="size-4" />
      {t("page.overview.customize")}
    </Button>
  );
}

/**
 * The one customization panel, rendered with the always-present header
 * trigger. Its open state belongs to the page so other entry points (the
 * all-hidden prompt) open this same panel: a panel owned by the prompt was
 * unmounted — and closed — the moment its first switch brought a module back.
 *
 * On close, focus returns to `returnFocus` when that element is still on the
 * page, and to the header trigger otherwise.
 */
export function DashboardCustomizer({
  layout,
  setVisible,
  move,
  reset,
  open,
  onOpenChange,
  returnFocus,
}: {
  layout: DashboardLayout;
  setVisible: (id: DashboardWidgetId, visible: boolean) => void;
  move: (id: DashboardWidgetId, direction: -1 | 1) => void;
  reset: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocus?: RefObject<HTMLElement | null>;
}) {
  const labels = useWidgetLabels();
  const { t } = useTranslations();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <CustomizeButton />
      </SheetTrigger>
      <SheetContent
        className="sm:max-w-md"
        onCloseAutoFocus={(event) => {
          const opener = returnFocus?.current;
          if (opener?.isConnected) {
            event.preventDefault();
            opener.focus();
          }
        }}
      >
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
