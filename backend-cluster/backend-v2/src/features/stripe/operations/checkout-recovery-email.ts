import type Stripe from "stripe";
import type { DbExecutor } from "@/drizzle/drizzle";
import type { IModels } from "@/foundation/models";
import type { ISendGrid } from "@/foundation/sendgrid";
import {
  checkoutRecoveryEmailSubject,
  renderCheckoutRecoveryHtml,
  renderCheckoutRecoveryText,
  type CheckoutRecoveryEmailParams,
} from "@/shared/email-templates";
import { logger } from "@/shared/logger";
import {
  SUBSCRIPTION_CONFIG,
  TIER_DISPLAY_NAMES,
  type PlanConfig,
} from "../service/stripe";
import type { IStripeService } from "../service/stripe-service";
import { expandableId } from "../service/subscription-plan";
import { checkoutCancelUrl } from "../service/subscription-service";
import { planName } from "./billing-email";

const recoveryLogger = logger.child({ module: "checkout-recovery-email" });

/** How long the code works: long enough to finish, short enough to act on. */
const CODE_LIFETIME_SECONDS = 48 * 60 * 60;

/**
 * The one email a first-time customer gets when their Checkout session
 * expires unpaid (ADR027).
 */
export interface CheckoutRecoveryDeps {
  stripe: Pick<IStripeService, "getStripeInstance" | "listSubscriptions">;
  models: Pick<IModels, "user" | "sentBillingEmail" | "storeSubscription">;
  db: DbExecutor;
  sendgrid: ISendGrid;
  /**
   * The email's SendGrid unsubscribe group. SendGrid drops the mail for
   * anyone who left it, so the operation never looks the address up.
   */
  groupId: number;
}

type RecoveryIneligibility =
  | "no-recipient"
  | "unknown-plan"
  | "paid-before"
  | "back-in-checkout";

export type RecoveryEligibility =
  | {
      eligible: true;
      userId: string;
      email: string;
      plan: PlanConfig;
    }
  | { eligible: false; reason: RecoveryIneligibility };

/** A subscription that never left these states was never paid for. */
const NEVER_PAID = new Set<Stripe.Subscription.Status>([
  "incomplete",
  "incomplete_expired",
]);

const ineligible = (reason: RecoveryIneligibility): RecoveryEligibility => ({
  eligible: false,
  reason,
});

/**
 * Whether an expired session earns the recovery email (ADR027 D2, D5).
 * Read-only: nothing is claimed, created or sent. A provider failure
 * propagates, so the webhook is redelivered rather than an email skipped or
 * sent on a guess. Unsubscribes are SendGrid's to enforce at send (D6).
 */
export async function recoveryEligibility(
  deps: CheckoutRecoveryDeps,
  session: Stripe.Checkout.Session,
  clientId: string,
): Promise<RecoveryEligibility> {
  const userId = session.metadata?.userId;
  if (!userId) return ineligible("no-recipient");
  const user = await deps.models.user.getById(deps.db, userId);
  if (!user?.email) return ineligible("no-recipient");

  const stripe = deps.stripe.getStripeInstance(clientId);
  const plan = await sessionPlan(stripe, session, clientId);
  if (!plan) return ineligible("unknown-plan");

  if (await hasPaidBefore(deps, userId)) return ineligible("paid-before");
  if (await isBackInCheckout(stripe, session, userId)) {
    return ineligible("back-in-checkout");
  }
  return { eligible: true, userId, email: user.email, plan };
}

/** The current, sellable plan the session was for, if any. */
async function sessionPlan(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
  clientId: string,
): Promise<PlanConfig | undefined> {
  const plans = SUBSCRIPTION_CONFIG[clientId]?.plans ?? [];
  // The expired event carries no line items.
  const items = await stripe.checkout.sessions.listLineItems(session.id);
  for (const item of items.data) {
    const plan = plans.find((each) => each.priceId === item.price?.id);
    if (plan) return plan.retired ? undefined : plan;
  }
  return undefined;
}

/**
 * Any Stripe subscription that was ever paid for, current or ended, or any
 * plan bought in an app store: the code is for a first purchase only.
 */
async function hasPaidBefore(
  deps: CheckoutRecoveryDeps,
  userId: string,
): Promise<boolean> {
  const [subscriptions, storeSubscriptions] = await Promise.all([
    deps.stripe.listSubscriptions(userId, { status: "all" }),
    deps.models.storeSubscription.findByUserId(deps.db, userId),
  ]);
  return (
    storeSubscriptions.length > 0 ||
    subscriptions.some((subscription) => !NEVER_PAID.has(subscription.status))
  );
}

/**
 * Whether the user opened Checkout again after this session: a later
 * session that completed (paid, or payment still processing) or is still
 * open. If that one expires too, its own event decides. Sessions cannot be
 * listed by metadata, so the user is matched here.
 */
async function isBackInCheckout(
  stripe: Stripe,
  session: Stripe.Checkout.Session,
  userId: string,
): Promise<boolean> {
  const customer = session.customer && expandableId(session.customer);
  for await (const later of stripe.checkout.sessions.list({
    created: { gte: session.created },
    ...(customer && { customer }),
    limit: 100,
  })) {
    if (
      later.id !== session.id &&
      later.metadata?.userId === userId &&
      (later.status === "complete" || later.status === "open")
    ) {
      return true;
    }
  }
  return false;
}

export type RecoveryOutcome = "sent" | "already-sent" | RecoveryIneligibility;

/**
 * Send the recovery email for an expired session, at most once per person
 * ever (ADR027 D4). The claim comes first, because the body carries a code
 * that should exist only once the claim is won; then the code, the render,
 * and the send. A failure after the claim deactivates the code, gives the
 * claim back and rethrows, so Stripe's redelivery starts clean.
 */
export async function emailCheckoutRecovery(
  deps: CheckoutRecoveryDeps,
  session: Stripe.Checkout.Session,
  clientId: string,
): Promise<RecoveryOutcome> {
  const verdict = await recoveryEligibility(deps, session, clientId);
  if (!verdict.eligible) return verdict.reason;
  const { userId, email, plan } = verdict;

  const key = `checkout-recovery:${userId}`;
  if (!(await deps.models.sentBillingEmail.claim(deps.db, key))) {
    return "already-sent";
  }
  const clientConfig = SUBSCRIPTION_CONFIG[clientId];
  const stripe = deps.stripe.getStripeInstance(clientId);
  let codeId: string | undefined;
  try {
    const customer = session.customer && expandableId(session.customer);
    const code = await stripe.promotionCodes.create({
      promotion: { type: "coupon", coupon: clientConfig.recoveryCouponId },
      max_redemptions: 1,
      expires_at: Math.floor(Date.now() / 1000) + CODE_LIFETIME_SECONDS,
      restrictions: { first_time_transaction: true },
      ...(customer && { customer }),
      metadata: { userId, sessionId: session.id, source: "checkout-recovery" },
    });
    codeId = code.id;
    const params: CheckoutRecoveryEmailParams = {
      tier: TIER_DISPLAY_NAMES[plan.tier],
      plan: planName(plan),
      interval: plan.interval,
      code: code.code,
      checkoutUrl:
        session.after_expiration?.recovery?.url ??
        checkoutCancelUrl(clientConfig, plan, "PRICING"),
    };
    await deps.sendgrid.sendMail({
      to: email,
      subject: checkoutRecoveryEmailSubject(params),
      html: renderCheckoutRecoveryHtml(params),
      text: renderCheckoutRecoveryText(params),
      asm: { groupId: deps.groupId },
      untracked: true,
    });
  } catch (error) {
    if (codeId) {
      await stripe.promotionCodes
        .update(codeId, { active: false })
        .catch((deactivateError: unknown) =>
          recoveryLogger.error("Could not deactivate an unsent recovery code", {
            codeId,
            errorMessage:
              deactivateError instanceof Error
                ? deactivateError.message
                : String(deactivateError),
          }),
        );
    }
    await deps.models.sentBillingEmail.release(deps.db, key);
    throw error;
  }
  return "sent";
}
