import Stripe from "stripe";
import {
  customerId,
  highestTier,
  holdsVerifiedPeriod,
} from "./subscription-plan";
import {
  SUBSCRIPTION_CONFIG,
  SubscriptionTier,
} from "@/features/stripe/service/stripe";
import {
  applyPlanChange,
  type PlanChangeResultView,
} from "../operations/plan-change-apply";
import {
  defaultCard,
  previewPlanChange,
  type PaymentMethodSummaryView,
  type PlanChangePreviewView,
} from "../operations/plan-change-preview";
import {
  cancelScheduledChange,
  releaseSchedule,
} from "../operations/plan-change-schedule";
import { ValidationError } from "@/shared/errors";
import type { PaidCustomer } from "../data/paid-customer-model/types";
import { grantedTier } from "@/features/store-billing/service/store-subscription-grant";
import { IModels } from "@/foundation/models";
import { logger } from "@/shared/logger";
import { NodePgDatabase } from "drizzle-orm/node-postgres";

function isNoSuchSubscriptionError(error: unknown): boolean {
  return (
    (error as { name?: string }).name === "StripeInvalidRequestError" &&
    (error as { message?: string }).message?.includes(
      "No such subscription",
    ) === true
  );
}

/** Why a subscriber cancels, as the cancel sheet offers it, in Stripe's terms. */
const CANCELLATION_FEEDBACK = {
  TOO_EXPENSIVE: "too_expensive",
  MISSING_FEATURES: "missing_features",
  UNUSED: "unused",
  SWITCHED_SERVICE: "switched_service",
  OTHER: "other",
} as const satisfies Record<
  string,
  Stripe.SubscriptionUpdateParams.CancellationDetails.Feedback
>;
export type CancellationReason = keyof typeof CANCELLATION_FEEDBACK;

export interface SubscriptionListOptions {
  /**
   * `current` is every subscription not canceled (Stripe's default listing),
   * which includes a past-due one that still holds its paid tier.
   */
  status?: "active" | "all" | "current";
  bindings?: PaidCustomer[];
  /**
   * Expand each subscription's schedule (a pending plan change) and latest
   * invoice (a failed renewal's next attempt). Only Billing status reads
   * them, so tier checks and webhooks skip the cost.
   */
  expandForStatus?: boolean;
}

export interface IStripeService {
  getStripeInstance(clientId: string): Stripe;
  previewPlanChange(
    userId: string,
    clientId: string,
    priceId: string,
  ): Promise<PlanChangePreviewView>;
  defaultCard(
    clientId: string,
    subscription: Stripe.Subscription,
  ): Promise<PaymentMethodSummaryView | null>;
  changePlan(
    userId: string,
    clientId: string,
    priceId: string,
    prorationDate?: number | null,
  ): Promise<PlanChangeResultView>;
  cancelScheduledPlanChange(
    userId: string,
    clientId: string,
  ): Promise<{ success: boolean; message?: string }>;
  /** The tier a still-current verified period paid for, from our cache. */
  lastVerifiedTier(userId: string): Promise<SubscriptionTier | null>;
  /** The tiers the user's store subscriptions grant now (ADR 001 D3). */
  grantedStoreTiers(userId: string): Promise<SubscriptionTier[]>;
  handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session,
    clientId: string,
    userId: string,
  ): Promise<void>;
  upgradeSubscription(
    userId: string,
    clientId: string,
    newPriceId: string,
  ): Promise<{
    success: boolean;
    message?: string;
    clientSecret?: string;
    subscriptionId?: string;
    newTier?: string;
  }>;
  cancelSubscription(
    subscriptionId: string,
    userId: string,
    clientId: string,
    reason?: CancellationReason | null,
  ): Promise<{ success: boolean; message?: string }>;
  deleteSubscription(
    subscriptionId: string,
    userId: string,
    clientId: string,
  ): Promise<{ success: boolean; message?: string }>;
  resumeSubscription(
    subscriptionId: string,
    userId: string,
    clientId: string,
  ): Promise<{ success: boolean; message?: string }>;
  listSubscriptions(
    userId: string,
    options?: SubscriptionListOptions,
  ): Promise<(Stripe.Subscription & { clientId: string })[]>;
  createCustomerPortalSession(
    userId: string,
    clientId: string,
  ): Promise<{
    success: boolean;
    message?: string;
    sessionId?: string;
    sessionUrl?: string;
  }>;
  updateCustomerEmail(
    stripeCustomerId: string,
    clientId: string,
    email: string,
  ): Promise<void>;
  handleCustomerEvent(
    customer: Stripe.Customer,
    eventType: string,
    previousAttributes: Record<string, unknown>,
    clientId: string,
    userId: string,
  ): Promise<void>;
}

export class StripeService implements IStripeService {
  // Cache for Stripe instances by client ID
  private stripeInstances: Record<string, Stripe> = {};

  private models: Pick<IModels, "paidCustomer" | "storeSubscription">;

  private postgresDb: NodePgDatabase;

  constructor(
    models: Pick<IModels, "paidCustomer" | "storeSubscription">,
    postgresDb: NodePgDatabase,
  ) {
    this.models = models;
    this.postgresDb = postgresDb;
  }

  public getStripeInstance(clientId: string): Stripe {
    if (!clientId) {
      throw new Error("Client ID is required to get a Stripe instance");
    }
    // If we already have an instance for this client, return it
    if (this.stripeInstances[clientId]) {
      return this.stripeInstances[clientId];
    }

    // Get the client config
    const clientConfig =
      SUBSCRIPTION_CONFIG[clientId as keyof typeof SUBSCRIPTION_CONFIG];

    if (!clientConfig) {
      throw new Error(`Invalid Stripe client ID: ${clientId}`);
    }
    if (!clientConfig.stripePriKey) {
      throw new Error(`No Stripe API key found for client ${clientId}`);
    }

    // Create a new Stripe instance with the client's API key
    this.stripeInstances[clientId] = new Stripe(clientConfig.stripePriKey, {
      apiVersion: "2025-12-15.clover",
    });

    return this.stripeInstances[clientId];
  }

  async updateCustomerEmail(
    stripeCustomerId: string,
    clientId: string,
    email: string,
  ): Promise<void> {
    const stripe = this.getStripeInstance(clientId);
    await stripe.customers.update(stripeCustomerId, { email });
  }

  async handleCheckoutSessionCompleted(
    session: Stripe.Checkout.Session,
    clientId: string,
    userId: string,
  ): Promise<void> {
    // Get the customer ID from the session
    const stripeCustomerId = session.customer as string;
    if (!stripeCustomerId) {
      logger.error("No customer ID found in checkout session", {
        sessionId: session.id,
      });
      return;
    }

    logger.debug("Processing checkout session completed", {
      userId,
      stripeCustomerId,
      clientId,
    });

    try {
      // Get the customer details from Stripe
      const stripe = this.getStripeInstance(clientId);
      const customerDetails = await stripe.customers.retrieve(stripeCustomerId);

      if (customerDetails.deleted) {
        logger.error("Customer has been deleted", { stripeCustomerId });
        return;
      }

      // Handle the customer event to create/update the paid customer record
      await this.handleCustomerEvent(
        customerDetails as Stripe.Customer,
        "created", // Treat as creation event to ensure record exists
        {},
        clientId,
        userId,
      );

      logger.debug("Successfully processed checkout session", {
        stripeCustomerId,
      });

      // Call the protected method that can be overridden by subclasses
      try {
        await this.onCheckoutSessionCompleted(
          session,
          clientId,
          userId,
          stripeCustomerId,
        );
      } catch (handlerError) {
        logger.error("Error in checkout session completed handler", {
          stripeCustomerId,
          error:
            handlerError instanceof Error
              ? handlerError.message
              : String(handlerError),
        });
        // Don't rethrow - we don't want handler errors to break the main flow
      }
    } catch (error) {
      logger.error("Error processing checkout session", {
        stripeCustomerId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async previewPlanChange(
    userId: string,
    clientId: string,
    priceId: string,
  ): Promise<PlanChangePreviewView> {
    return previewPlanChange(
      this.planChangeDeps(clientId),
      userId,
      clientId,
      priceId,
    );
  }

  /** What preview and apply need to price and change a plan for a client. */
  private planChangeDeps(clientId: string) {
    if (!SUBSCRIPTION_CONFIG[clientId]) {
      throw new ValidationError("clientId", "Unknown client");
    }
    return {
      stripe: this.getStripeInstance(clientId),
      models: this.models,
      db: this.postgresDb,
    };
  }

  defaultCard(
    clientId: string,
    subscription: Stripe.Subscription,
  ): Promise<PaymentMethodSummaryView | null> {
    return defaultCard(this.getStripeInstance(clientId), subscription);
  }

  changePlan(
    userId: string,
    clientId: string,
    priceId: string,
    prorationDate?: number | null,
  ): Promise<PlanChangeResultView> {
    return applyPlanChange(
      this.planChangeDeps(clientId),
      userId,
      clientId,
      priceId,
      { prorationDate },
    );
  }

  async lastVerifiedTier(userId: string): Promise<SubscriptionTier | null> {
    const bindings = await this.models.paidCustomer.findByUserId(
      this.postgresDb,
      userId,
    );
    const tiers = bindings.flatMap((binding) =>
      holdsVerifiedPeriod(binding) &&
      binding.periodTier &&
      Object.values(SubscriptionTier).includes(
        binding.periodTier as SubscriptionTier,
      )
        ? [binding.periodTier as SubscriptionTier]
        : [],
    );
    return tiers.length ? highestTier(tiers) : null;
  }

  async grantedStoreTiers(userId: string): Promise<SubscriptionTier[]> {
    const subscriptions = await this.models.storeSubscription.findByUserId(
      this.postgresDb,
      userId,
    );
    const now = new Date();
    return subscriptions.flatMap((row) => grantedTier(row, now) ?? []);
  }

  async cancelScheduledPlanChange(
    userId: string,
    clientId: string,
  ): Promise<{ success: boolean; message?: string }> {
    const deps = this.planChangeDeps(clientId);
    try {
      return await cancelScheduledChange(deps, userId, clientId);
    } catch (error) {
      logger.error("Error cancelling a scheduled plan change", {
        userId,
        clientId,
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        message:
          "An error occurred while cancelling your scheduled plan change. Please try again or contact support.",
      };
    }
  }

  /**
   * The original immediate-change mutation, kept for existing callers. It
   * applies changes through the same path as `changePlan`, but immediate-only:
   * a downgrade or a switch to monthly is refused here, neither applied at
   * once nor scheduled.
   */
  async upgradeSubscription(
    userId: string,
    clientId: string,
    newPriceId: string,
  ): Promise<{
    success: boolean;
    message?: string;
    clientSecret?: string;
    subscriptionId?: string;
    newTier?: string;
  }> {
    const clientConfig = SUBSCRIPTION_CONFIG[clientId];
    if (!clientConfig) {
      return { success: false, message: `Invalid client ID: ${clientId}` };
    }
    if (!clientConfig.planIds.includes(newPriceId)) {
      return {
        success: false,
        message: `Invalid price ID for client ${clientId}: ${newPriceId}`,
      };
    }
    try {
      const outcome = await applyPlanChange(
        this.planChangeDeps(clientId),
        userId,
        clientId,
        newPriceId,
        { immediateOnly: true },
      );
      if (outcome.status === "ACTIVE") {
        logger.debug("Subscription upgraded successfully", {
          userId,
          clientId,
          subscriptionId: outcome.subscriptionId,
          newTier: outcome.newTier,
        });
        return {
          success: true,
          message: "Subscription upgraded successfully.",
          subscriptionId: outcome.subscriptionId ?? undefined,
          newTier: outcome.newTier ?? undefined,
        };
      }
      return {
        success: false,
        message: outcome.message ?? undefined,
        clientSecret: outcome.clientSecret ?? undefined,
        subscriptionId: outcome.subscriptionId ?? undefined,
        newTier: outcome.newTier ?? undefined,
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        // A retired or unknown price: the caller's input, not a fault.
        return { success: false, message: error.message };
      }
      if (isNoSuchSubscriptionError(error)) {
        return {
          success: false,
          message: "Subscription not found",
        };
      }

      logger.error("Error upgrading subscription", {
        userId,
        clientId,
        newPriceId,
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        message:
          "An error occurred while upgrading your subscription. Please try again or contact support.",
      };
    }
  }

  /**
   * Verifies the caller owns `subscriptionId` before it's mutated: the
   * subscription must exist in Stripe, and a `paidCustomer` row with a
   * `stripeCustomerId` must exist for this `userId` + `clientId` (tenant
   * isolation). Shared by `cancelSubscription` and `deleteSubscription`.
   */
  private async verifySubscriptionOwnership(
    stripe: Stripe,
    subscriptionId: string,
    userId: string,
    clientId: string,
  ): Promise<
    | { authorized: true; subscription: Stripe.Subscription }
    | { authorized: false; message: string }
  > {
    // Retrieve the subscription to verify it exists
    // The schedule comes inline, so releasing a pending change needs no read.
    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["schedule"],
    });

    // Verify that this subscription belongs to a customer in our database
    // with the correct user ID and client ID (tenant isolation)
    const customer = await this.models.paidCustomer.findByUserIdAndClientId(
      this.postgresDb,
      userId,
      clientId,
    );

    if (
      !customer?.stripeCustomerId ||
      customerId(subscription.customer) !== customer.stripeCustomerId ||
      !subscription.livemode
    ) {
      logger.warn("Attempt to cancel subscription by unauthorized user", {
        subscriptionId,
        userId,
        clientId,
      });
      return {
        authorized: false,
        message: "You are not authorized to cancel this subscription",
      };
    }

    return { authorized: true, subscription };
  }

  /**
   * Cancels at period end (`cancel_at_period_end: true`), so the user keeps
   * access until the current billing period expires, matching the returned
   * message. Used by the self-service `cancelSubscription` GraphQL mutation.
   */
  async cancelSubscription(
    subscriptionId: string,
    userId: string,
    clientId: string,
    reason?: CancellationReason | null,
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const stripe = this.getStripeInstance(clientId);

      const ownership = await this.verifySubscriptionOwnership(
        stripe,
        subscriptionId,
        userId,
        clientId,
      );
      if (!ownership.authorized) {
        return { success: false, message: ownership.message };
      }

      // Stripe refuses a cancellation while a schedule holds a pending plan
      // change; cancelling releases that change (PRFAQ005 question 14).
      await releaseSchedule(stripe, ownership.subscription);
      await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
        // The reader's optional reason, kept where Stripe reports churn. No
        // reason clears one left by an earlier cancellation.
        cancellation_details: {
          feedback: reason ? CANCELLATION_FEEDBACK[reason] : "",
        },
      });

      logger.debug("Subscription scheduled for cancellation at period end", {
        subscriptionId,
        userId,
        clientId,
      });

      return {
        success: true,
        message:
          "Subscription canceled successfully. You will have access until the end of the current billing period.",
      };
    } catch (error) {
      if (isNoSuchSubscriptionError(error)) {
        return {
          success: false,
          message: "Subscription not found",
        };
      }

      logger.error("Error canceling subscription", {
        subscriptionId,
        userId,
        clientId,
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        message:
          "An error occurred while canceling your subscription. Please try again or contact support.",
      };
    }
  }

  /**
   * Immediately (hard) cancels the subscription in Stripe. Used when the
   * account itself is being deleted, so there's no reason to keep access
   * until period end (unlike self-service `cancelSubscription`).
   */
  async deleteSubscription(
    subscriptionId: string,
    userId: string,
    clientId: string,
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const stripe = this.getStripeInstance(clientId);

      const ownership = await this.verifySubscriptionOwnership(
        stripe,
        subscriptionId,
        userId,
        clientId,
      );
      if (!ownership.authorized) {
        return { success: false, message: ownership.message };
      }

      await releaseSchedule(stripe, ownership.subscription);
      await stripe.subscriptions.cancel(subscriptionId);

      logger.debug("Subscription deleted immediately", {
        subscriptionId,
        userId,
        clientId,
      });

      return {
        success: true,
        message: "Subscription deleted successfully.",
      };
    } catch (error) {
      if (isNoSuchSubscriptionError(error)) {
        return {
          success: false,
          message: "Subscription not found",
        };
      }

      logger.error("Error deleting subscription", {
        subscriptionId,
        userId,
        clientId,
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        message:
          "An error occurred while deleting your subscription. Please try again or contact support.",
      };
    }
  }

  /**
   * Undoes a pending `cancel_at_period_end` cancellation, so the
   * subscription keeps renewing. Only meaningful for subscriptions
   * scheduled to cancel (via `cancelSubscription`) that haven't reached
   * their period end yet.
   */
  async resumeSubscription(
    subscriptionId: string,
    userId: string,
    clientId: string,
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const stripe = this.getStripeInstance(clientId);

      const ownership = await this.verifySubscriptionOwnership(
        stripe,
        subscriptionId,
        userId,
        clientId,
      );
      if (!ownership.authorized) {
        return { success: false, message: ownership.message };
      }

      await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false,
        // A resumed subscription carries no cancellation reason.
        cancellation_details: { feedback: "" },
      });

      logger.debug("Subscription resumed", {
        subscriptionId,
        userId,
        clientId,
      });

      return {
        success: true,
        message: "Subscription resumed successfully.",
      };
    } catch (error) {
      if (isNoSuchSubscriptionError(error)) {
        return {
          success: false,
          message: "Subscription not found",
        };
      }

      logger.error("Error resuming subscription", {
        subscriptionId,
        userId,
        clientId,
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        message:
          "An error occurred while resuming your subscription. Please try again or contact support.",
      };
    }
  }

  async listSubscriptions(
    userId: string,
    options: SubscriptionListOptions = {},
  ): Promise<(Stripe.Subscription & { clientId: string })[]> {
    const allSubscriptions: (Stripe.Subscription & { clientId: string })[] = [];
    for (const clientId of Object.keys(SUBSCRIPTION_CONFIG)) {
      const binding = options.bindings
        ? options.bindings.find(
            (row) => row.userId === userId && row.clientId === clientId,
          )
        : await this.models.paidCustomer.findByUserIdAndClientId(
            this.postgresDb,
            userId,
            clientId,
          );
      if (!binding?.stripeCustomerId) continue;
      const stripe = this.getStripeInstance(clientId);
      let startingAfter: string | undefined;
      do {
        // Include canceled history and paginate: an active plan may be beyond page one.
        // Provider failures propagate; an outage is not evidence of no subscription.
        const page = await stripe.subscriptions.list({
          customer: binding.stripeCustomerId,
          ...(options.status === "current"
            ? {}
            : { status: options.status ?? "all" }),
          limit: 100,
          starting_after: startingAfter,
          // A past-due subscription's grace is read from its latest invoice,
          // so every tier lookup needs it. Billing status also says what the
          // next renewal charges, which takes the discounts (w1/183).
          ...(options.expandForStatus
            ? {
                expand: [
                  "data.schedule",
                  "data.latest_invoice",
                  "data.discounts.source.coupon",
                ],
              }
            : options.status === "current"
              ? { expand: ["data.latest_invoice"] }
              : {}),
        });
        for (const subscription of page.data) {
          if (
            !subscription.livemode ||
            customerId(subscription.customer) !== binding.stripeCustomerId
          ) {
            throw new Error(
              "Stripe subscription does not match its live customer binding",
            );
          }
          allSubscriptions.push({ ...subscription, clientId });
        }
        if (page.has_more && !page.data.length)
          throw new Error("Empty Stripe subscription page");
        startingAfter = page.has_more
          ? page.data[page.data.length - 1].id
          : undefined;
      } while (startingAfter);
    }
    return allSubscriptions;
  }

  async createCustomerPortalSession(
    userId: string,
    clientId: string,
  ): Promise<{
    success: boolean;
    message?: string;
    sessionId?: string;
    sessionUrl?: string;
  }> {
    try {
      const clientConfig =
        SUBSCRIPTION_CONFIG[clientId as keyof typeof SUBSCRIPTION_CONFIG];

      if (!clientConfig) {
        return {
          success: false,
          message: `Invalid client ID: ${clientId}`,
        };
      }

      const customer = await this.models.paidCustomer.findByUserIdAndClientId(
        this.postgresDb,
        userId,
        clientId,
      );

      if (!customer?.stripeCustomerId) {
        return {
          success: false,
          message:
            "We could not find an active Stripe customer for your account.",
        };
      }

      // The Checkout success URL is no fallback: it is a confirmation page
      // that expects a session id.
      const returnUrl = clientConfig.portalReturnUrl;
      if (!returnUrl) {
        logger.error("No portal return URL configured for client", {
          clientId,
        });
        return {
          success: false,
          message:
            "We were unable to open the billing portal. Please try again or contact support.",
        };
      }

      const stripe = this.getStripeInstance(clientId);

      const session = await stripe.billingPortal.sessions.create({
        customer: customer.stripeCustomerId,
        return_url: returnUrl,
        configuration: clientConfig.portalConfigurationId,
      });

      logger.debug("Created Stripe customer portal session", {
        userId,
        clientId,
        sessionId: session.id,
      });

      return {
        success: true,
        sessionId: session.id,
        sessionUrl: session.url ?? undefined,
      };
    } catch (error) {
      logger.error("Error creating Stripe customer portal session", {
        userId,
        clientId,
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        message:
          "We were unable to open the billing portal. Please try again or contact support.",
      };
    }
  }

  /**
   * Protected method that can be overridden by subclasses to handle checkout session completed events
   * This is called after the default processing is complete
   * @param session - The completed checkout session
   * @param clientId - The client ID associated with the session
   * @param userId - The user ID associated with the session
   * @param stripeCustomerId - The Stripe customer ID from the session
   */
  protected async onCheckoutSessionCompleted(
    _session: Stripe.Checkout.Session,
    _clientId: string,
    _userId: string,
    _stripeCustomerId: string,
  ): Promise<void> {
    // Default implementation does nothing
    // Subclasses can override this method to add custom behavior
  }

  /**
   * Protected method that can be overridden by subclasses to handle subscription cancellation events
   * This is called after the subscription is successfully cancelled
   * @param subscription - The cancelled subscription object
   * @param clientId - The client ID associated with the subscription
   * @param userId - The user ID associated with the subscription
   */
  protected async onSubscriptionCancelled(
    _subscription: Record<string, unknown>,
    _clientId: string,
    _userId: string,
  ): Promise<void> {
    // Default implementation does nothing
    // Subclasses can override this method to add custom behavior
  }

  async handleCustomerEvent(
    customer: Stripe.Customer,
    eventType: string,
    _previousAttributes: Record<string, unknown> = {},
    clientId: string,
    userId: string,
  ): Promise<void> {
    // Signed event routing is authoritative; customer metadata cannot switch tenants/users.
    if (
      !SUBSCRIPTION_CONFIG[clientId] ||
      !customer.livemode ||
      !userId ||
      userId === "unknown" ||
      (customer.metadata?.clientId &&
        customer.metadata.clientId !== clientId) ||
      (customer.metadata?.userId && customer.metadata.userId !== userId)
    ) {
      throw new Error("Invalid live customer ownership");
    }

    // Log the customer event
    logger.debug(`Processing customer ${eventType} event`, {
      userId,
      customerId: customer.id,
      clientId: clientId,
    });

    try {
      // Find the customer in our database
      const existingCustomer =
        await this.models.paidCustomer.findByStripeCustomerIdAndClientId(
          this.postgresDb,
          customer.id as string,
          clientId,
        );

      if (existingCustomer && existingCustomer.userId !== userId) {
        throw new Error("Stripe customer belongs to another user");
      }

      if (!existingCustomer) {
        logger.debug("Customer not found in database, creating new record", {
          customerId: customer.id,
        });

        // Create new customer record
        await this.models.paidCustomer.create(this.postgresDb, {
          //id: `pc_${Date.now()}${Math.random().toString(36).substring(2, 7)}`, // Generate a unique ID
          userId,
          stripeCustomerId: customer.id as string,
          clientId: clientId, // Ensure client ID is stored
          email: (customer.email as string) || undefined,
          // createdAt and updatedAt are automatically handled by Typegoose
        });
        logger.debug("Created new customer record", {
          customerId: customer.id,
        });
        return;
      }

      // If customer exists, update fields that might have changed
      let needsUpdate = false;
      const updates = {
        email: existingCustomer.email,
        clientId: existingCustomer.clientId,
        updatedAt: new Date(),
      };

      // Update email if it changed
      if (
        customer.email !== undefined &&
        existingCustomer.email !== customer.email
      ) {
        updates.email = (customer.email as string) || undefined;
        needsUpdate = true;
      }

      // Apply updates if there are any
      if (needsUpdate) {
        await this.models.paidCustomer.updateCustomerById(
          this.postgresDb,
          existingCustomer.id,
          updates,
        );
        logger.debug("Updated customer record", {
          customerId: customer.id,
        });
      } else {
        logger.debug("No updates needed for customer", {
          customerId: customer.id,
        });
      }
    } catch (error) {
      logger.error(`Error handling customer ${eventType} event`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error; // Rethrow to allow caller to handle
    }
  }
}
