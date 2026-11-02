import type { StorePlanOverlap } from "@/features/store-billing/service/plan-switch";
import type Stripe from "stripe";
import { logger } from "@/shared/logger";
import {
  classifyPlanChange,
  PLAN_CHANGE_EFFECT,
  type PlanChangeEffect,
  type PlanChangeKind,
  type PlanChangeRefusal,
  resolveTargetPlan,
} from "../service/plan-change";
import {
  SubscriptionTier,
  TIER_LIMITS,
  type BillingInterval,
  type PlanConfig,
  type TierLimits,
} from "../service/stripe";
import { customerId, expandableId } from "../service/subscription-plan";
import { loadActivePlans, type PlanChangeDeps } from "./current-plan";
import {
  pendingChange,
  type ScheduledChangeView,
} from "./plan-change-schedule";

const previewLogger = logger.child({ module: "plan-change-preview" });

export interface PaymentMethodSummaryView {
  brand: string;
  last4: string;
}

interface PlanLimitChangeView {
  limit: keyof TierLimits;
  from: number;
  to: number;
}

/**
 * What choosing `targetPriceId` would do, computed before any change is made.
 * Amounts are in the currency's minor unit (cents), as Stripe reports them.
 */
export interface PlanChangePreviewView {
  kind: PlanChangeKind | null;
  refusal: PlanChangeRefusal | null;
  effect: PlanChangeEffect | null;
  currentPriceId: string | null;
  targetPriceId: string;
  currency: string;
  amountDueToday: number;
  creditApplied: number;
  nextAmount: number;
  nextChargeAt: Date | null;
  effectiveAt: Date | null;
  /** Unix seconds; `changePlan` must charge at this instant to match. */
  prorationDate: number | null;
  /** For `SPLIT`: the higher tier on the current cycle, to preview as "now". */
  alternativePriceId: string | null;
  limitChanges: PlanLimitChangeView[];
  paymentMethod: PaymentMethodSummaryView | null;
  /** The pending scheduled change this choice would replace, if any. */
  replacesScheduledChange: ScheduledChangeView | null;
  /** A store plan still running beside this purchase (ADR 001 D15). */
  storeOverlap?: StorePlanOverlap | null;
  /** Whether this choice withdraws a pending cancellation. */
  withdrawsCancellation: boolean;
}

const LIMIT_KEYS: readonly (keyof TierLimits)[] = [
  "maxLedgers",
  "maxCollaboratorsPerLedger",
  "aiCfoTokensMax",
  "maxDirectives",
];

export function limitChanges(
  from: SubscriptionTier,
  to: SubscriptionTier,
): PlanLimitChangeView[] {
  return LIMIT_KEYS.map((limit) => ({
    limit,
    from: TIER_LIMITS[from][limit],
    to: TIER_LIMITS[to][limit],
  }));
}

function addInterval(at: Date, interval: BillingInterval): Date {
  const next = new Date(at);
  if (interval === "year") next.setUTCFullYear(next.getUTCFullYear() + 1);
  else next.setUTCMonth(next.getUTCMonth() + 1);
  return next;
}

function cardOf(
  method: string | Stripe.PaymentMethod | null | undefined,
): PaymentMethodSummaryView | null {
  if (!method || typeof method === "string" || !method.card) return null;
  return { brand: method.card.brand, last4: method.card.last4 };
}

/**
 * The card a renewal or plan change would charge: the subscription's own
 * default, else the customer's invoice default. Returns null rather than
 * failing a preview when Stripe cannot say.
 */
export async function defaultCard(
  stripe: Stripe,
  subscription: Stripe.Subscription,
): Promise<PaymentMethodSummaryView | null> {
  try {
    const own = subscription.default_payment_method;
    if (own) {
      return typeof own === "string"
        ? cardOf(await stripe.paymentMethods.retrieve(own))
        : cardOf(own);
    }
    const customer = await stripe.customers.retrieve(
      customerId(subscription.customer),
      { expand: ["invoice_settings.default_payment_method"] },
    );
    if (customer.deleted) return null;
    return cardOf(customer.invoice_settings?.default_payment_method);
  } catch (error) {
    previewLogger.warn("Could not resolve the default payment method", {
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

function sameTierOnCycle(
  plans: PlanConfig[],
  tier: SubscriptionTier,
  interval: BillingInterval,
): string | null {
  return (
    plans.find(
      (plan) =>
        plan.tier === tier && plan.interval === interval && !plan.retired,
    )?.priceId ?? null
  );
}

async function listPrice(
  stripe: Stripe,
  priceId: string,
): Promise<{ amount: number; currency: string; productId: string }> {
  const price = await stripe.prices.retrieve(priceId);
  return {
    amount: price.unit_amount ?? 0,
    currency: price.currency,
    productId: expandableId(price.product),
  };
}

/**
 * What `amount` comes to at `at` once the subscription's discounts still
 * running then are applied, so "Then $X" is what will be charged (w1/182).
 * A discount it cannot read is skipped, so the worst case is the list price.
 */
async function afterDiscounts(
  stripe: Stripe,
  subscription: Stripe.Subscription,
  { amount, currency, productId }: Awaited<ReturnType<typeof listPrice>>,
  at: Date,
): Promise<number> {
  let result = amount;
  for (const discount of subscription.discounts ?? []) {
    if (typeof discount === "string") continue;
    if (discount.end != null && discount.end * 1000 <= at.getTime()) continue;
    const coupon = discount.source?.coupon;
    if (!coupon || typeof coupon === "string") continue;
    try {
      // `applies_to` comes only when expanded, deeper than a listing can.
      const { applies_to } = await stripe.coupons.retrieve(coupon.id, {
        expand: ["applies_to"],
      });
      if (applies_to && !applies_to.products.includes(productId)) continue;
    } catch (error) {
      previewLogger.warn("Could not read a discount's products", {
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      continue;
    }
    if (coupon.percent_off != null) {
      result *= 1 - coupon.percent_off / 100;
    } else if (coupon.amount_off != null && coupon.currency === currency) {
      result -= coupon.amount_off;
    }
  }
  return Math.max(0, Math.round(result));
}

function base(
  targetPriceId: string,
  currency: string,
): Omit<PlanChangePreviewView, "kind" | "refusal" | "effect"> {
  return {
    currentPriceId: null,
    targetPriceId,
    currency,
    amountDueToday: 0,
    creditApplied: 0,
    nextAmount: 0,
    nextChargeAt: null,
    effectiveAt: null,
    prorationDate: null,
    alternativePriceId: null,
    limitChanges: [],
    paymentMethod: null,
    replacesScheduledChange: null,
    withdrawsCancellation: false,
  };
}

function refused(
  view: Omit<PlanChangePreviewView, "kind" | "refusal" | "effect">,
  refusal: PlanChangeRefusal,
): PlanChangePreviewView {
  return { ...view, kind: null, refusal, effect: null };
}

/**
 * Preview a plan change for one user against one billing client.
 *
 * Classification comes from configuration alone (`classifyPlanChange`); only
 * immediate changes ask Stripe what they would charge, at a fixed proration
 * time the caller hands back to `changePlan`.
 */
export async function previewPlanChange(
  deps: PlanChangeDeps,
  userId: string,
  clientId: string,
  targetPriceId: string,
): Promise<PlanChangePreviewView> {
  const { plans, target } = resolveTargetPlan(clientId, targetPriceId);

  const { stripe } = deps;
  const now = deps.now?.() ?? new Date();
  const [{ active }, targetPrice] = await Promise.all([
    loadActivePlans(deps, userId, clientId, plans),
    listPrice(stripe, targetPriceId),
  ]);
  const { amount: targetAmount, currency } = targetPrice;

  if (active.length > 1) {
    // Two paid subscriptions on one customer is a duplicate purchase; never
    // guess which one a change should move.
    previewLogger.warn("Plan change refused: several active subscriptions", {
      count: active.length,
    });
    return refused(base(targetPriceId, currency), "MULTIPLE_SUBSCRIPTIONS");
  }

  const current = active[0] ?? null;
  const classification = classifyPlanChange(current?.plan ?? null, target);
  const fromTier = current?.plan.tier ?? SubscriptionTier.FREE;
  const shared = {
    ...base(targetPriceId, currency),
    currentPriceId: current?.plan.priceId ?? null,
    nextAmount: targetAmount,
    limitChanges: limitChanges(fromTier, target.tier),
  };

  if (current?.subscription.status === "past_due") {
    return refused(shared, "PAST_DUE");
  }
  if ("refusal" in classification) {
    return refused(shared, classification.refusal);
  }
  const { kind } = classification;
  const effect = PLAN_CHANGE_EFFECT[kind];
  // A change leaves one pending change at most: it replaces a scheduled one
  // and withdraws a pending cancellation, and the preview says so.
  const pending = current ? pendingChange(current.subscription, plans) : null;
  const change = {
    ...shared,
    kind,
    refusal: null,
    effect,
    replacesScheduledChange:
      pending && pending.priceId !== targetPriceId ? pending : null,
    withdrawsCancellation: current?.subscription.cancel_at_period_end ?? false,
  };

  if (!current) {
    return {
      ...change,
      amountDueToday: targetAmount,
      effectiveAt: now,
      nextChargeAt: addInterval(now, target.interval),
    };
  }

  const periodEnd = new Date(current.item.current_period_end * 1000);

  if (effect === "SCHEDULED") {
    const [paymentMethod, nextAmount] = await Promise.all([
      defaultCard(stripe, current.subscription),
      afterDiscounts(stripe, current.subscription, targetPrice, periodEnd),
    ]);
    return {
      ...change,
      effectiveAt: periodEnd,
      nextChargeAt: periodEnd,
      nextAmount,
      paymentMethod,
      alternativePriceId:
        kind === "SPLIT"
          ? sameTierOnCycle(plans, target.tier, current.plan.interval)
          : null,
    };
  }

  const prorationDate = Math.floor(now.getTime() / 1000);
  const cycleChanges = current.plan.interval !== target.interval;
  // A new billing cycle starts now; otherwise the renewal date holds.
  const nextChargeAt = cycleChanges
    ? addInterval(now, target.interval)
    : periodEnd;
  const [paymentMethod, nextAmount, invoice] = await Promise.all([
    defaultCard(stripe, current.subscription),
    afterDiscounts(stripe, current.subscription, targetPrice, nextChargeAt),
    stripe.invoices.createPreview({
      customer: customerId(current.subscription.customer),
      subscription: current.subscription.id,
      subscription_details: {
        items: [{ id: current.item.id, price: targetPriceId }],
        proration_behavior: "always_invoice",
        proration_date: prorationDate,
      },
    }),
  ]);
  const creditApplied = invoice.lines.data
    .filter((line) => line.amount < 0)
    .reduce((total, line) => total - line.amount, 0);

  return {
    ...change,
    currency: invoice.currency,
    amountDueToday: invoice.amount_due,
    creditApplied,
    effectiveAt: now,
    prorationDate,
    nextChargeAt,
    nextAmount,
    paymentMethod,
  };
}
