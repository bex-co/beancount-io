import { toast } from "sonner";
import { celebrate } from "./celebrate";
import { recordPurchase } from "./purchase";
import type { Translate } from "../pages/general/plan-change-format";

/** What took effect: the invoice it charged, if any, and the new price. */
export interface LandedChange {
  invoiceId?: string | null;
  amountCharged?: number | null;
  currency?: string | null;
  priceId: string;
}

/**
 * A plan change took effect: count its invoice, celebrate, and say so,
 * offering the way back to where the prompt was.
 */
export function announcePlanLanded(
  change: LandedChange,
  t: Translate,
  returnTo?: string | null,
): void {
  recordPurchase({
    invoiceId: change.invoiceId,
    amount: change.amountCharged,
    currency: change.currency,
    priceId: change.priceId,
  });
  void celebrate();
  toast.success(
    t("userSettings.subscriptionUpgraded"),
    returnTo
      ? {
          action: {
            label: t("userSettings.backToWork"),
            // A full load, so every query reads the new plan's limits.
            onClick: () => window.location.assign(returnTo),
          },
        }
      : undefined,
  );
}
