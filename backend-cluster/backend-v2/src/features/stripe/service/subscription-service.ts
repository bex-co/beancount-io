import { refreshSubscriptionPeriods } from "../operations/refresh-subscription-periods";
import {
  type ClientSubscription,
  expandedLatestInvoice,
  pastDueRetry,
  subscriptionTier,
  holdsVerifiedPeriod,
} from "./subscription-plan";
import type Stripe from "stripe";
import type { DbExecutor } from "@/drizzle/drizzle";
import type { IModels } from "@/foundation/models";
import type { Identity } from "@/server/api/identity";
import {
  AUTHORIZATION_ACTIONS,
  type AuthorizationAction,
  type IAuthorizationService,
  userResource,
} from "@/server/api/authorization";
import {
  type PlanBilling,
  planBilling,
} from "@/features/store-billing/service/plan-billing";
import { STORE_NAMES } from "@/features/store-billing/service/store-catalog";
import type { StoreSubscription } from "@/features/store-billing/data/store-subscription-model";
import { storePlanOverlap } from "@/features/store-billing/service/plan-switch";
import { renewsFromStore } from "@/features/store-billing/service/store-subscription-grant";
import { BilledByStoreError } from "@/shared/errors";
import { logger } from "@/shared/logger";
import { SUBSCRIPTION_CONFIG, TIER_LIMITS, SubscriptionTier } from "./stripe";
import type { CancellationReason, IStripeService } from "./stripe-service";
import type {
  PaymentMethodSummaryView,
  PlanChangePreviewView,
} from "../operations/plan-change-preview";
import type { PlanChangeResultView } from "../operations/plan-change-apply";
import type { BillingEmailDeps } from "../operations/billing-email";
import { emailScheduledChange } from "../operations/plan-change-email";
import {
  pendingChange,
  type ScheduledChangeNotice,
  type ScheduledChangeView,
} from "../operations/plan-change-schedule";

function sameChange(
  a: ScheduledChangeView | null | undefined,
  b: ScheduledChangeView,
): boolean {
  return (
    !!a &&
    a.priceId === b.priceId &&
    a.effectiveAt.getTime() === b.effectiveAt.getTime()
  );
}

interface SubscriptionPriceView {
  id: string;
  amount: number;
  currency: string;
  interval: string;
  intervalCount?: number;
  trialPeriodDays?: number;
}

interface SubscriptionProductView {
  id: string;
  name: string;
  description?: string;
  images?: string[];
}

interface SubscriptionItemView {
  id: string;
  price: SubscriptionPriceView;
  product?: SubscriptionProductView;
  quantity: number;
}

interface SubscriptionView {
  id: string;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  clientId: string;
  cancelAt?: Date;
  canceledAt?: Date;
  cancelAtPeriodEnd: boolean;
  items: SubscriptionItemView[];
  paymentMethod: PaymentMethodSummaryView | null;
  scheduledChange: ScheduledChangeView | null;
  /** With `past_due`: when Stripe next retries the failed renewal. */
  nextPaymentAttempt: Date | null;
  latestInvoice: SubscriptionInvoiceView | null;
}

/** What the subscription's latest invoice collected, discounts applied. */
interface SubscriptionInvoiceView {
  id: string;
  /** Minor units. */
  amountPaid: number;
  currency: string;
  billingReason: string | null;
  created: Date;
}

export interface CustomerSubscriptionStatusView {
  /** Stripe's own answer; a store plan is reported under `billing`. */
  hasActiveSubscription: boolean;
  subscriptions: SubscriptionView[];
  /** Absent only when `hasActiveSubscription` was the sole field requested. */
  billing?: PlanBilling;
}

export interface SubscriptionActionResultView {
  success: boolean;
  message?: string;
}

export interface UpgradeSubscriptionResultView extends SubscriptionActionResultView {
  clientSecret?: string;
  subscriptionId?: string;
  newTier?: string;
}

export interface SubscriptionSessionResultView extends SubscriptionActionResultView {
  sessionId?: string;
  sessionUrl?: string;
}

export interface TierQuotaView {
  tier: string;
  aiCfoTokensMax: number;
  maxLedgers: number;
  maxCollaboratorsPerLedger: number;
  maxDirectives: number;
}

/** The latest invoice, when the listing expanded it (the full view does). */
function latestInvoice(
  subscription: Stripe.Subscription,
): SubscriptionInvoiceView | null {
  const invoice = expandedLatestInvoice(subscription);
  if (!invoice?.id) return null;
  return {
    id: invoice.id,
    amountPaid: invoice.amount_paid,
    currency: invoice.currency,
    billingReason: invoice.billing_reason ?? null,
    created: new Date(invoice.created * 1000),
  };
}

/** A past-due renewal's next retry, for the failed-renewal banner. */
function retryDate(subscription: Stripe.Subscription): Date | null {
  const retry = pastDueRetry(subscription);
  return retry === null ? null : new Date(retry * 1000);
}

export interface ISubscriptionService {
  allTierQuotas(): Promise<TierQuotaView[]>;
  subscriptionStatus(
    identity: Identity,
    view: SubscriptionStatusView,
  ): Promise<CustomerSubscriptionStatusView>;
  createSubscriptionSession(
    identity: Identity,
    clientId: string,
    priceId: string,
    returnTo?: CheckoutReturnTo,
  ): Promise<SubscriptionSessionResultView>;
  createStripePortalSession(
    identity: Identity,
    clientId: string,
  ): Promise<SubscriptionSessionResultView>;
  cancelSubscription(
    identity: Identity,
    subscriptionId: string,
    clientId: string,
    reason?: CancellationReason | null,
  ): Promise<SubscriptionActionResultView>;
  resumeSubscription(
    identity: Identity,
    subscriptionId: string,
    clientId: string,
  ): Promise<SubscriptionActionResultView>;
  upgradeSubscription(
    identity: Identity,
    clientId: string,
    priceId: string,
  ): Promise<UpgradeSubscriptionResultView>;
  previewPlanChange(
    identity: Identity,
    clientId: string,
    priceId: string,
  ): Promise<PlanChangePreviewView>;
  changePlan(
    identity: Identity,
    clientId: string,
    priceId: string,
    prorationDate?: number | null,
  ): Promise<PlanChangeResultView>;
  cancelScheduledPlanChange(
    identity: Identity,
    clientId: string,
  ): Promise<SubscriptionActionResultView>;
}

/** Where the Checkout began, so an abandoned one returns there. */
export type CheckoutReturnTo = "PRICING" | "BILLING";

/**
 * Where a cancelled Checkout returns. From the pricing page (the default, so
 * its two-argument call is unchanged): back there with the plan and cycle
 * still chosen. The pricing page already reads `billing`; `plan` and
 * `checkout=canceled` are ignored until it reads them too. From the
 * dashboard: Billing, which says nothing was charged.
 */
function checkoutCancelUrl(
  clientConfig: { cancelUrl: string; portalReturnUrl: string },
  plan: { tier: SubscriptionTier; interval: "month" | "year" },
  returnTo: CheckoutReturnTo,
): string {
  if (returnTo === "BILLING") {
    const billing = new URL(clientConfig.portalReturnUrl);
    billing.searchParams.set("checkout", "canceled");
    return billing.toString();
  }
  const url = new URL(clientConfig.cancelUrl);
  url.searchParams.set("plan", plan.tier.toLowerCase());
  url.searchParams.set(
    "billing",
    plan.interval === "year" ? "yearly" : "monthly",
  );
  url.searchParams.set("checkout", "canceled");
  return url.toString();
}

/**
 * Whether a subscription already takes the account's plan: a paid one, or one
 * waiting out a store plan with its first charge deferred (ADR 001 D15).
 */
const holdsPlan = (subscription: ClientSubscription) =>
  subscription.status === "trialing" ||
  subscriptionTier(subscription) !== SubscriptionTier.FREE;

/** A first purchase beside a running store plan, as Checkout will treat it. */
function previewOverStorePlan(
  preview: PlanChangePreviewView,
  storeSubscriptions: StoreSubscription[],
  clientId: string,
): PlanChangePreviewView {
  if (preview.kind !== "NEW") return preview;
  const target = SUBSCRIPTION_CONFIG[clientId]?.plans.find(
    (plan) => plan.priceId === preview.targetPriceId,
  );
  const storeOverlap =
    target && storePlanOverlap(storeSubscriptions, target.tier, new Date());
  if (!storeOverlap) return preview;
  return {
    ...preview,
    storeOverlap,
    ...(storeOverlap.deferred && {
      amountDueToday: 0,
      nextChargeAt: storeOverlap.endsAt,
    }),
  };
}

/**
 * The application boundary for self-service billing.
 *
 * Protected methods make one final PDP decision before reading local billing
 * state or reaching Stripe. The static tier-quota catalog is deliberately
 * public. Stripe customer ownership, product allowlists, and subscription-state
 * validation remain payment-domain invariants downstream.
 */
/**
 * How much of the status a caller reads: the active flag alone, who bills the
 * plan without Stripe's product and card details, or everything.
 */
export type SubscriptionStatusView = "active" | "billing" | "full";

export class SubscriptionService implements ISubscriptionService {
  constructor(
    private readonly stripe: IStripeService,
    private readonly models: Pick<
      IModels,
      "paidCustomer" | "user" | "storeSubscription"
    >,
    private readonly db: DbExecutor,
    private readonly authorization: IAuthorizationService,
    /** Without it, a scheduled change sends no confirmation email. */
    private readonly planChangeEmail?: Pick<BillingEmailDeps, "sendgrid"> &
      Pick<IModels, "sentBillingEmail">,
  ) {}

  /**
   * Confirm a scheduled change by email. The change is already stored in
   * Stripe, so a lost email is logged and never fails the change.
   */
  private async confirmScheduledChange(
    userId: string,
    clientId: string,
    notice: ScheduledChangeNotice,
  ): Promise<void> {
    if (!this.planChangeEmail) return;
    const { sendgrid, sentBillingEmail } = this.planChangeEmail;
    try {
      await emailScheduledChange(
        {
          sendgrid,
          models: { user: this.models.user, sentBillingEmail },
          db: this.db,
        },
        "scheduled",
        userId,
        clientId,
        notice,
      );
    } catch (error) {
      logger.warn("Plan change scheduled, but its confirmation email failed", {
        errorType: error instanceof Error ? error.name : typeof error,
      });
    }
  }

  private async authorize(
    identity: Identity,
    action: AuthorizationAction,
  ): Promise<void> {
    await this.authorization.authorizeOrThrow({
      principal: identity,
      action,
      resource: userResource(identity.userId),
    });
  }

  /**
   * One renewing source per account: Stripe cannot sell over a store (D5).
   * Returns the rows, since a switch needs them next.
   */
  private async refuseWhileStoreRenews(
    userId: string,
  ): Promise<StoreSubscription[]> {
    const subscriptions = await this.models.storeSubscription.findByUserId(
      this.db,
      userId,
    );
    const renewing = subscriptions.find(renewsFromStore);
    if (renewing) {
      throw new BilledByStoreError(
        renewing.provider,
        STORE_NAMES[renewing.provider],
      );
    }
    return subscriptions;
  }

  public async allTierQuotas(): Promise<TierQuotaView[]> {
    return (Object.keys(TIER_LIMITS) as SubscriptionTier[]).map((tier) => ({
      tier,
      ...TIER_LIMITS[tier],
    }));
  }

  public async subscriptionStatus(
    identity: Identity,
    view: SubscriptionStatusView,
  ): Promise<CustomerSubscriptionStatusView> {
    const onlyActiveStatus = view === "active";
    await this.authorize(
      identity,
      AUTHORIZATION_ACTIONS.USER_BILLING_STATUS_READ,
    );
    const { userId } = identity;

    if (onlyActiveStatus) {
      const cached =
        await this.models.paidCustomer.findByUserIdWithActivePeriod(
          this.db,
          userId,
        );
      if (
        cached?.userId === userId &&
        cached.stripeCustomerId &&
        holdsVerifiedPeriod(cached)
      ) {
        return { hasActiveSubscription: true, subscriptions: [] };
      }
    }

    const stripeSubscriptions = await refreshSubscriptionPeriods(
      this.stripe,
      this.models,
      this.db,
      userId,
      // Only the full view reports a pending change and a failed renewal.
      view === "full"
        ? { status: "all", expandForStatus: true }
        : { status: "current" },
    );
    const filteredSubscriptions = stripeSubscriptions.filter(
      (subscription) =>
        !!SUBSCRIPTION_CONFIG[subscription.clientId] &&
        subscription.livemode &&
        subscription.items.data.some((item) =>
          SUBSCRIPTION_CONFIG[subscription.clientId].planIds.includes(
            item.price.id,
          ),
        ),
    );
    const stripePlans = filteredSubscriptions.filter(
      (subscription) =>
        subscriptionTier(subscription) !== SubscriptionTier.FREE,
    );
    const hasActiveSubscription = stripePlans.length > 0;
    if (onlyActiveStatus) return { hasActiveSubscription, subscriptions: [] };
    if (view === "billing") {
      // A banner asks only who bills the plan: no products, cards, or history.
      return {
        hasActiveSubscription,
        subscriptions: [],
        billing: await this.planBillingFor(userId, filteredSubscriptions),
      };
    }

    const products = new Map<
      string,
      Promise<Stripe.Product | Stripe.DeletedProduct>
    >();
    const loadProduct = (clientId: string, productId: string) => {
      const key = `${clientId}:${productId}`;
      let pending = products.get(key);
      if (!pending) {
        pending = this.stripe
          .getStripeInstance(clientId)
          .products.retrieve(productId);
        products.set(key, pending);
      }
      return pending;
    };
    const subscriptionsResults = await Promise.allSettled(
      filteredSubscriptions.map(async (subscription) => {
        // Never throws, so it can run alongside the item lookups.
        const paymentMethod = this.stripe.defaultCard(
          subscription.clientId,
          subscription,
        );
        const itemsResults = await Promise.allSettled(
          subscription.items.data.map(async (item) => {
            const { price } = item;
            const productDetails: Stripe.Product | Stripe.DeletedProduct =
              typeof price.product !== "string"
                ? price.product
                : await loadProduct(subscription.clientId, price.product);
            const product = productDetails.deleted ? undefined : productDetails;
            return {
              id: item.id,
              quantity: item.quantity || 1,
              price: {
                id: price.id,
                amount: price.unit_amount || 0,
                currency: price.currency,
                interval: price.recurring?.interval || "month",
                intervalCount: price.recurring?.interval_count,
                trialPeriodDays:
                  price.recurring?.trial_period_days || undefined,
              },
              product: product
                ? {
                    id: product.id,
                    name: product.name || "",
                    description: product.description || "",
                    images: product.images || [],
                  }
                : undefined,
            } satisfies SubscriptionItemView;
          }),
        );

        const items = itemsResults.flatMap((result) => {
          if (result.status === "fulfilled") return [result.value];
          logger.error("Failed to fetch subscription item details", {
            subscriptionId: subscription.id,
            error: result.reason,
          });
          return [];
        });

        return {
          id: subscription.id,
          status: subscription.status,
          clientId: subscription.clientId,
          currentPeriodStart: new Date(
            (subscription.items.data[0]?.current_period_start ||
              subscription.start_date) * 1000,
          ),
          currentPeriodEnd: new Date(
            (subscription.items.data[0]?.current_period_end || 0) * 1000,
          ),
          cancelAt: subscription.cancel_at
            ? new Date(subscription.cancel_at * 1000)
            : undefined,
          canceledAt: subscription.canceled_at
            ? new Date(subscription.canceled_at * 1000)
            : undefined,
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          items,
          paymentMethod: await paymentMethod,
          scheduledChange: pendingChange(
            subscription,
            SUBSCRIPTION_CONFIG[subscription.clientId]?.plans ?? [],
          ),
          nextPaymentAttempt: retryDate(subscription),
          latestInvoice: latestInvoice(subscription),
        } satisfies SubscriptionView;
      }),
    );

    const subscriptions = subscriptionsResults.flatMap((result) => {
      if (result.status === "fulfilled") return [result.value];
      logger.error("Failed to fetch subscription details", {
        error: result.reason,
      });
      return [];
    });

    const billing = await this.planBillingFor(userId, filteredSubscriptions);

    return { hasActiveSubscription, subscriptions, billing };
  }

  /** Who bills the plan, from the account's store rows and Stripe plans. */
  private async planBillingFor(
    userId: string,
    stripeSubscriptions: ClientSubscription[],
  ): Promise<PlanBilling> {
    const heldPlans = stripeSubscriptions.filter(holdsPlan);
    return planBilling(
      await this.models.storeSubscription.findByUserId(this.db, userId),
      {
        held: heldPlans.length,
        renewing: heldPlans.filter(
          (subscription) =>
            !subscription.cancel_at_period_end && !subscription.cancel_at,
        ).length,
      },
      new Date(),
    );
  }

  public async createSubscriptionSession(
    identity: Identity,
    clientId: string,
    priceId: string,
    returnTo: CheckoutReturnTo = "PRICING",
  ): Promise<SubscriptionSessionResultView> {
    await this.authorize(
      identity,
      AUTHORIZATION_ACTIONS.USER_BILLING_CHECKOUT_CREATE,
    );
    const { userId } = identity;
    const storeSubscriptions = await this.refuseWhileStoreRenews(userId);

    try {
      const clientConfig =
        SUBSCRIPTION_CONFIG[clientId as keyof typeof SUBSCRIPTION_CONFIG];
      if (!clientConfig) {
        return { success: false, message: `Invalid client ID: ${clientId}` };
      }
      if (!clientConfig.planIds.includes(priceId)) {
        return {
          success: false,
          message: `Invalid price ID for client ${clientId}: ${priceId}`,
        };
      }

      const planConfig = clientConfig.plans.find(
        (plan) => plan.priceId === priceId,
      );
      if (!planConfig) {
        return {
          success: false,
          message: `Plan configuration not found for price ID: ${priceId}`,
        };
      }
      // Still billed to the subscribers on it, never sold again.
      if (planConfig.retired) {
        return {
          success: false,
          message:
            "This price is no longer offered. Choose a plan again on the pricing page.",
        };
      }

      const stripe = this.stripe.getStripeInstance(clientId);
      const existingCustomer =
        await this.models.paidCustomer.findByUserIdAndClientId(
          this.db,
          userId,
          clientId,
        );
      if (existingCustomer?.stripeCustomerId) {
        // A second Checkout would bill the customer twice; plan changes go
        // through changePlan. The pricing page only offers Checkout to
        // visitors without a subscription, so this catches races and stale
        // pages rather than an ordinary path.
        const current = await this.stripe.listSubscriptions(userId, {
          status: "current",
          bindings: [existingCustomer],
        });
        if (current.some(holdsPlan)) {
          return {
            success: false,
            message:
              "You already have an active subscription. Change your plan in Billing settings.",
          };
        }
      }
      const overlap =
        planConfig.type === "subscription"
          ? storePlanOverlap(storeSubscriptions, planConfig.tier, new Date())
          : null;
      const sharedSession = {
        line_items: [{ price: priceId, quantity: 1 }],
        allow_promotion_codes: true,
        mode: planConfig.type,
        success_url: clientConfig.successUrl,
        cancel_url: checkoutCancelUrl(clientConfig, planConfig, returnTo),
        metadata: { userId, clientId },
        ...(planConfig.type === "subscription"
          ? {
              subscription_data: {
                metadata: { userId, clientId },
                ...(overlap?.deferred && {
                  trial_end: Math.floor(overlap.endsAt.getTime() / 1000),
                }),
              },
            }
          : {}),
      };
      let session: Stripe.Checkout.Session;
      if (existingCustomer?.stripeCustomerId) {
        session = await stripe.checkout.sessions.create({
          ...sharedSession,
          customer: existingCustomer.stripeCustomerId,
        });
      } else {
        const user = await this.models.user.getById(this.db, userId);
        session = await stripe.checkout.sessions.create({
          ...sharedSession,
          customer_email: user?.email,
        });
      }

      return {
        success: true,
        sessionId: session.id,
        sessionUrl: session.url || undefined,
      };
    } catch (error) {
      logger.error("Error creating subscription session", {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        message: "An error occurred while creating the subscription session",
      };
    }
  }

  public async createStripePortalSession(
    identity: Identity,
    clientId: string,
  ): Promise<SubscriptionSessionResultView> {
    await this.authorize(
      identity,
      AUTHORIZATION_ACTIONS.USER_BILLING_PORTAL_CREATE,
    );
    return this.stripe.createCustomerPortalSession(identity.userId, clientId);
  }

  public async cancelSubscription(
    identity: Identity,
    subscriptionId: string,
    clientId: string,
    reason?: CancellationReason | null,
  ): Promise<SubscriptionActionResultView> {
    await this.authorize(
      identity,
      AUTHORIZATION_ACTIONS.USER_BILLING_SUBSCRIPTION_CANCEL,
    );
    return this.stripe.cancelSubscription(
      subscriptionId,
      identity.userId,
      clientId,
      reason,
    );
  }

  public async resumeSubscription(
    identity: Identity,
    subscriptionId: string,
    clientId: string,
  ): Promise<SubscriptionActionResultView> {
    await this.authorize(
      identity,
      AUTHORIZATION_ACTIONS.USER_BILLING_SUBSCRIPTION_RESUME,
    );
    await this.refuseWhileStoreRenews(identity.userId);
    return this.stripe.resumeSubscription(
      subscriptionId,
      identity.userId,
      clientId,
    );
  }

  public async upgradeSubscription(
    identity: Identity,
    clientId: string,
    priceId: string,
  ): Promise<UpgradeSubscriptionResultView> {
    await this.authorize(
      identity,
      AUTHORIZATION_ACTIONS.USER_BILLING_SUBSCRIPTION_UPGRADE,
    );
    await this.refuseWhileStoreRenews(identity.userId);
    return this.stripe.upgradeSubscription(identity.userId, clientId, priceId);
  }

  public async previewPlanChange(
    identity: Identity,
    clientId: string,
    priceId: string,
  ): Promise<PlanChangePreviewView> {
    await this.authorize(
      identity,
      AUTHORIZATION_ACTIONS.USER_BILLING_PLAN_CHANGE_PREVIEW,
    );
    const storeSubscriptions = await this.refuseWhileStoreRenews(
      identity.userId,
    );
    const preview = await this.stripe.previewPlanChange(
      identity.userId,
      clientId,
      priceId,
    );
    return previewOverStorePlan(preview, storeSubscriptions, clientId);
  }

  public async changePlan(
    identity: Identity,
    clientId: string,
    priceId: string,
    prorationDate?: number | null,
  ): Promise<PlanChangeResultView> {
    await this.authorize(
      identity,
      AUTHORIZATION_ACTIONS.USER_BILLING_PLAN_CHANGE_APPLY,
    );
    await this.refuseWhileStoreRenews(identity.userId);
    const { scheduledNotice, ...result } = await this.stripe.changePlan(
      identity.userId,
      clientId,
      priceId,
      prorationDate,
    );
    // A confirm that leaves the schedule as it was (a double click) announces
    // nothing new.
    if (
      scheduledNotice &&
      !sameChange(scheduledNotice.previous, scheduledNotice.change)
    ) {
      await this.confirmScheduledChange(
        identity.userId,
        clientId,
        scheduledNotice,
      );
    }
    return result;
  }

  public async cancelScheduledPlanChange(
    identity: Identity,
    clientId: string,
  ): Promise<SubscriptionActionResultView> {
    await this.authorize(
      identity,
      AUTHORIZATION_ACTIONS.USER_BILLING_PLAN_CHANGE_CANCEL,
    );
    return this.stripe.cancelScheduledPlanChange(identity.userId, clientId);
  }
}
