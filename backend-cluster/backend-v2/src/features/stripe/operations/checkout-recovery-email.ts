import type Stripe from "stripe";
import type { DbExecutor } from "@/drizzle/drizzle";
import type { IModels } from "@/foundation/models";
import type { ISendGrid } from "@/foundation/sendgrid";
import { SUBSCRIPTION_CONFIG, type PlanConfig } from "../service/stripe";
import type { IStripeService } from "../service/stripe-service";
import { expandableId } from "../service/subscription-plan";

/**
 * The one email a first-time customer gets when their Checkout session
 * expires unpaid (ADR027).
 */
export interface CheckoutRecoveryDeps {
  stripe: Pick<IStripeService, "getStripeInstance" | "listSubscriptions">;
  models: Pick<IModels, "user" | "sentBillingEmail" | "storeSubscription">;
  db: DbExecutor;
  sendgrid: ISendGrid;
  /** The email's SendGrid unsubscribe group; unset turns the email off. */
  groupId?: number;
}

type RecoveryIneligibility =
  | "disabled"
  | "no-recipient"
  | "unknown-plan"
  | "paid-before"
  | "back-in-checkout"
  | "unsubscribed";

export type RecoveryEligibility =
  | {
      eligible: true;
      userId: string;
      email: string;
      plan: PlanConfig;
      groupId: number;
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
 * Whether an expired session earns the recovery email (ADR027 D2, D5, D6).
 * Read-only: nothing is claimed, created or sent. The cheap checks run
 * first and the SendGrid lookup last. A provider failure propagates, so the
 * webhook is redelivered rather than an email skipped or sent on a guess.
 */
export async function recoveryEligibility(
  deps: CheckoutRecoveryDeps,
  session: Stripe.Checkout.Session,
  clientId: string,
): Promise<RecoveryEligibility> {
  if (!deps.groupId) return ineligible("disabled");
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
  if (await deps.sendgrid.isSuppressed(user.email, deps.groupId)) {
    return ineligible("unsubscribed");
  }
  return {
    eligible: true,
    userId,
    email: user.email,
    plan,
    groupId: deps.groupId,
  };
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
    const plan =
      item.price &&
      plans.find((each) => each.priceId === expandableId(item.price!));
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
