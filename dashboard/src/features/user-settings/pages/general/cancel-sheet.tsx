import { useId, useState } from "react";
import { Button } from "@/common/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/common/components/ui/dialog";
import type { TierQuota } from "@/common/hooks/use-all-tier-quotas";
import { tierInfoByKey, TIERS } from "@/common/lib/subscription/tier-config";
import { CancellationReason } from "@/graphql/definitions";
import {
  cyclePrice,
  monthlyEquivalent,
  type BillingCycle,
  type SubscriptionTier,
} from "./stripe-config";
import { describeTierQuota } from "./tier-quota-summary";
import type { Translate } from "./plan-change-format";
import { useBillingDateFormat, useMoneyFormat } from "./use-money-format";
import { useFormatCount } from "@/common/hooks/use-format-count";

const REASONS: { value: CancellationReason; labelKey: string }[] = [
  {
    value: CancellationReason.TooExpensive,
    labelKey: "userSettings.cancelReasonTooExpensive",
  },
  {
    value: CancellationReason.MissingFeatures,
    labelKey: "userSettings.cancelReasonMissingFeatures",
  },
  {
    value: CancellationReason.Unused,
    labelKey: "userSettings.cancelReasonUnused",
  },
  {
    value: CancellationReason.SwitchedService,
    labelKey: "userSettings.cancelReasonSwitchedService",
  },
  {
    value: CancellationReason.Other,
    labelKey: "userSettings.cancelReasonOther",
  },
];

/**
 * Before a subscription is cancelled (PRFAQ005 question 15): what the reader
 * keeps and until when, the Free limits afterwards, that nothing is deleted,
 * one cheaper alternative, an optional reason, and equally weighted
 * **Cancel subscription** and **Keep <plan>**.
 */
export function CancelSheet({
  planName,
  tier,
  cycle,
  endsAt,
  freeQuota,
  busy,
  t,
  onConfirm,
  onKeep,
  onAlternative,
}: {
  /** The current plan's name, e.g. "Growth". */
  planName: string;
  /** The current paid tier; null for a plan without a subscription key. */
  tier: SubscriptionTier | null;
  cycle: BillingCycle | null;
  endsAt: string | null;
  freeQuota: TierQuota | undefined;
  busy: boolean;
  t: Translate;
  onConfirm: (reason: CancellationReason | null) => void;
  onKeep: () => void;
  onAlternative: (target: {
    tier: SubscriptionTier;
    cycle: BillingCycle;
  }) => void;
}) {
  const formatDate = useBillingDateFormat();
  const formatMoney = useMoneyFormat();
  const formatCount = useFormatCount();
  const reasonName = useId();
  const [reason, setReason] = useState<CancellationReason | null>(null);

  // One alternative: yearly for a monthly plan, else the next tier down
  // from Growth up.
  const lower = tier
    ? TIERS.find((each) => each.rank === tierInfoByKey(tier).rank - 1)
    : undefined;
  const alternative =
    tier && cycle === "monthly"
      ? {
          label: t("userSettings.cancelSheetSwitchToYearly", {
            price: formatMoney(
              monthlyEquivalent(cyclePrice(tier, "yearly").amount, "yearly"),
            ),
          }),
          target: { tier, cycle: "yearly" as const },
        }
      : lower && cycle
        ? {
            label: t("userSettings.cancelSheetDowngradeTo", {
              plan: t(lower.labelKey),
            }),
            target: { tier: lower.key, cycle },
          }
        : null;

  return (
    // While the request runs, leaving would not stop the cancellation.
    <Dialog open onOpenChange={(next) => !next && !busy && onKeep()}>
      <DialogContent data-testid="cancel-sheet">
        <DialogHeader>
          <DialogTitle>
            {t("userSettings.cancelSheetTitle", { plan: planName })}
          </DialogTitle>
          <DialogDescription>
            {t("userSettings.cancelSheetKeepUntil", {
              plan: planName,
              date: endsAt ? formatDate(endsAt) : "",
              limits: freeQuota
                ? describeTierQuota(freeQuota, t, formatCount)
                : "",
            })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            {t("userSettings.cancelSheetPlainText")}
          </p>
          {alternative && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold">
                {t("userSettings.cancelSheetOtherOptions")}
              </p>
              <Button
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={() => onAlternative(alternative.target)}
              >
                {alternative.label}
              </Button>
            </div>
          )}
          <fieldset className="space-y-1.5">
            <legend className="mb-1 text-xs font-semibold">
              {t("userSettings.cancelSheetReason")}
            </legend>
            {REASONS.map((option) => (
              <label key={option.value} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={reasonName}
                  checked={reason === option.value}
                  onChange={() => setReason(option.value)}
                />
                <span>{t(option.labelKey)}</span>
              </label>
            ))}
          </fieldset>
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            disabled={busy}
            aria-busy={busy}
            onClick={() => onConfirm(reason)}
          >
            {busy
              ? t("userSettings.canceling")
              : t("userSettings.cancelSubscription")}
          </Button>
          <Button variant="outline" disabled={busy} onClick={onKeep}>
            {t("userSettings.planChangeKeep", { plan: planName })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
