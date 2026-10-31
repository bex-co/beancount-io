import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { ArrowUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/common/components/ui/button";
import { track, type BillingSurface } from "@/common/analytics";
import { announcePlanLanded } from "@/features/user-settings/lib/plan-landed";
import {
  forgetPendingApproval,
  rememberPendingApproval,
} from "@/features/user-settings/lib/approval-return";
import { planValue } from "@/common/lib/subscription/plan-change";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/common/components/ui/dialog";
import type { UserTier } from "@/common/hooks/use-user-limits";
import { useErrorMessage } from "@/common/lib/errors/error-message";
import {
  featuresGained,
  featuresLost,
} from "@/common/lib/subscription/plan-features";
import {
  getTierInfo,
  tierInfoByKey,
} from "@/common/lib/subscription/tier-config";
import type { TierQuota } from "@/common/hooks/use-all-tier-quotas";
import {
  useChangePlan,
  usePreviewPlanChange,
} from "@/features/user-settings/hooks/use-plan-change";
import {
  PlanChangeEffect,
  PlanChangeRefusal,
  type PlanChangeKind,
} from "@/graphql/definitions";
import {
  cyclePrice,
  planForPrice,
  stripePlanConfig,
  type BillingCycle,
  type SubscriptionTier,
} from "./stripe-config";
import { useBillingDateFormat, useMoneyFormat } from "./use-money-format";
import { useQuotaNumberFormat } from "./use-quota-number-format";
import { approveBankPayment } from "./bank-approval";
import {
  nextChargeLine,
  planLabel,
  type Preview,
  type Translate,
} from "./plan-change-format";
import {
  PendingChangeNotes,
  ScheduledChangeBody,
  type SplitChoice,
} from "./scheduled-change-body";
import {
  aiTokensLine,
  collaboratorsLine,
  ledgersLine,
} from "./tier-quota-summary";

/** What `changePlan` reports about the invoice it charged. */
interface ChangeCharge {
  invoiceId?: string | null;
  amountCharged?: number | null;
  currency?: string | null;
}

export interface PlanChangeTarget {
  tier: SubscriptionTier;
  cycle: BillingCycle;
  /** Where the change started, for analytics. */
  surface: BillingSurface;
}

const REFUSAL_KEYS: Record<PlanChangeRefusal, string> = {
  [PlanChangeRefusal.CurrentPlan]: "userSettings.planChangeRefusalCurrent",
  [PlanChangeRefusal.SameTierAndCycle]:
    "userSettings.planChangeRefusalSameTier",
  [PlanChangeRefusal.MultipleSubscriptions]:
    "userSettings.planChangeRefusalMultiple",
  [PlanChangeRefusal.NoSubscription]:
    "userSettings.planChangeRefusalNoSubscription",
  [PlanChangeRefusal.ScheduledChange]: "userSettings.planChangeAtRenewal",
  [PlanChangeRefusal.PastDue]: "userSettings.planChangeRefusalPastDue",
};

type Outcome =
  | { type: "approving" }
  | { type: "action"; hostedInvoiceUrl: string | null }
  | { type: "failed" }
  | { type: "refused"; refusal: PlanChangeRefusal | null };

/**
 * The confirm step for every immediate plan change and every checkout from
 * Billing (PRFAQ005 question 15). It shows what the server previewed — the
 * charge today, the credit, the next charge, the card and what the plan adds —
 * and confirms at the previewed proration time, so the charge equals the
 * preview. A payment the bank must approve is approved here with Stripe.js,
 * or on Stripe's hosted invoice page when Stripe.js cannot run; nothing here
 * reports a pending change as done.
 */
export function PlanChangeSheet({
  target,
  currentTier,
  currentCycle,
  currentPlanLabel,
  quotaByUserTier,
  t,
  onClose,
  onCheckout,
  onManageBilling,
  onChanged,
  returnTo,
  checkoutPending = false,
  ledgersUsed = null,
}: {
  target: PlanChangeTarget | null;
  /** A safe path back to where the prompt was, offered once the change lands. */
  returnTo?: string;
  currentTier: UserTier;
  /** The current subscription's cycle; null without one. */
  currentCycle: BillingCycle | null;
  currentPlanLabel: string;
  quotaByUserTier: Record<string, TierQuota>;
  t: Translate;
  onClose: () => void;
  onCheckout: (target: PlanChangeTarget) => void;
  onManageBilling: () => void;
  /** Refetch the plan: the Refresh button after a bank approval elsewhere. */
  onChanged: () => void;
  /** A Checkout session is being created; confirming again would open two. */
  checkoutPending?: boolean;
  /** Owned ledgers today, set against a lower limit. */
  ledgersUsed?: number | null;
}) {
  const [runPreview, { data, loading, error }] = usePreviewPlanChange();
  const [changePlan, { loading: changing, refetchPlan }] = useChangePlan();
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const formatError = useErrorMessage();
  const formatMoney = useMoneyFormat();
  const formatDate = useBillingDateFormat();
  const formatCount = useQuotaNumberFormat();

  const targetPriceId = target
    ? cyclePrice(target.tier, target.cycle).priceId
    : null;
  const targetInfo = target ? tierInfoByKey(target.tier) : null;
  const changeParams = (
    kind: PlanChangeKind | null,
    cycle: BillingCycle | undefined = target?.cycle,
  ) =>
    target && targetInfo && kind && cycle
      ? {
          kind,
          from: planValue(currentTier, currentCycle),
          to: planValue(targetInfo.userTier, cycle),
          surface: target.surface,
        }
      : null;
  // A preview resolves later, so it reports the plan as Billing then knows
  // it; reading the latest through a ref keeps a refetched plan from
  // re-running the preview.
  const latestChangeParams = useRef(changeParams);
  useLayoutEffect(() => {
    latestChangeParams.current = changeParams;
  });
  const requestPreview = useCallback(() => {
    if (!targetPriceId) return;
    runPreview({
      variables: {
        clientId: stripePlanConfig.clientId,
        priceId: targetPriceId,
      },
    }).then(
      ({ data: response }) => {
        const params = latestChangeParams.current(
          response?.previewPlanChange.kind ?? null,
        );
        if (params) track("plan_change_previewed", params);
      },
      // The hook's error state renders the failure.
      () => {},
    );
  }, [targetPriceId, runPreview]);
  // The parent remounts the sheet per target (`key`), so state starts fresh.
  useEffect(requestPreview, [requestPreview]);
  const preview = () => {
    setOutcome(null);
    requestPreview();
    requestAlternative();
  };

  const planChange: Preview | undefined =
    data?.previewPlanChange.targetPriceId === targetPriceId
      ? data?.previewPlanChange
      : undefined;
  // A higher tier while leaving yearly also offers that tier now on yearly,
  // priced by its own preview.
  const [
    runAlternative,
    {
      data: alternativeData,
      error: alternativeError,
      loading: alternativeLoading,
    },
  ] = usePreviewPlanChange();
  const alternativePriceId =
    planChange?.kind === "SPLIT" ? planChange.alternativePriceId : null;
  const requestAlternative = useCallback(() => {
    if (!alternativePriceId) return;
    runAlternative({
      variables: {
        clientId: stripePlanConfig.clientId,
        priceId: alternativePriceId,
      },
      // The hook's error state renders the failure.
    }).catch(() => {});
  }, [alternativePriceId, runAlternative]);
  useEffect(requestAlternative, [requestAlternative]);
  const alternativeResponse =
    alternativeData?.previewPlanChange.targetPriceId === alternativePriceId
      ? alternativeData?.previewPlanChange
      : undefined;
  const alternative = {
    preview: alternativeResponse?.kind ? alternativeResponse : null,
    // A refused alternative cannot be applied either.
    failed:
      !alternativeLoading &&
      (!!alternativeError ||
        (!!alternativeResponse && !alternativeResponse.kind)),
  };
  // Kept here, not in the body, so a retry after a failed payment keeps it.
  const [splitChoice, setSplitChoice] = useState<SplitChoice>("later");
  const targetLabel = target ? planLabel(t, target.tier, target.cycle) : "";

  /** A change took effect: count its invoice, celebrate, then close. */
  const landed = (charge: ChangeCharge, priceId: string) => {
    announcePlanLanded({ ...charge, priceId }, t, returnTo);
    onClose();
  };

  const approveInPlace = async (
    clientSecret: string,
    charge: ChangeCharge,
    priceId: string,
  ) => {
    // Stripe draws the bank's challenge over the page, where a modal dialog
    // would trap focus and swallow the pointer, so the sheet steps aside.
    setOutcome({ type: "approving" });
    const waiting = toast.loading(t("userSettings.planChangeApproving"));
    // A redirect-only bank method leaves the page; Billing lands it on return.
    rememberPendingApproval(clientSecret, {
      invoiceId: charge.invoiceId ?? null,
      amountCharged: charge.amountCharged ?? null,
      currency: charge.currency ?? null,
      priceId,
      returnTo: returnTo ?? null,
    });
    try {
      return await approveBankPayment(
        clientSecret,
        new URL("/settings/billing", window.location.origin).href,
      );
    } finally {
      forgetPendingApproval();
      toast.dismiss(waiting);
    }
  };

  /** Confirm the previewed change, or a split's "now" alternative. */
  const confirm = async (chosen = planChange) => {
    if (!target || !planChange || !chosen) return;
    // A split stays a split in analytics; only the plan it lands on differs.
    const params = changeParams(
      planChange.kind,
      planForPrice(chosen.targetPriceId)?.cycle,
    );
    if (params) track("plan_change_confirmed", params);
    if (chosen.kind === "NEW") {
      onCheckout(target);
      return;
    }
    try {
      const response = await changePlan({
        variables: {
          clientId: stripePlanConfig.clientId,
          priceId: chosen.targetPriceId,
          prorationDate: chosen.prorationDate,
        },
      });
      const result = response.data?.changePlan;
      if (result?.status === "SCHEDULED") {
        if (params) track("plan_change_scheduled", params);
        toast.success(
          t("userSettings.planChangeScheduled", {
            date: formatDate(result.effectiveAt ?? chosen.effectiveAt ?? ""),
          }),
        );
        onClose();
      } else if (result?.status === "ACTIVE") {
        landed(result, chosen.targetPriceId);
      } else if (result?.status === "REQUIRES_ACTION") {
        if (params) track("payment_action_required", params);
        const approval = result.clientSecret
          ? await approveInPlace(
              result.clientSecret,
              result,
              chosen.targetPriceId,
            )
          : "unavailable";
        if (approval === "approved") {
          if (params) track("payment_action_completed", params);
          // The plan has taken effect either way: a failed refetch only delays
          // what Billing shows.
          await refetchPlan().catch(() => {});
          landed(result, chosen.targetPriceId);
        } else if (approval === "declined") {
          if (params) track("payment_action_failed", params);
          setOutcome({ type: "failed" });
        } else {
          setOutcome({
            type: "action",
            hostedInvoiceUrl: result.hostedInvoiceUrl ?? null,
          });
        }
      } else if (result?.status === "REFUSED") {
        setOutcome({ type: "refused", refusal: result.refusal ?? null });
      } else {
        if (params && result?.status === "FAILED") {
          track("payment_action_failed", params);
        }
        setOutcome({ type: "failed" });
      }
    } catch (changeError) {
      toast.error(formatError(changeError));
    }
  };

  const refusal =
    outcome?.type === "refused"
      ? (outcome.refusal ?? PlanChangeRefusal.CurrentPlan)
      : (planChange?.refusal ?? null);

  const gained = targetInfo
    ? gainedLines(
        quotaByUserTier[currentTier],
        quotaByUserTier[targetInfo.userTier],
        t,
        formatCount,
      ).concat(
        featuresGained(currentTier, targetInfo.userTier).map((key) => t(key)),
      )
    : [];

  const currentInfo = getTierInfo(currentTier);

  if (!target || !targetInfo) return null;

  return (
    <Dialog
      open={outcome?.type !== "approving"}
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent data-testid="plan-change-sheet">
        <DialogHeader>
          <DialogTitle>
            {t("userSettings.planChangeTitle", { plan: targetLabel })}
          </DialogTitle>
          <DialogDescription>
            {currentPlanLabel} → {targetLabel}
          </DialogDescription>
        </DialogHeader>

        {loading || (!planChange && !error) ? (
          <p role="status" className="flex items-center gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("userSettings.planChangePreviewing")}
          </p>
        ) : error || !planChange ? (
          <div className="space-y-3">
            <p className="text-sm">
              {t("userSettings.planChangePreviewFailed")}
            </p>
            <Button size="sm" variant="outline" onClick={preview}>
              {t("common.tryAgain")}
            </Button>
          </div>
        ) : outcome?.type === "action" ? (
          <div className="space-y-3" data-testid="plan-change-action">
            <p className="text-sm">
              {t("userSettings.planChangeRequiresAction")}
            </p>
            <DialogFooter>
              {outcome.hostedInvoiceUrl && (
                <Button asChild>
                  <a
                    href={outcome.hostedInvoiceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t("userSettings.planChangeApprovePayment")}
                  </a>
                </Button>
              )}
              <Button variant="outline" onClick={onChanged}>
                {t("userSettings.refresh")}
              </Button>
            </DialogFooter>
          </div>
        ) : outcome?.type === "failed" ? (
          <div className="space-y-3" data-testid="plan-change-failed">
            <p className="text-sm">{t("userSettings.planChangeFailed")}</p>
            <DialogFooter>
              <Button onClick={preview}>{t("common.tryAgain")}</Button>
              <Button variant="outline" onClick={onManageBilling}>
                {t("userSettings.planChangeUseAnotherCard")}
              </Button>
            </DialogFooter>
          </div>
        ) : refusal ? (
          <div className="space-y-3">
            <p className="text-sm">{t(REFUSAL_KEYS[refusal])}</p>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                {t("userSettings.planChangeNotNow")}
              </Button>
            </DialogFooter>
          </div>
        ) : planChange.effect === PlanChangeEffect.Scheduled ? (
          <ScheduledChangeBody
            planChange={planChange}
            alternative={alternative}
            splitChoice={splitChoice}
            onSplitChoice={setSplitChoice}
            currentName={currentInfo ? t(currentInfo.labelKey) : ""}
            targetName={t(targetInfo.labelKey)}
            targetCycle={target.cycle}
            lostFeatureKeys={featuresLost(currentTier, targetInfo.userTier)}
            ledgersUsed={ledgersUsed}
            busy={changing}
            t={t}
            onConfirm={(chosen) => void confirm(chosen)}
            onRetryAlternative={requestAlternative}
            onKeep={onClose}
          />
        ) : (
          <div className="space-y-4">
            <p className="text-sm">{t("userSettings.planChangeStartsToday")}</p>
            <PendingChangeNotes planChange={planChange} t={t} />
            <div className="rounded-md border p-3">
              <div className="flex items-baseline justify-between text-sm font-semibold">
                <span>{t("userSettings.planChangeDueToday")}</span>
                <span data-testid="plan-change-due">
                  {formatMoney(planChange.amountDueToday, planChange.currency)}
                </span>
              </div>
              {planChange.creditApplied > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("userSettings.planChangeCredit", {
                    credit: formatMoney(
                      planChange.creditApplied,
                      planChange.currency,
                    ),
                  })}
                </p>
              )}
              {planChange.nextChargeAt && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {nextChargeLine(
                    t,
                    formatMoney,
                    formatDate,
                    planChange,
                    target.cycle,
                  )}
                </p>
              )}
              {planChange.paymentMethod && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("userSettings.planChangeChargedTo", {
                    card: `${planChange.paymentMethod.brand} •••• ${planChange.paymentMethod.last4}`,
                  })}
                </p>
              )}
            </div>
            {gained.length > 0 && (
              <div>
                <p className="text-xs font-semibold">
                  {t("userSettings.planChangeWhatYouGet")}
                </p>
                <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                  {gained.map((line) => (
                    <li key={line} className="flex items-center gap-1.5">
                      <ArrowUp className="h-3 w-3 text-primary" />
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button
                disabled={changing || checkoutPending}
                onClick={() => void confirm()}
              >
                {planChange.kind === "NEW"
                  ? t("userSettings.planChangeContinueToCheckout")
                  : t("userSettings.planChangePayAndSwitch", {
                      amount: formatMoney(
                        planChange.amountDueToday,
                        planChange.currency,
                      ),
                    })}
              </Button>
              <Button variant="outline" onClick={onClose}>
                {t("userSettings.planChangeNotNow")}
              </Button>
            </DialogFooter>
            {planChange.kind !== "NEW" && (
              <p className="text-[11px] text-muted-foreground">
                {t("userSettings.planChangeCreditNote")}
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** The quota lines that grow from the current plan to the target plan. */
function gainedLines(
  from: TierQuota | undefined,
  to: TierQuota | undefined,
  t: Translate,
  formatCount: (value: number) => string,
): string[] {
  if (!to) return [];
  const grows = (before: number | undefined, after: number) =>
    after === -1 ? before !== -1 : before !== undefined && after > before;
  const lines: string[] = [];
  if (grows(from?.maxLedgers, to.maxLedgers)) {
    lines.push(ledgersLine(to.maxLedgers, t, formatCount));
  }
  if (grows(from?.maxCollaboratorsPerLedger, to.maxCollaboratorsPerLedger)) {
    lines.push(collaboratorsLine(to.maxCollaboratorsPerLedger, t, formatCount));
  }
  if (grows(from?.aiCfoTokensMax, to.aiCfoTokensMax)) {
    lines.push(aiTokensLine(to.aiCfoTokensMax, t, formatCount));
  }
  return lines;
}
