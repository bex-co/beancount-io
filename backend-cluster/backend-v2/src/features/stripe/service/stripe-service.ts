import Stripe from "stripe";
import { SUBSCRIPTION_CONFIG } from "@/features/stripe/service/stripe";
import { IModels } from "@/foundation/models";
import { logger } from "@/shared/logger";
import { config } from "@/config/config";
import { NodePgDatabase } from "drizzle-orm/node-postgres";

function isNoSuchSubscriptionError(error: unknown): boolean {
  return (
    (error as { name?: string }).name === "StripeInvalidRequestError" &&
    (error as { message?: string }).message?.includes(
      "No such subscription",
    ) === true
  );
}

export interface IStripeService {
  getStripeInstance(clientId: string): Stripe;
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

  private models: Pick<IModels, "paidCustomer">;

  private postgresDb: NodePgDatabase;

  constructor(
    models: Pick<IModels, "paidCustomer">,
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

    // If no config exists for this client, fall back to environment variables
    if (!clientConfig || !clientConfig.stripePriKey) {
      logger.warn(
        "No Stripe configuration found for client, using default config",
        { clientId },
      );
      // Fall back to default config
      const fallbackKey = config.stripe.privateKey;
      if (!fallbackKey) {
        throw new Error(
          `No Stripe API key found for client ${clientId} and no fallback configuration available`,
        );
      }

      this.stripeInstances[clientId] = new Stripe(fallbackKey, {
        apiVersion: "2025-12-15.clover",
      });
      return this.stripeInstances[clientId];
    }

    // Create a new Stripe instance with the client's API key
    this.stripeInstances[clientId] = new Stripe(
      clientConfig.stripePriKey || "",
      {
        apiVersion: "2025-12-15.clover",
      },
    );

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
    try {
      // Validate clientId
      const clientConfig =
        SUBSCRIPTION_CONFIG[clientId as keyof typeof SUBSCRIPTION_CONFIG];
      if (!clientConfig) {
        return {
          success: false,
          message: `Invalid client ID: ${clientId}`,
        };
      }

      if (clientConfig.isDevOnly && config.env === "production") {
        return {
          success: false,
          message: `Invalid client ID: ${clientId}`,
        };
      }

      // Validate newPriceId exists in client's plans
      if (!clientConfig.planIds.includes(newPriceId)) {
        return {
          success: false,
          message: `Invalid price ID for client ${clientId}: ${newPriceId}`,
        };
      }

      // Look up target tier from plan config
      const targetPlan = clientConfig.plans.find(
        (plan) => plan.priceId === newPriceId,
      );
      const newTier = targetPlan?.tier;

      // Look up PaidCustomer
      const customer = await this.models.paidCustomer.findByUserIdAndClientId(
        this.postgresDb,
        userId,
        clientId,
      );

      if (!customer?.stripeCustomerId) {
        return {
          success: false,
          message:
            "No active Stripe customer found. Please create a new subscription instead.",
        };
      }

      const stripe = this.getStripeInstance(clientId);

      // List active subscriptions
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.stripeCustomerId,
        status: "active",
      });

      if (subscriptions.data.length === 0) {
        return {
          success: false,
          message:
            "No active subscription found. Please create a new subscription instead.",
        };
      }

      const subscription = subscriptions.data[0];
      const currentItem = subscription.items.data[0];

      // Same-plan guard
      if (currentItem.price.id === newPriceId) {
        return {
          success: false,
          message: "You are already on this plan.",
        };
      }

      // Update subscription in place
      const updatedSubscription = await stripe.subscriptions.update(
        subscription.id,
        {
          items: [{ id: currentItem.id, price: newPriceId }],
          payment_behavior: "pending_if_incomplete",
          proration_behavior: "always_invoice",
        },
      );

      // Handle response based on status
      if (updatedSubscription.status === "active") {
        // Success — update currentPeriodEnd in DB
        const periodEnd = updatedSubscription.items.data[0]?.current_period_end;
        if (periodEnd) {
          await this.models.paidCustomer.updateCustomerById(
            this.postgresDb,
            customer.id,
            { currentPeriodEnd: new Date(periodEnd * 1000) },
          );
        }

        logger.debug("Subscription upgraded successfully", {
          userId,
          clientId,
          subscriptionId: updatedSubscription.id,
          newTier,
        });

        return {
          success: true,
          message: "Subscription upgraded successfully.",
          subscriptionId: updatedSubscription.id,
          newTier,
        };
      }

      // Check for 3DS / requires_action
      const latestInvoice = updatedSubscription.latest_invoice;
      if (latestInvoice && typeof latestInvoice === "object") {
        const paymentIntent = (latestInvoice as { payment_intent?: unknown })
          .payment_intent;
        if (paymentIntent && typeof paymentIntent === "object") {
          const pi = paymentIntent as {
            status?: string;
            client_secret?: string;
          };
          if (pi.status === "requires_action" && pi.client_secret) {
            return {
              success: false,
              message:
                "Your payment requires additional authentication. Please check your email or card issuer.",
              clientSecret: pi.client_secret,
              subscriptionId: updatedSubscription.id,
              newTier,
            };
          }
        }
      }

      // Payment failed or subscription incomplete
      return {
        success: false,
        message:
          "Payment failed. Your subscription was not changed. Please update your payment method and try again.",
      };
    } catch (error) {
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
  ): Promise<{ authorized: true } | { authorized: false; message: string }> {
    // Retrieve the subscription to verify it exists
    await stripe.subscriptions.retrieve(subscriptionId);

    // Verify that this subscription belongs to a customer in our database
    // with the correct user ID and client ID (tenant isolation)
    const customer = await this.models.paidCustomer.findByUserIdAndClientId(
      this.postgresDb,
      userId,
      clientId,
    );

    if (!customer?.stripeCustomerId) {
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

    return { authorized: true };
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
        cancel_at_period_end: true,
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
  ): Promise<(Stripe.Subscription & { clientId: string })[]> {
    try {
      // Get all client IDs from the SUBSCRIPTION_CONFIG
      const clientIds = Object.keys(SUBSCRIPTION_CONFIG);
      let allSubscriptions: (Stripe.Subscription & {
        clientId: string;
      })[] = [];

      // Fetch subscriptions from all clients
      for (const clientId of clientIds) {
        try {
          // Check if we have a customer record for this user and client
          const customer =
            await this.models.paidCustomer.findByUserIdAndClientId(
              this.postgresDb,
              userId,
              clientId,
            );

          if (!customer?.stripeCustomerId) {
            logger.debug("No Stripe customer found for user and client", {
              userId,
              clientId,
            });
            continue; // Skip to next client
          }

          // Get the Stripe instance for this client
          const stripe = this.getStripeInstance(clientId);

          // Get all subscriptions for this customer
          const subscriptions = await stripe.subscriptions.list({
            customer: customer.stripeCustomerId,
            expand: ["data.default_payment_method"],
          });

          logger.debug("Retrieved subscriptions for user and client", {
            userId,
            clientId,
            count: subscriptions.data.length,
          });

          // Add these subscriptions to our collection
          allSubscriptions = [
            ...allSubscriptions,
            ...subscriptions.data.map((it: Stripe.Subscription) => ({
              ...it,
              clientId,
            })),
          ];
        } catch (error) {
          logger.error("Error listing subscriptions for user and client", {
            userId,
            clientId,
            error: error instanceof Error ? error.message : String(error),
          });
          // Continue with other clients even if one fails
        }
      }

      return allSubscriptions;
    } catch (error) {
      logger.error("Error listing all subscriptions for user", {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return []; // Return empty array on error
    }
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

      // Validate that we have a valid return URL
      const returnUrl = clientConfig.portalReturnUrl || clientConfig.successUrl;
      if (!returnUrl) {
        logger.error(
          "No valid return URL configured for client. Both portalReturnUrl and successUrl are empty.",
          { clientId },
        );
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
    previousAttributes: Record<string, unknown> = {},
    clientId: string,
    userId: string,
  ): Promise<void> {
    // Extract metadata from the customer
    const metadata = customer.metadata;
    // Use clientId from metadata if available, otherwise use the provided clientId
    const effectiveClientId = (metadata?.clientId as string) || clientId;

    if (!effectiveClientId) {
      throw new Error("No client ID available for customer");
    }

    // Log the customer event
    logger.debug(`Processing customer ${eventType} event`, {
      userId,
      customerId: customer.id,
      clientId: effectiveClientId,
    });

    try {
      // Log the previous attributes for debugging purposes (for updates)
      if (
        eventType === "updated" &&
        Object.keys(previousAttributes).length > 0
      ) {
        logger.debug("Customer update - previous attributes", {
          customerId: customer.id,
          previousAttributes,
        });
      }

      // Find the customer in our database
      const existingCustomer =
        await this.models.paidCustomer.findByStripeCustomerIdAndClientId(
          this.postgresDb,
          customer.id as string,
          effectiveClientId,
        );

      if (!existingCustomer) {
        logger.debug("Customer not found in database, creating new record", {
          customerId: customer.id,
        });

        // Create new customer record
        await this.models.paidCustomer.create(this.postgresDb, {
          //id: `pc_${Date.now()}${Math.random().toString(36).substring(2, 7)}`, // Generate a unique ID
          userId,
          stripeCustomerId: customer.id as string,
          clientId: effectiveClientId, // Ensure client ID is stored
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

      // Ensure client ID is set
      if (existingCustomer.clientId !== effectiveClientId) {
        updates.clientId = effectiveClientId;
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
          updates,
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
