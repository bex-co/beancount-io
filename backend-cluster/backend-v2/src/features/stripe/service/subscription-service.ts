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
import { config } from "@/config/config";
import { logger } from "@/shared/logger";
import { SUBSCRIPTION_CONFIG, TIER_LIMITS, SubscriptionTier } from "./stripe";
import type { IStripeService } from "./stripe-service";

export interface SubscriptionPriceView {
  id: string;
  amount: number;
  currency: string;
  interval: string;
  intervalCount?: number;
  trialPeriodDays?: number;
}

export interface SubscriptionProductView {
  id: string;
  name: string;
  description?: string;
  images?: string[];
}

export interface SubscriptionItemView {
  id: string;
  price: SubscriptionPriceView;
  product?: SubscriptionProductView;
  quantity: number;
}

export interface SubscriptionView {
  id: string;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  clientId: string;
  cancelAt?: Date;
  canceledAt?: Date;
  cancelAtPeriodEnd: boolean;
  items: SubscriptionItemView[];
}

export interface CustomerSubscriptionStatusView {
  hasActiveSubscription: boolean;
  subscriptions: SubscriptionView[];
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

export interface ISubscriptionService {
  allTierQuotas(): Promise<TierQuotaView[]>;
  subscriptionStatus(
    identity: Identity,
    onlyActiveStatus: boolean,
  ): Promise<CustomerSubscriptionStatusView>;
  createSubscriptionSession(
    identity: Identity,
    clientId: string,
    priceId: string,
  ): Promise<SubscriptionSessionResultView>;
  createStripePortalSession(
    identity: Identity,
    clientId: string,
  ): Promise<SubscriptionSessionResultView>;
  cancelSubscription(
    identity: Identity,
    subscriptionId: string,
    clientId: string,
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
}

/**
 * The application boundary for self-service billing.
 *
 * Protected methods make one final PDP decision before reading local billing
 * state or reaching Stripe. The static tier-quota catalog is deliberately
 * public. Stripe customer ownership, product allowlists, and subscription-state
 * validation remain payment-domain invariants downstream.
 */
export class SubscriptionService implements ISubscriptionService {
  constructor(
    private readonly stripe: IStripeService,
    private readonly models: Pick<IModels, "paidCustomer" | "user">,
    private readonly db: DbExecutor,
    private readonly authorization: IAuthorizationService,
  ) {}

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

  public async allTierQuotas(): Promise<TierQuotaView[]> {
    return (Object.keys(TIER_LIMITS) as SubscriptionTier[]).map((tier) => ({
      tier,
      ...TIER_LIMITS[tier],
    }));
  }

  public async subscriptionStatus(
    identity: Identity,
    onlyActiveStatus: boolean,
  ): Promise<CustomerSubscriptionStatusView> {
    await this.authorize(
      identity,
      AUTHORIZATION_ACTIONS.USER_BILLING_STATUS_READ,
    );
    const { userId } = identity;

    if (onlyActiveStatus) {
      const paidCustomer =
        await this.models.paidCustomer.findByUserIdWithActivePeriod(
          this.db,
          userId,
        );

      if (paidCustomer?.currentPeriodEnd) {
        logger.debug("Using cached subscription status", {
          userId,
          validUntil: paidCustomer.currentPeriodEnd,
        });
        return { hasActiveSubscription: true, subscriptions: [] };
      }

      logger.debug(
        "No valid cached subscription status found, only hasActiveSubscription requested",
        { userId },
      );
    }

    logger.debug("Querying Stripe for subscription status", { userId });
    const stripeSubscriptions = await this.stripe.listSubscriptions(userId);

    const filteredSubscriptions = stripeSubscriptions.filter((subscription) => {
      const clientConfig =
        SUBSCRIPTION_CONFIG[
          subscription.clientId as keyof typeof SUBSCRIPTION_CONFIG
        ];

      if (!clientConfig) {
        logger.warn(
          "No configuration found for client, skipping subscription",
          {
            clientId: subscription.clientId,
            subscriptionId: subscription.id,
          },
        );
        return false;
      }

      if (
        clientConfig.productIds.length === 0 &&
        clientConfig.planIds.length === 0
      ) {
        return true;
      }

      return subscription.items.data.some((item) => {
        const { price } = item;
        const product = price.product;
        if (
          clientConfig.productIds.length > 0 &&
          product &&
          typeof product === "object"
        ) {
          return clientConfig.productIds.includes(product.id);
        }
        if (clientConfig.planIds.length > 0) {
          return clientConfig.planIds.includes(price.id);
        }
        return false;
      });
    });

    const hasActiveSubscription = filteredSubscriptions.some(
      (subscription) => subscription.status === "active",
    );

    if (hasActiveSubscription) {
      try {
        const activeSubscriptions = filteredSubscriptions
          .filter((subscription) => subscription.status === "active")
          .sort((left, right) => {
            const leftEnd = left.items.data[0]?.current_period_end ?? 0;
            const rightEnd = right.items.data[0]?.current_period_end ?? 0;
            return rightEnd - leftEnd;
          });
        const latestPeriodEnd =
          activeSubscriptions[0]?.items.data[0]?.current_period_end;
        if (latestPeriodEnd) {
          const currentPeriodEnd = new Date(latestPeriodEnd * 1000);
          const customers = await this.models.paidCustomer.findByUserId(
            this.db,
            userId,
          );
          const paidCustomer = customers[0];
          if (
            paidCustomer &&
            paidCustomer.currentPeriodEnd?.getTime() !==
              currentPeriodEnd.getTime()
          ) {
            await this.models.paidCustomer.updateCustomerById(
              this.db,
              paidCustomer.id,
              { currentPeriodEnd },
            );
            logger.debug("Updated currentPeriodEnd for user", {
              userId,
              currentPeriodEnd,
            });
          }
        }
      } catch (error) {
        logger.error("Error updating currentPeriodEnd for user", {
          userId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const subscriptionsResults = await Promise.allSettled(
      filteredSubscriptions.map(async (subscription) => {
        const itemsResults = await Promise.allSettled(
          subscription.items.data.map(async (item) => {
            const { price } = item;
            const productDetails: Stripe.Product | Stripe.DeletedProduct =
              typeof price.product !== "string"
                ? price.product
                : await this.stripe
                    .getStripeInstance(subscription.clientId)
                    .products.retrieve(price.product);
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

    return { hasActiveSubscription, subscriptions };
  }

  public async createSubscriptionSession(
    identity: Identity,
    clientId: string,
    priceId: string,
  ): Promise<SubscriptionSessionResultView> {
    await this.authorize(
      identity,
      AUTHORIZATION_ACTIONS.USER_BILLING_CHECKOUT_CREATE,
    );
    const { userId } = identity;

    try {
      const clientConfig =
        SUBSCRIPTION_CONFIG[clientId as keyof typeof SUBSCRIPTION_CONFIG];
      if (
        !clientConfig ||
        (clientConfig.isDevOnly && config.env === "production")
      ) {
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

      const stripe = this.stripe.getStripeInstance(clientId);
      const existingCustomer =
        await this.models.paidCustomer.findByUserIdAndClientId(
          this.db,
          userId,
          clientId,
        );
      const sharedSession = {
        line_items: [{ price: priceId, quantity: 1 }],
        mode: planConfig.type,
        success_url: clientConfig.successUrl,
        cancel_url: clientConfig.cancelUrl,
        metadata: { userId, clientId },
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
  ): Promise<SubscriptionActionResultView> {
    await this.authorize(
      identity,
      AUTHORIZATION_ACTIONS.USER_BILLING_SUBSCRIPTION_CANCEL,
    );
    return this.stripe.cancelSubscription(
      subscriptionId,
      identity.userId,
      clientId,
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
    return this.stripe.upgradeSubscription(identity.userId, clientId, priceId);
  }
}
