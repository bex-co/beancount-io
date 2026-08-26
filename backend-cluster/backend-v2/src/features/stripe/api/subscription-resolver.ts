import {
  Arg,
  Ctx,
  Field,
  ID,
  Mutation,
  ObjectType,
  Query,
  Resolver,
  Authorized,
  Info,
} from "type-graphql";
import { GraphQLResolveInfo, Kind } from "graphql";
import {
  SUBSCRIPTION_CONFIG,
  TIER_LIMITS,
  SubscriptionTier,
} from "@/features/stripe/service/stripe";
import type { IContext } from "@/server/graphql/context";
import type { IStripeService } from "@/features/stripe/service/stripe-service";
import type { IModels } from "@/foundation/models";
import type { DbExecutor } from "@/drizzle/drizzle";
import type Stripe from "stripe";
import { logger } from "@/shared/logger";
import { config } from "@/config/config";
import { assertSessionIdentity } from "@/server/api/identity";

@ObjectType("SubscriptionPrice")
class SubscriptionPrice {
  @Field(() => ID)
  id!: string;

  @Field()
  amount!: number;

  @Field()
  currency!: string;

  @Field()
  interval!: string;

  @Field({ nullable: true })
  intervalCount?: number;

  @Field({ nullable: true })
  trialPeriodDays?: number;
}

@ObjectType("SubscriptionProduct")
class SubscriptionProduct {
  @Field(() => ID)
  id!: string;

  @Field()
  name!: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => [String], { nullable: true })
  images?: string[];
}

@ObjectType("SubscriptionItem")
class SubscriptionItem {
  @Field(() => ID)
  id!: string;

  @Field(() => SubscriptionPrice)
  price!: SubscriptionPrice;

  @Field(() => SubscriptionProduct, { nullable: true })
  product?: SubscriptionProduct;

  @Field()
  quantity!: number;
}

@ObjectType("Subscription")
class Subscription {
  @Field(() => ID)
  id!: string;

  @Field()
  status!: string;

  @Field()
  currentPeriodStart!: Date;

  @Field()
  currentPeriodEnd!: Date;

  @Field({ nullable: false })
  clientId!: string;

  @Field({ nullable: true })
  cancelAt?: Date;

  @Field({ nullable: true })
  canceledAt?: Date;

  @Field()
  cancelAtPeriodEnd!: boolean;

  @Field(() => [SubscriptionItem])
  items!: SubscriptionItem[];
}

@ObjectType("CustomerSubscriptionStatus")
class CustomerSubscriptionStatus {
  @Field()
  hasActiveSubscription!: boolean;

  @Field(() => [Subscription])
  subscriptions!: Subscription[];
}

@ObjectType("SubscriptionActionResult")
class SubscriptionActionResult {
  @Field()
  success!: boolean;

  @Field({ nullable: true })
  message?: string;
}

@ObjectType("UpgradeSubscriptionResult")
class UpgradeSubscriptionResult {
  @Field()
  success!: boolean;

  @Field({ nullable: true })
  message?: string;

  @Field({ nullable: true })
  clientSecret?: string;

  @Field({ nullable: true })
  subscriptionId?: string;

  @Field({ nullable: true })
  newTier?: string;
}

@ObjectType("SubscriptionSessionResult")
class SubscriptionSessionResult {
  @Field()
  success!: boolean;

  @Field({ nullable: true })
  message?: string;

  @Field({ nullable: true })
  sessionId?: string;

  @Field({ nullable: true })
  sessionUrl?: string;
}

@ObjectType("TierQuotaItem")
class TierQuotaItem {
  @Field(() => String)
  tier!: string;

  @Field(() => Number)
  aiCfoTokensMax!: number;

  @Field(() => Number)
  maxLedgers!: number;

  @Field(() => Number)
  maxCollaboratorsPerLedger!: number;

  @Field(() => Number)
  maxDirectives!: number;
}

function isOnlyHasActiveSubscriptionRequested(
  info: GraphQLResolveInfo,
): boolean {
  // Get the selection nodes from the GraphQL info object
  const selections = info.fieldNodes[0]?.selectionSet?.selections || [];

  // If there's only one selection and it's hasActiveSubscription, return true
  if (selections.length === 1) {
    const selection = selections[0];
    if (
      selection.kind === Kind.FIELD &&
      selection.name.value === "hasActiveSubscription"
    ) {
      return true;
    }
  }

  return false;
}

function sessionUserId(context: IContext): string {
  const identity = context.getCurrentIdentity();
  assertSessionIdentity(identity, "Managing billing");
  return identity.userId;
}

@Resolver()
export class SubscriptionResolver {
  constructor(
    private readonly stripe: IStripeService,
    private readonly models: Pick<IModels, "paidCustomer" | "user">,
    private readonly db: DbExecutor,
  ) {}

  @Query(() => [TierQuotaItem], {
    description: "Returns quota limits for all subscription tiers",
  })
  allTierQuotas(): TierQuotaItem[] {
    return (Object.keys(TIER_LIMITS) as SubscriptionTier[]).map((tier) => ({
      tier,
      ...TIER_LIMITS[tier],
    }));
  }

  @Authorized()
  @Query(() => CustomerSubscriptionStatus)
  async subscriptionStatus(
    @Ctx() context: IContext,
    @Info() info: GraphQLResolveInfo,
  ): Promise<CustomerSubscriptionStatus> {
    const userId = sessionUserId(context);

    // Optimization: If only hasActiveSubscription is requested and we have a valid currentPeriodEnd, use that
    if (isOnlyHasActiveSubscriptionRequested(info)) {
      const paidCustomer =
        await this.models.paidCustomer.findByUserIdWithActivePeriod(
          this.db,
          userId,
        );

      // If we found a customer with a valid currentPeriodEnd, we can return early
      if (paidCustomer?.currentPeriodEnd) {
        logger.debug("Using cached subscription status", {
          userId,
          validUntil: paidCustomer.currentPeriodEnd,
        });
        return {
          hasActiveSubscription: true,
          subscriptions: [], // Empty array since we're only interested in hasActiveSubscription
        };
      }

      logger.debug(
        "No valid cached subscription status found, only hasActiveSubscription requested",
        { userId },
      );
    }

    // If optimization didn't work or we need full subscription details, fall back to original implementation
    logger.debug("Querying Stripe for subscription status", { userId });

    const stripeSubscriptions = await this.stripe.listSubscriptions(userId);

    // Filter subscriptions based on client-specific config
    const filteredSubscriptions = stripeSubscriptions.filter((sub) => {
      // Get the config for the subscription's client
      const clientConfig =
        SUBSCRIPTION_CONFIG[sub.clientId as keyof typeof SUBSCRIPTION_CONFIG];

      // If no config exists for this client, skip this subscription
      if (!clientConfig) {
        logger.warn(
          "No configuration found for client, skipping subscription",
          { clientId: sub.clientId, subscriptionId: sub.id },
        );
        return false;
      }

      // If no restrictions are set for this client, allow all subscriptions
      if (
        clientConfig.productIds.length === 0 &&
        clientConfig.planIds.length === 0
      ) {
        return true;
      }

      // Check if any subscription item matches the allowed products/plans for this specific client
      return sub.items.data.some((item) => {
        const { price } = item;
        const product = price.product;

        // If product IDs are specified, check if this product is allowed for this client
        if (
          clientConfig.productIds.length > 0 &&
          product &&
          typeof product === "object"
        ) {
          return clientConfig.productIds.includes(product.id as string);
        }

        // If plan IDs are specified, check if this price is allowed for this client
        if (clientConfig.planIds.length > 0) {
          return clientConfig.planIds.includes(price.id);
        }

        // If we get here, no specific filters matched but we have filters defined
        // So this item should be excluded
        return false;
      });
    });

    // Check if the user has an active subscription among the filtered subscriptions
    const hasActiveSubscription = filteredSubscriptions.some(
      (sub) => sub.status === "active",
    );

    // If we have active subscriptions, update the currentPeriodEnd in our database
    if (hasActiveSubscription) {
      try {
        // Find the active subscription with the latest end date
        const activeSubscriptions = filteredSubscriptions.filter(
          (sub) => sub.status === "active",
        );
        if (activeSubscriptions.length > 0) {
          // Sort by currentPeriodEnd descending to get the latest end date
          activeSubscriptions.sort((a, b) => {
            const aEnd = a.items.data[0]?.current_period_end || 0;
            const bEnd = b.items.data[0]?.current_period_end || 0;
            return bEnd - aEnd;
          });

          const latestSubscription = activeSubscriptions[0];
          const latestPeriodEnd =
            latestSubscription.items.data[0]?.current_period_end;
          if (latestPeriodEnd) {
            const currentPeriodEnd = new Date(latestPeriodEnd * 1000);
            // Find the customer in our database and update the currentPeriodEnd
            const customers = await this.models.paidCustomer.findByUserId(
              this.db,
              userId,
            );
            const paidCustomer = customers[0];
            if (paidCustomer) {
              if (
                !paidCustomer.currentPeriodEnd ||
                paidCustomer.currentPeriodEnd.getTime() !==
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
          }
        }
      } catch (error) {
        logger.error("Error updating currentPeriodEnd for user", {
          userId,
          error: error instanceof Error ? error.message : String(error),
        });
        // Continue with the response even if the update fails
      }
    }

    // Map filtered Stripe subscriptions to our GraphQL type
    // Use Promise.allSettled to handle individual subscription fetch failures gracefully
    const subscriptionsResults = await Promise.allSettled(
      filteredSubscriptions.map(async (sub) => {
        const itemsResults = await Promise.allSettled(
          sub.items.data.map(async (item) => {
            const { price } = item;
            const productDetails: Stripe.Product | Stripe.DeletedProduct =
              typeof price.product !== "string"
                ? price.product
                : await this.stripe
                    .getStripeInstance(sub.clientId)
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
                // Handle null values for trialPeriodDays
                trialPeriodDays:
                  price.recurring?.trial_period_days || undefined,
              },
              product: product
                ? {
                    id: product.id,
                    name: product?.name || "",
                    description: product?.description || "",
                    // Handle undefined images array
                    images: product?.images || [],
                  }
                : undefined,
            } as SubscriptionItem;
          }),
        );

        // Filter out rejected items and log errors
        const items = itemsResults
          .filter((result) => {
            if (result.status === "rejected") {
              logger.error("Failed to fetch subscription item details", {
                subscriptionId: sub.id,
                error: result.reason,
              });
              return false;
            }
            return true;
          })
          .map(
            (result) =>
              (result as PromiseFulfilledResult<SubscriptionItem>).value,
          );

        return {
          id: sub.id,
          status: sub.status,
          clientId: sub.clientId,
          currentPeriodStart: new Date(
            (sub.items.data[0]?.current_period_start || sub.start_date) * 1000,
          ),
          currentPeriodEnd: new Date(
            (sub.items.data[0]?.current_period_end || 0) * 1000,
          ),
          cancelAt: sub.cancel_at ? new Date(sub.cancel_at * 1000) : undefined,
          canceledAt: sub.canceled_at
            ? new Date(sub.canceled_at * 1000)
            : undefined,
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          items,
        };
      }),
    );

    // Filter out rejected subscriptions and log errors
    const subscriptions = subscriptionsResults
      .filter((result) => {
        if (result.status === "rejected") {
          logger.error("Failed to fetch subscription details", {
            error: result.reason,
          });
          return false;
        }
        return true;
      })
      .map((result) => (result as PromiseFulfilledResult<Subscription>).value);

    return {
      hasActiveSubscription,
      subscriptions,
    };
  }

  @Authorized()
  @Mutation(() => SubscriptionSessionResult)
  async createSubscriptionSession(
    @Arg("clientId") clientId: string,
    @Arg("priceId") priceId: string,
    @Ctx() context: IContext,
  ): Promise<SubscriptionSessionResult> {
    const userId = sessionUserId(context);

    const user = await this.models.user.getById(this.db, userId);
    const userEmail = user?.email;

    try {
      // Check if the client ID is valid
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

      // Check if the price ID is valid for this client
      if (!clientConfig.planIds.includes(priceId)) {
        return {
          success: false,
          message: `Invalid price ID for client ${clientId}: ${priceId}`,
        };
      }

      const stripe = this.stripe.getStripeInstance(clientId);

      const existingCustomer =
        await this.models.paidCustomer.findByUserIdAndClientId(
          this.db,
          userId,
          clientId,
        );

      // Find the plan configuration for this price ID
      const planConfig = clientConfig.plans.find(
        (plan) => plan.priceId === priceId,
      );
      if (!planConfig) {
        return {
          success: false,
          message: `Plan configuration not found for price ID: ${priceId}`,
        };
      }

      // Use the payment type from the plan configuration
      const mode = planConfig.type;

      // Create checkout session with appropriate customer handling
      let session;
      if (existingCustomer?.stripeCustomerId) {
        // Use existing customer if available
        // Note: When using 'customer', we cannot also specify 'customer_email'
        session = await stripe.checkout.sessions.create({
          customer: existingCustomer.stripeCustomerId,
          line_items: [
            {
              price: priceId,
              quantity: 1,
            },
          ],
          mode,
          success_url: clientConfig.successUrl,
          cancel_url: clientConfig.cancelUrl,
          metadata: {
            userId,
            clientId,
          },
        });
      } else {
        // Let Stripe create a new customer with our metadata
        session = await stripe.checkout.sessions.create({
          line_items: [
            {
              price: priceId,
              quantity: 1,
            },
          ],
          mode,
          success_url: clientConfig.successUrl,
          cancel_url: clientConfig.cancelUrl,
          metadata: {
            userId,
            clientId,
          },
          // Prefill the email field with the user's email
          customer_email: userEmail,
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

  @Authorized()
  @Mutation(() => SubscriptionSessionResult)
  async createStripePortalSession(
    @Arg("clientId") clientId: string,
    @Ctx() context: IContext,
  ): Promise<SubscriptionSessionResult> {
    const userId = sessionUserId(context);

    const result = await this.stripe.createCustomerPortalSession(
      userId,
      clientId,
    );

    return {
      success: result.success,
      message: result.message,
      sessionId: result.sessionId,
      sessionUrl: result.sessionUrl,
    };
  }

  @Authorized()
  @Mutation(() => SubscriptionActionResult)
  async cancelSubscription(
    @Arg("subscriptionId") subscriptionId: string,
    @Arg("clientId") clientId: string,
    @Ctx() context: IContext,
  ): Promise<SubscriptionActionResult> {
    const userId = sessionUserId(context);

    const result = await this.stripe.cancelSubscription(
      subscriptionId,
      userId,
      clientId,
    );

    return {
      success: result.success,
      message: result.message,
    };
  }

  @Authorized()
  @Mutation(() => SubscriptionActionResult)
  async resumeSubscription(
    @Arg("subscriptionId") subscriptionId: string,
    @Arg("clientId") clientId: string,
    @Ctx() context: IContext,
  ): Promise<SubscriptionActionResult> {
    const userId = sessionUserId(context);

    const result = await this.stripe.resumeSubscription(
      subscriptionId,
      userId,
      clientId,
    );

    return {
      success: result.success,
      message: result.message,
    };
  }

  @Authorized()
  @Mutation(() => UpgradeSubscriptionResult)
  async upgradeSubscription(
    @Arg("clientId") clientId: string,
    @Arg("priceId") priceId: string,
    @Ctx() context: IContext,
  ): Promise<UpgradeSubscriptionResult> {
    const userId = sessionUserId(context);

    return this.stripe.upgradeSubscription(userId, clientId, priceId);
  }
}
